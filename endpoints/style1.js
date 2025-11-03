const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Step 1: Generate image with text overlays (BOTTOM placement)
async function generateImageWithText(imagePath, quote, author, watermark, outputImagePath) {
  return new Promise((resolve, reject) => {
    // Build text overlay filters for BOTTOM placement
    let textFilters = [];
    
    // Add quote if provided and not empty
    if (quote && quote.trim() !== '') {
      const cleanQuote = quote.replace(/'/g, "\\'");
      textFilters.push(`drawtext=text='${cleanQuote}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-400:shadowcolor=black:shadowx=3:shadowy=3`);
    }
    
    // Add author if provided and not empty
    if (author && author.trim() !== '') {
      const cleanAuthor = author.replace(/'/g, "\\'");
      textFilters.push(`drawtext=text='${cleanAuthor}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-280:shadowcolor=black:shadowx=2:shadowy=2`);
    }

    // Add watermark if provided and not empty
    if (watermark && watermark.trim() !== '') {
      const cleanWatermark = watermark.replace(/'/g, "\\'");
      textFilters.push(`drawtext=text='${cleanWatermark}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`);
    }

    // Build final text filter
    const textFilter = textFilters.length > 0 ? textFilters.join(',') : null;

    // Build video filter with proper text handling
    let videoFilter;
    if (textFilter) {
      videoFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,${textFilter}`;
    } else {
      videoFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;
    }

    const args = [
      '-i', imagePath,
      '-vf', videoFilter,
      '-y', outputImagePath
    ];

    console.log('Style 1: Generating image with BOTTOM text...');

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('Style 1: Image with BOTTOM text generated successfully');
        resolve(outputImagePath);
      } else {
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`Style 1: Image generation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`Style 1: FFmpeg spawn error: ${error.message}`));
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
      
      console.log(`Style 1: Audio duration: ${audioDuration}s, Final duration: ${finalDuration}s, Fade in: ${fadeInDuration}s`);

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

      console.log('Style 1: Creating video with fade animation...');

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Style 1: Video with fade created successfully');
          resolve(outputPath);
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Style 1: Video creation failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Style 1: FFmpeg spawn error: ${error.message}`));
      });
    });
  });
}

module.exports = {
  generateImageWithText,
  createVideoWithFade
};