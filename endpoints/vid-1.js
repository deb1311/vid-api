const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { downloadFile, downloadVideo, extractInstagramAudio, calculateTextLayout } = require('./utils');

// Generate video with text overlays (TOP placement for Vid-1)
async function generateVideoWithTextTop(videoPath, quote, author, watermark, audioDuration, outputVideoPath, maxDuration = null) {
  return new Promise((resolve, reject) => {
    // Calculate text layout
    const layout = calculateTextLayout(quote, author);
    
    // Calculate video dimensions to determine total group height
    const maxVideoHeight = 800; // Reasonable max height for video
    const videoHeight = Math.min(maxVideoHeight, 1920 - layout.totalTextHeight - 100); // Leave some margin
    
    // Calculate total group height (text + video)
    const totalGroupHeight = layout.totalTextHeight + videoHeight;
    
    // Center the entire group vertically (center of group at y=960)
    const groupStartY = (1920 - totalGroupHeight) / 2;
    const textStartY = groupStartY;
    const videoStartY = groupStartY + layout.totalTextHeight;
    
    console.log(`Group height: ${totalGroupHeight}px, Group starts at: ${groupStartY}px, Text at: ${textStartY}px, Video at: ${videoStartY}px`);
    
    // Build text filters - center aligned with adjusted positions
    let textFilterArray = [];
    
    // Add each line of the quote (center aligned) if quote exists
    if (quote && quote.trim() && layout.lines.length > 0) {
      for (let i = 0; i < layout.lines.length; i++) {
        const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
        const cleanLine = layout.lines[i].replace(/'/g, "\\'");
        if (cleanLine.trim() !== '') { // Only add non-empty lines
          textFilterArray.push(`drawtext=text='${cleanLine}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`);
        }
      }
    }
    
    // Add author if provided and not empty - use editor's positioning (65% down the screen)
    if (author && author.trim() !== '') {
      const authorY = 1920 * 0.65; // Match editor: canvasHeight * 0.65
      const cleanAuthor = author.replace(/'/g, "\\'");
      textFilterArray.push(`drawtext=text='${cleanAuthor}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`);
    }

    // Add watermark if provided and not empty
    if (watermark && watermark.trim() !== '') {
      const cleanWatermark = watermark.replace(/'/g, "\\'");
      textFilterArray.push(`drawtext=text='${cleanWatermark}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`);
    }

    // Build final text filter
    const textFilter = textFilterArray.length > 0 ? textFilterArray.join(',') : null;

    const finalDuration = maxDuration ? Math.min(maxDuration, audioDuration) : audioDuration;
    
    const args = [
      '-i', videoPath,
      '-t', finalDuration.toString(),
      '-vf', textFilter ? `scale=1080:${videoHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${videoStartY}:black,${textFilter}` : `scale=1080:${videoHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${videoStartY}:black`,
      '-c:v', 'libx264',
      '-an', // Remove audio from video
      '-y', outputVideoPath
    ];

    console.log('Generating video with vertically centered text+video group...');

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('Video with vertically centered group generated successfully');
        resolve(outputVideoPath);
      } else {
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`Video generation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Step 2: Create final video by combining video with text and audio (no fade)
async function createVideoWithoutFade(videoWithTextPath, audioPath, outputPath, maxDuration = null) {
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
      
      console.log(`Vid-1 (Step 1): Audio duration: ${audioDuration}s, Final duration: ${finalDuration}s, No fade effects`);

      // Build FFmpeg command for final video without fade
      const args = [
        '-i', videoWithTextPath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', finalDuration.toString(),
        '-pix_fmt', 'yuv420p',
        '-y', outputPath
      ];

      console.log('Creating final video without fade effects...');
      console.log('FFmpeg command:', 'ffmpeg', args.join(' '));

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Final video created successfully');
          resolve(outputPath);
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Video creation failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  });
}

// Vid-1: Two-step approach with video input and TOP text placement (no fade)
async function createVideoVid1(videoPath, audioPath, quote, author, watermark, outputPath, maxDuration = null) {
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

    ffprobe.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get audio duration'));
        return;
      }

      const audioDuration = parseFloat(duration);
      const finalDuration = maxDuration ? Math.min(maxDuration, audioDuration) : audioDuration;
      console.log(`Vid-1 - Audio duration: ${audioDuration}s, Final duration: ${finalDuration}s, No fade effects`);

      try {
        // Step 1: Generate video with text overlays (TOP placement)
        const videoWithTextPath = path.join('temp', `${path.basename(outputPath, '.mp4')}-video-with-text.mp4`);
        await generateVideoWithTextTop(videoPath, quote, author || '', watermark || '', audioDuration, videoWithTextPath, maxDuration);

        // Step 2: Create final video without fade
        await createVideoWithoutFade(videoWithTextPath, audioPath, outputPath, maxDuration);

        // Cleanup intermediate video
        if (fs.existsSync(videoWithTextPath)) fs.unlinkSync(videoWithTextPath);

        console.log('Vid-1 video created successfully');
        resolve(outputPath);
      } catch (error) {
        console.error('Vid-1 Error:', error);
        reject(new Error(`Vid-1 failed: ${error.message}`));
      }
    });
  });
}

module.exports = {
  createVideoVid1
};