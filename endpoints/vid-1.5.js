const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { downloadFile, downloadVideo, calculateTextLayout, handleFileSource, handleVideoSource } = require('./utils');

/**
 * Vid-1.5: Multi-clip video creation with timed captions and cinematic overlay support
 * 
 * Features:
 * - All features from Vid-1.4
 * - NEW: overlay parameter - when true, applies cinematic color grading for dramatic effect
 * - Cinematic look: heavy desaturation, crushed blacks, enhanced contrast
 */

// Check if clip has image URL
function hasImageUrl(clip) {
  return clip.imageurl && clip.imageurl.trim() !== '';
}

// Check if URL is an image based on file extension (fallback for videoUrl)
function isImageUrl(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const urlLower = url.toLowerCase();
  return imageExtensions.some(ext => urlLower.includes(ext));
}

// Get video/image dimensions
async function getMediaDimensions(mediaPath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      mediaPath
    ]);

    let output = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output);
          const videoStream = data.streams.find(stream => stream.codec_type === 'video');
          if (videoStream) {
            resolve({
              width: parseInt(videoStream.width),
              height: parseInt(videoStream.height),
              aspectRatio: videoStream.width / videoStream.height
            });
          } else {
            reject(new Error('No video stream found'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse ffprobe output: ${error.message}`));
        }
      } else {
        reject(new Error(`ffprobe failed with code ${code}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`FFprobe spawn error: ${error.message}`));
    });
  });
}

// Convert image to video
async function convertImageToVideo(imagePath, duration, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`🖼️  Converting image to ${duration}s video: ${path.basename(imagePath)}`);

    const args = [
      '-loop', '1',
      '-i', imagePath,
      '-c:v', 'libx264',
      '-t', duration.toString(),
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
      '-y', outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Image converted to video: ${path.basename(outputPath)}`);
        resolve(outputPath);
      } else {
        console.error(`❌ Image conversion failed:`, stderr);
        reject(new Error(`Image conversion failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Extract clip segment with volume control
async function extractClipSegment(inputPath, beginTime, duration, outputPath, volume = 100) {
  return new Promise((resolve, reject) => {
    const volumeStr = volume !== 100 ? ` (volume: ${volume}%)` : '';
    console.log(`Extracting clip: ${path.basename(inputPath)} (begin: ${beginTime}s, duration: ${duration}s)${volumeStr}`);

    const volumeLevel = volume / 100;

    const args = [
      '-i', inputPath,
      '-ss', beginTime.toString(),
      '-t', duration.toString(),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-r', '30',
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
      '-avoid_negative_ts', 'make_zero'
    ];

    if (volumeLevel !== 1.0) {
      args.push('-af', `volume=${volumeLevel}`);
    }

    args.push('-y', outputPath);

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Clip extracted: ${path.basename(outputPath)}`);
        resolve(outputPath);
      } else {
        console.error(`❌ Clip extraction failed:`, stderr);
        reject(new Error(`Clip extraction failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Process all clips
async function processClips(clips, sessionId) {
  const processedClips = [];

  console.log(`📹 Processing ${clips.length} clips...`);

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipPath = path.join('temp', `${sessionId}-clip-${i}.mp4`);

    try {
      if (hasImageUrl(clip)) {
        // Handle image URL (new imageurl parameter)
        console.log(`🖼️  Processing image ${i + 1}/${clips.length}...`);
        const imagePath = path.join('temp', `${sessionId}-image-${i}.jpg`);

        // Use smart file handler for both local and remote images
        await handleFileSource(clip.imageurl, imagePath);
        console.log(`✅ Image processed: ${path.basename(imagePath)}`);

        await convertImageToVideo(imagePath, clip.duration, clipPath);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }

      } else if (clip.videourl || clip.videoUrl) {
        // Handle video URL (new videourl parameter or fallback to old videoUrl)
        const videoSource = clip.videourl || clip.videoUrl;
        console.log(`📹 Processing video ${i + 1}/${clips.length}...`);
        const sourceVideoPath = path.join('temp', `${sessionId}-source-${i}.mp4`);

        // Use smart video handler for both local and remote videos
        await handleVideoSource(videoSource, sourceVideoPath);
        console.log(`✅ Video processed: ${path.basename(sourceVideoPath)}`);

        await extractClipSegment(sourceVideoPath, clip.begin || 0, clip.duration, clipPath, clip.volume);

        if (fs.existsSync(sourceVideoPath)) {
          fs.unlinkSync(sourceVideoPath);
        }
      } else {
        throw new Error(`Clip ${i + 1} must have either 'imageurl' or 'videourl' parameter`);
      }

      processedClips.push(clipPath);

    } catch (error) {
      console.error(`❌ Error processing clip ${i + 1}:`, error.message);
      throw new Error(`Failed to process clip ${i + 1}: ${error.message}`);
    }
  }

  console.log(`✅ All ${clips.length} clips processed successfully`);
  return processedClips;
}

// Simple concatenation for multiple clips
async function concatenateClips(clipPaths, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`🔗 Concatenating ${clipPaths.length} clips...`);

    if (clipPaths.length === 1) {
      // Single clip - just copy
      fs.copyFileSync(clipPaths[0], outputPath);
      if (fs.existsSync(clipPaths[0])) {
        fs.unlinkSync(clipPaths[0]);
      }
      console.log('✅ Single clip copied');
      resolve(outputPath);
      return;
    }

    // Multiple clips - normalize SAR and concatenate
    const inputs = [];
    clipPaths.forEach(clipPath => {
      inputs.push('-i', clipPath);
    });

    // Normalize all clips to consistent SAR and resolution before concatenating
    const normalizeFilters = clipPaths.map((_, i) =>
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30[v${i}]`
    ).join(';');

    const concatFilter = clipPaths.map((_, i) => `[v${i}]`).join('');
    const filterComplex = `${normalizeFilters};${concatFilter}concat=n=${clipPaths.length}:v=1:a=0[outv]`;

    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-y', outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      // Cleanup clip files
      clipPaths.forEach(clipPath => {
        if (fs.existsSync(clipPath)) {
          fs.unlinkSync(clipPath);
        }
      });

      if (code === 0) {
        console.log('✅ Clips concatenated successfully');
        resolve(outputPath);
      } else {
        console.error('❌ Concatenation failed:', stderr);
        reject(new Error(`Concatenation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Apply overlay and captions
async function applyOverlayAndCaptions(videoPath, captions, watermark, overlay, outputPath, maxDuration) {
  return new Promise((resolve, reject) => {
    try {
      console.log('🎨 Applying overlay and captions...');

      // Build text filters for captions
      let textFilters = [];

      if (captions && captions.length > 0) {
        console.log(`📝 Adding ${captions.length} timed captions`);
        
        // Add timed captions with proper text layout
        for (let i = 0; i < captions.length; i++) {
          const caption = captions[i];
          if (!caption.text || caption.text.trim() === '') continue; // Skip empty captions
          
          const cleanText = caption.text.replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
          if (cleanText.trim() === '') continue; // Skip if cleaned text is empty
          
          const startTime = caption.start || 0;
          const endTime = startTime + (caption.duration || 3);
          
          // Calculate text layout for this caption
          const captionLayout = calculateTextLayout(cleanText, '');
          
          // Use Vid-1.2 positioning logic
          const videoHeight = 800;
          const totalGroupHeight = captionLayout.totalTextHeight + videoHeight;
          const groupStartY = (1920 - totalGroupHeight) / 2;
          const textStartY = groupStartY;
          
          // Add caption lines with timing
          for (let j = 0; j < captionLayout.lines.length; j++) {
            const lineY = textStartY + captionLayout.topPadding + (j * captionLayout.lineHeight);
            const cleanLine = captionLayout.lines[j].replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
            
            if (cleanLine.trim() !== '') { // Only add non-empty lines
              textFilters.push(
                `drawtext=text='${cleanLine}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${captionLayout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,${startTime},${endTime})'`
              );
            }
          }
        }
      }

      // Add watermark
      if (watermark && watermark.trim() !== '') {
        const cleanWatermark = watermark.replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
        if (cleanWatermark.trim() !== '') { // Only add non-empty watermark
          textFilters.push(
            `drawtext=text='${cleanWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`
          );
        }
      }

      let args;

      if (overlay) {
        const overlayPath = path.join('assets', 'overlay.png');
        if (fs.existsSync(overlayPath)) {
          console.log('🎨 Adding radial overlay with multiply blend mode...');
          
          // Build filter complex with overlay and text
          let filterParts = [];
          filterParts.push('[1:v]scale=1080:1920[overlay]');
          filterParts.push('[0:v][overlay]blend=all_mode=multiply[overlaid]');
          
          if (textFilters.length > 0) {
            filterParts.push(`[overlaid]${textFilters.join(',')}`);
          }
          
          const filterComplex = filterParts.join(';');
          console.log('🔍 Filter complex:', filterComplex);
          
          args = [
            '-i', videoPath,
            '-i', overlayPath,
            '-filter_complex', filterComplex,
            '-t', maxDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-y', outputPath
          ];
        } else {
          console.warn('⚠️  Overlay file not found, using text only');
          // Fallback to text only
          if (textFilters.length > 0) {
            const simpleFilter = textFilters.join(',');
            args = [
              '-i', videoPath,
              '-vf', simpleFilter,
              '-t', maxDuration.toString(),
              '-c:v', 'libx264',
              '-pix_fmt', 'yuv420p',
              '-y', outputPath
            ];
          } else {
            // No text filters at all - just copy
            args = [
              '-i', videoPath,
              '-t', maxDuration.toString(),
              '-c:v', 'libx264',
              '-pix_fmt', 'yuv420p',
              '-y', outputPath
            ];
          }
        }
      } else {
        // No overlay - just text filters
        if (textFilters.length > 0) {
          const simpleFilter = textFilters.join(',');
          console.log('🔍 Simple filter:', simpleFilter);
        
          args = [
            '-i', videoPath,
            '-vf', simpleFilter,
            '-t', maxDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-y', outputPath
          ];
        } else {
          // No text filters at all - just copy
          args = [
            '-i', videoPath,
            '-t', maxDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-y', outputPath
          ];
        }
      }

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Overlay and captions applied successfully');
          resolve(outputPath);
        } else {
          console.error('❌ Overlay application failed:', stderr);
          reject(new Error(`Overlay application failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Add audio to video (handles videos with or without audio)
async function addAudioToVideo(videoPath, audioPath, outputPath, duration) {
  return new Promise((resolve, reject) => {
    console.log('🎵 Adding audio to video...');

    // First check if video has audio stream
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-select_streams', 'a',
      '-show_entries', 'stream=codec_type',
      '-of', 'csv=p=0',
      videoPath
    ]);

    let hasAudio = false;

    ffprobe.stdout.on('data', (data) => {
      if (data.toString().trim() === 'audio') {
        hasAudio = true;
      }
    });

    ffprobe.on('close', () => {
      let args;
      
      if (hasAudio) {
        // Video has audio - mix both audio streams
        console.log('🎵 Mixing video audio with background audio...');
        args = [
          '-i', videoPath,
          '-i', audioPath,
          '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-t', duration.toString(),
          '-y', outputPath
        ];
      } else {
        // Video has no audio - just add the background audio
        console.log('🎵 Adding background audio to silent video...');
        args = [
          '-i', videoPath,
          '-i', audioPath,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-t', duration.toString(),
          '-y', outputPath
        ];
      }

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Final video created successfully');
          resolve(outputPath);
        } else {
          console.error('❌ Final video creation failed:', stderr);
          reject(new Error(`Final video creation failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`FFprobe spawn error: ${error.message}`));
    });
  });
}

// Get audio duration
async function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
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
      if (code === 0) {
        const audioDuration = parseFloat(duration);
        console.log(`🎵 Audio duration: ${audioDuration}s`);
        resolve(audioDuration);
      } else {
        reject(new Error('Failed to get audio duration'));
      }
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`FFprobe spawn error: ${error.message}`));
    });
  });
}

// Calculate smart durations
function calculateSmartDurations(clips) {
  const processedClips = [...clips];
  
  console.log('📐 Calculating smart durations...');
  
  for (let i = 0; i < processedClips.length; i++) {
    const clip = processedClips[i];
    
    if (clip.duration && clip.duration > 0) {
      console.log(`📐 Clip ${i + 1}: Duration already specified (${clip.duration}s)`);
      continue;
    }
    
    if (i < processedClips.length - 1) {
      const nextClip = processedClips[i + 1];
      const currentStart = clip.start || 0;
      const nextStart = nextClip.start || 0;
      
      if (nextStart > currentStart) {
        clip.duration = nextStart - currentStart;
        console.log(`📐 Smart duration for clip ${i + 1}: ${clip.duration}s`);
      } else {
        clip.duration = hasImageUrl(clip) ? 4 : 5;
        console.log(`📐 Default duration for clip ${i + 1}: ${clip.duration}s`);
      }
    } else {
      clip.duration = hasImageUrl(clip) ? 4 : 5;
      console.log(`📐 Default duration for clip ${i + 1}: ${clip.duration}s`);
    }
  }
  
  return processedClips;
}

// Simple overlay application using FFmpeg
async function applySimpleOverlay(videoPath, outputPath, maxDuration) {
  return new Promise((resolve, reject) => {
    const overlayPath = path.join('assets', 'overlay.png');
    
    if (!fs.existsSync(overlayPath)) {
      console.warn('⚠️  Overlay file not found, copying video as-is');
      fs.copyFileSync(videoPath, outputPath);
      resolve(outputPath);
      return;
    }

    console.log('🎨 Applying radial overlay with multiply blend...');

    // Use maskedmerge with color preservation - darkened edges, normal center
    const args = [
      '-i', videoPath,
      '-i', overlayPath,
      '-filter_complex', '[0:v]eq=brightness=-0.3[darkened];[1:v]scale=1080:1920[mask];[darkened][0:v][mask]maskedmerge',
      '-t', maxDuration.toString(),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Overlay applied successfully');
        resolve(outputPath);
      } else {
        console.error('❌ Overlay application failed:', stderr);
        reject(new Error(`Overlay application failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Main function - back to FFmpeg with simple overlay
async function createVideoVid15(audioPath, captions, watermark, clips, outputPath, overlay = false) {
  console.log('🚀 Starting Vid-1.5 with simple FFmpeg overlay...');
  console.log(`📊 Input: ${clips.length} clips, ${captions?.length || 0} captions, Overlay: ${overlay}`);

  try {
    const sessionId = path.basename(outputPath, '.mp4');

    // Calculate smart durations
    const processedClips = calculateSmartDurations(clips);

    // Calculate total duration
    const totalVideoDuration = processedClips.reduce((sum, clip) => sum + clip.duration, 0);
    console.log(`⏱️  Total video duration: ${totalVideoDuration}s`);

    // Get audio duration
    const audioDuration = await getAudioDuration(audioPath);
    const finalDuration = Math.min(totalVideoDuration, audioDuration);
    console.log(`⏱️  Final duration: ${finalDuration}s`);

    // Process clips
    const clipPaths = await processClips(processedClips, sessionId);

    // Concatenate clips
    const concatenatedVideoPath = path.join('temp', `${sessionId}-concatenated.mp4`);
    await concatenateClips(clipPaths, concatenatedVideoPath);

    // Apply overlay if requested
    let videoWithOverlayPath = concatenatedVideoPath;
    if (overlay) {
      videoWithOverlayPath = path.join('temp', `${sessionId}-with-overlay.mp4`);
      await applySimpleOverlay(concatenatedVideoPath, videoWithOverlayPath, finalDuration);
    }

    // Add captions and watermark using simple drawtext
    let videoWithTextPath = videoWithOverlayPath;
    if (captions?.length > 0 || watermark) {
      videoWithTextPath = path.join('temp', `${sessionId}-with-text.mp4`);
      await applySimpleText(videoWithOverlayPath, captions, watermark, videoWithTextPath, finalDuration);
    }

    // Add audio
    await addAudioToVideo(videoWithTextPath, audioPath, outputPath, finalDuration);

    // Cleanup
    [concatenatedVideoPath, videoWithOverlayPath, videoWithTextPath].forEach(file => {
      if (fs.existsSync(file) && file !== concatenatedVideoPath) {
        fs.unlinkSync(file);
        console.log(`🗑️  Cleaned up: ${path.basename(file)}`);
      }
    });

    console.log('🎉 Vid-1.5 video created successfully with simple overlay!');
    return outputPath;

  } catch (error) {
    console.error('❌ Vid-1.5 creation failed:', error.message);
    throw error;
  }
}

// Simple text application
async function applySimpleText(videoPath, captions, watermark, outputPath, maxDuration) {
  return new Promise((resolve, reject) => {
    console.log('📝 Adding captions and watermark...');

    let textFilters = [];

    // Add captions with proper text layout
    if (captions && captions.length > 0) {
      for (let i = 0; i < captions.length; i++) {
        const caption = captions[i];
        const cleanText = caption.text.replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
        const startTime = caption.start || 0;
        const endTime = startTime + (caption.duration || 3);
        
        // Calculate text layout for this caption
        const captionLayout = calculateTextLayout(cleanText, '');
        
        // Use Vid-1.2 positioning logic
        const videoHeight = 800;
        const totalGroupHeight = captionLayout.totalTextHeight + videoHeight;
        const groupStartY = (1920 - totalGroupHeight) / 2;
        const textStartY = groupStartY;
        
        // Add caption lines with timing
        for (let j = 0; j < captionLayout.lines.length; j++) {
          const lineY = textStartY + captionLayout.topPadding + (j * captionLayout.lineHeight);
          const cleanLine = captionLayout.lines[j].replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
          
          textFilters.push(
            `drawtext=text='${cleanLine}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${captionLayout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,${startTime},${endTime})'`
          );
        }
      }
    }

    // Add watermark
    if (watermark) {
      const cleanWatermark = watermark.replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
      textFilters.push(
        `drawtext=text='${cleanWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`
      );
    }

    if (textFilters.length === 0) {
      // No text to add, just copy
      fs.copyFileSync(videoPath, outputPath);
      resolve(outputPath);
      return;
    }

    const args = [
      '-i', videoPath,
      '-vf', textFilters.join(','),
      '-t', maxDuration.toString(),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Text applied successfully');
        resolve(outputPath);
      } else {
        console.error('❌ Text application failed:', stderr);
        reject(new Error(`Text application failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

module.exports = {
  createVideoVid15
};
