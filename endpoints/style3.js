const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to calculate text layout matching the reference image
function calculateTextLayout(quote, author) {
  const topPadding = 100;
  const sidePadding = 80;
  const bottomPadding = 80;
  const maxWidth = 1080 - (sidePadding * 2);
  const fontSize = 44;
  const authorFontSize = 32;
  const lineHeight = fontSize * 1.4;
  const authorLineHeight = authorFontSize * 1.4;
  
  // Word wrapping for better readability
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
  const words = quote.split(' ');
  let lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (testLine.length <= charsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  const quoteHeight = lines.length * lineHeight;
  const authorHeight = author ? authorLineHeight : 0;
  const spaceBetween = author ? 40 : 0;
  const totalTextHeight = topPadding + quoteHeight + spaceBetween + authorHeight + bottomPadding;
  
  return {
    fontSize,
    authorFontSize,
    lineHeight,
    authorLineHeight,
    lines,
    topPadding,
    sidePadding,
    bottomPadding,
    quoteHeight,
    authorHeight,
    spaceBetween,
    totalTextHeight,
    textEndY: totalTextHeight
  };
}

// Step 1: Generate image with text overlays (TOP placement for Style 3)
async function generateImageWithTextTop(imagePath, quote, author, watermark, outputImagePath) {
  return new Promise((resolve, reject) => {
    // Calculate text layout
    const layout = calculateTextLayout(quote, author);
    
    // Calculate image dimensions to determine total group height
    const maxImageHeight = 800; // Reasonable max height for image
    const imageHeight = Math.min(maxImageHeight, 1920 - layout.totalTextHeight - 100); // Leave some margin
    
    // Calculate total group height (text + image)
    const totalGroupHeight = layout.totalTextHeight + imageHeight;
    
    // Center the entire group vertically (center of group at y=960)
    const groupStartY = (1920 - totalGroupHeight) / 2;
    const textStartY = groupStartY;
    const imageStartY = groupStartY + layout.totalTextHeight;
    
    console.log(`Style 3: Group height: ${totalGroupHeight}px, Group starts at: ${groupStartY}px, Text at: ${textStartY}px, Image at: ${imageStartY}px`);
    
    // Build text filters - center aligned with adjusted positions
    let textFilterArray = [];
    
    // Add each line of the quote (center aligned) if quote exists
    if (quote && quote.trim() && layout.lines.length > 0) {
      for (let i = 0; i < layout.lines.length; i++) {
        const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
        const cleanLine = layout.lines[i].replace(/'/g, "\\'");
        if (cleanLine.trim() !== '') { // Only add non-empty lines
          textFilterArray.push(`drawtext=text='${cleanLine}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`);
        }
      }
    }
    
    // Add author if provided and not empty
    if (author && author.trim() !== '') {
      const authorY = 1920 * 0.65; // Match editor: canvasHeight * 0.65
      const cleanAuthor = author.replace(/'/g, "\\'");
      textFilterArray.push(`drawtext=text='${cleanAuthor}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`);
    }

    // Add watermark if provided and not empty
    if (watermark && watermark.trim() !== '') {
      const cleanWatermark = watermark.replace(/'/g, "\\'");
      textFilterArray.push(`drawtext=text='${cleanWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`);
    }

    // Build final text filter
    const textFilter = textFilterArray.length > 0 ? textFilterArray.join(',') : null;

    // Build video filter with proper text handling
    let videoFilter;
    if (textFilter) {
      videoFilter = `scale=1080:${imageHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${imageStartY}:black,${textFilter}`;
    } else {
      videoFilter = `scale=1080:${imageHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${imageStartY}:black`;
    }

    const args = [
      '-i', imagePath,
      '-vf', videoFilter,
      '-y', outputImagePath
    ];

    console.log('Style 3: Generating image with vertically centered text+image group...');

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('Style 3: Image with vertically centered group generated successfully');
        resolve(outputImagePath);
      } else {
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`Style 3: Image generation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`Style 3: FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Step 2: Create video with fade animation from the generated image
async function createVideoWithFade(imageWithTextPath, audioPath, outputPath, maxDuration = null) {
  return new Promise((resolve, reject) => {
    // First get audio duration
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      audioPath
    ]);

    let duration = '';
    
    ffprobe.stdout.on('data', (data) => {
      duration += data.toString().trim();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get audio duration'));
        return;
      }

      const audioDuration = parseFloat(duration);
      const finalDuration = maxDuration ? Math.min(maxDuration, audioDuration) : audioDuration;
      const fadeInDuration = finalDuration * 0.75; // 75% fade in
      
      console.log(`Style 3: Audio duration: ${audioDuration}s, Final duration: ${finalDuration}s, Fade in: ${fadeInDuration}s`);

      // Build FFmpeg command for video with fade
      const args = [
        '-loop', '1',
        '-i', imageWithTextPath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', finalDuration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', `fade=in:st=0:d=${fadeInDuration}:color=black`,
        '-af', `afade=in:0:${fadeInDuration}`,
        '-y', outputPath
      ];

      console.log('Style 3: Creating video with fade animation...');

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Style 3: Video with fade created successfully');
          resolve(outputPath);
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Style 3: Video creation failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Style 3: FFmpeg spawn error: ${error.message}`));
      });
    });
  });
}

module.exports = {
  generateImageWithTextTop,
  createVideoWithFade,
  calculateTextLayout
};
