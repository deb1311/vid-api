const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { downloadFile, downloadVideo, extractInstagramAudio, calculateTextLayout, escapeDrawtext } = require('./utils');

// Generate video with text overlays (TOP placement for Vid-1) - FULL SCREEN
async function generateVideoWithTextTop(videoPath, quote, author, watermark, audioDuration, outputVideoPath, maxDuration = null) {
  return new Promise((resolve, reject) => {
    // Calculate text layout
    const layout = calculateTextLayout(quote, author);
    
    // Use EXACT positioning logic from video editor preview (app.js)
    // Match the editor's Vid-1.2 positioning logic exactly
    const canvasHeight = 1920; // Full canvas height
    const videoHeight = 800; // Match editor's videoHeight = 800
    const totalGroupHeight = layout.totalTextHeight + videoHeight;
    const groupStartY = (canvasHeight - totalGroupHeight) / 2;
    const textStartY = groupStartY + layout.topPadding;
    
    console.log(`Editor-matched positioning: groupStartY=${groupStartY}, textStartY=${textStartY}, totalGroupHeight=${totalGroupHeight}`);
    
    // Build text filters - using EXACT editor positioning
    let textFilterArray = [];
    
    // Add each line of the quote (center aligned) - match editor exactly
    if (quote && quote.trim() && layout.lines.length > 0) {
      for (let i = 0; i < layout.lines.length; i++) {
        const lineY = textStartY + (i * layout.lineHeight);
        const cleanLine = escapeDrawtext(layout.lines[i]);
        if (cleanLine.trim() !== '') { // Only add non-empty lines
          textFilterArray.push(`drawtext=text='${cleanLine}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`);
        }
      }
    }
    
    // Add author if provided and not empty - use editor's positioning (65% down the screen)
    if (author && author.trim() !== '') {
      const authorY = 1920 * 0.65; // Match editor: canvasHeight * 0.65
      const cleanAuthor = escapeDrawtext(author);
      textFilterArray.push(`drawtext=text='${cleanAuthor}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`);
    }

    // Add watermark if provided and not empty
    if (watermark && watermark.trim() !== '') {
      const cleanWatermark = escapeDrawtext(watermark);
      textFilterArray.push(`drawtext=text='${cleanWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`);
    }

    // Build final text filter
    const textFilter = textFilterArray.length > 0 ? textFilterArray.join(',') : null;

    const finalDuration = maxDuration ? Math.min(maxDuration, audioDuration) : audioDuration;
    
    // Use full-screen scaling like other endpoints
    const args = [
      '-i', videoPath,
      '-t', finalDuration.toString(),
      '-vf', textFilter ? `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,${textFilter}` : `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`,
      '-c:v', 'libx264',
      '-an', // Remove audio from video
      '-y', outputVideoPath
    ];

    console.log('Generating full-screen video with text overlays...');

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('Full-screen video with text overlays generated successfully');
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

      // Check if video has audio
      const ffprobeAudio = spawn('ffprobe', [
        '-v', 'quiet',
        '-select_streams', 'a',
        '-show_entries', 'stream=codec_type',
        '-of', 'csv=p=0',
        videoWithTextPath
      ]);

      let hasAudio = false;

      ffprobeAudio.stdout.on('data', (data) => {
        if (data.toString().trim() === 'audio') {
          hasAudio = true;
        }
      });

      ffprobeAudio.on('close', () => {
        let args;
        
        if (hasAudio) {
          // Video has audio - mix both audio streams
          console.log('🎵 Mixing video audio with background audio...');
          args = [
            '-i', videoWithTextPath,
            '-i', audioPath,
            '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-t', finalDuration.toString(),
            '-y', outputPath
          ];
        } else {
          // Video has no audio - just add the background audio
          console.log('🎵 Adding background audio to silent video...');
          args = [
            '-i', videoWithTextPath,
            '-i', audioPath,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-map', '0:v',
            '-map', '1:a',
            '-t', finalDuration.toString(),
            '-y', outputPath
          ];
        }

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

      ffprobeAudio.on('error', (error) => {
        reject(new Error(`FFprobe spawn error: ${error.message}`));
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
