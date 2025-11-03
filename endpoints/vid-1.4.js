const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { downloadFile, downloadVideo, extractInstagramAudio, calculateTextLayout, handleFileSource, handleVideoSource } = require('./utils');

/**
 * Vid-1.4: Multi-clip video creation with timed captions
 * 
 * REQUIREMENTS:
 * - Tall clips (9:16): Take entire vertical space (1080x1920)
 * - Wide clips: Centered, take entire width or height 
 * - Screen: 9:16 (1080x1920)
 * - Captions: Timed text overlays with start and duration
 * - Entire clip always visible
 * - NO quote parameter - only captions array
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

// Convert image to video (normalized to 1080x1920 for consistent concatenation)
async function convertImageToVideo(imagePath, duration, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`🖼️  Converting image to ${duration}s video (normalized to 1080x1920): ${path.basename(imagePath)}`);

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

// Extract clip segment with volume control (normalized to 1080x1920 for consistent concatenation)
async function extractClipSegment(inputPath, beginTime, duration, outputPath, volume = 100) {
  return new Promise((resolve, reject) => {
    const volumeStr = volume !== 100 ? ` (volume: ${volume}%)` : '';
    console.log(`Extracting clip (normalized to 1080x1920): ${path.basename(inputPath)} (begin: ${beginTime}s, duration: ${duration}s)${volumeStr}`);

    // Calculate volume filter (volume as percentage: 100% = 1.0, 50% = 0.5, etc.)
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

    // Add audio filter if volume is not 100%
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

// Apply smart aspect ratio, overlay, and add timed captions
async function applySmartAspectRatioOverlayAndCaptions(videoPath, captions, watermark, overlay, outputPath, maxDuration) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📐 Applying smart aspect ratio management and timed captions...');

      // Get video dimensions
      const dimensions = await getMediaDimensions(videoPath);
      console.log(`📐 Input video: ${dimensions.width}x${dimensions.height}, AR: ${dimensions.aspectRatio.toFixed(3)}`);

      // Build text filters for captions
      let textFilters = [];

      if (captions && captions.length > 0) {
        console.log(`📝 Adding ${captions.length} timed captions`);
        
        // Add timed captions
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
                `drawtext=text='${cleanLine}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=${captionLayout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,${startTime},${endTime})'`
              );
            }
          }
        }
      }

      // Add watermark at bottom (fixed position to prevent overlapping)
      if (watermark && watermark.trim() !== '') {
        const cleanWatermark = watermark.replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
        if (cleanWatermark.trim() !== '') { // Only add non-empty watermark
          textFilters.push(
            `drawtext=text='${cleanWatermark}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`
          );
        }
      }

      const textFilter = textFilters.length > 0 ? textFilters.join(',') : null;

      // SMART ASPECT RATIO LOGIC
      const targetAR = 1080 / 1920; // 9:16 = 0.5625
      let baseVideoFilter;

      if (dimensions.aspectRatio <= targetAR) {
        // TALL or SQUARE clip - fill entire HEIGHT (1920px)
        console.log(`📐 TALL CLIP: Fill entire height (1920px), center horizontally`);
        baseVideoFilter = `scale=-1:1920:force_original_aspect_ratio=decrease,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;
      } else {
        // WIDE clip - fill entire WIDTH (1080px), center vertically
        console.log(`📐 WIDE CLIP: Fill entire width (1080px), center vertically`);
        baseVideoFilter = `scale=1080:-1:force_original_aspect_ratio=decrease,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;
      }

      let args;

      if (overlay) {
        const overlayPath = path.join('assets', 'overlay.png');
        if (fs.existsSync(overlayPath)) {
          console.log('🎨 Adding radial overlay with maskedmerge...');
          
          // Build complex filter with overlay and text
          let filterComplex;
          if (textFilter) {
            filterComplex = `[0:v]${baseVideoFilter}[scaled];[scaled]eq=brightness=-0.3[darkened];[1:v]scale=1080:1920[mask];[darkened][scaled][mask]maskedmerge,${textFilter}`;
          } else {
            filterComplex = `[0:v]${baseVideoFilter}[scaled];[scaled]eq=brightness=-0.3[darkened];[1:v]scale=1080:1920[mask];[darkened][scaled][mask]maskedmerge`;
          }
          
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
          console.warn('⚠️  Overlay file not found, using normal processing');
          // Fallback to normal processing
          const videoFilter = textFilter ? `${baseVideoFilter},${textFilter}` : baseVideoFilter;
          args = [
            '-i', videoPath,
            '-vf', videoFilter,
            '-t', maxDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-y', outputPath
          ];
        }
      } else {
        // No overlay - use simple filter
        const videoFilter = textFilter ? `${baseVideoFilter},${textFilter}` : baseVideoFilter;
        args = [
          '-i', videoPath,
          '-vf', videoFilter,
          '-t', maxDuration.toString(),
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
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
          console.log('✅ Smart aspect ratio and captions applied successfully');
          resolve(outputPath);
        } else {
          console.error('❌ Smart aspect ratio application failed:', stderr);
          reject(new Error(`Smart aspect ratio application failed with code ${code}`));
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

// Calculate smart durations based on next clip's start time
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
        const mediaType = hasImageUrl(clip) ? 'image' : 'video';
        console.log(`📐 Smart duration for ${mediaType} ${i + 1}: ${clip.duration}s (calculated from next clip)`);
      } else {
        clip.duration = hasImageUrl(clip) ? 4 : 5;
        const mediaType = hasImageUrl(clip) ? 'image' : 'video';
        console.log(`📐 Smart duration for ${mediaType} ${i + 1}: ${clip.duration}s (default fallback)`);
      }
    } else {
      clip.duration = hasImageUrl(clip) ? 4 : 5;
      const mediaType = hasImageUrl(clip) ? 'image' : 'video';
      console.log(`📐 Smart duration for ${mediaType} ${i + 1}: ${clip.duration}s (last clip default)`);
    }
  }
  
  return processedClips;
}

// Main function
async function createVideoVid14(audioPath, captions, watermark, clips, outputPath, overlay = false) {
  console.log('🚀 Starting Vid-1.4 with timed captions and overlay support...');
  console.log(`📊 Input: ${clips.length} clips, ${captions?.length || 0} captions, Audio: ${path.basename(audioPath)}, Overlay: ${overlay}`);

  try {
    const sessionId = path.basename(outputPath, '.mp4');

    // Calculate smart durations
    const processedClips = calculateSmartDurations(clips);
    console.log('📐 Smart duration calculation completed');

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

    // Apply smart aspect ratio, overlay, and captions
    const videoWithCaptionsPath = path.join('temp', `${sessionId}-with-captions.mp4`);
    await applySmartAspectRatioOverlayAndCaptions(concatenatedVideoPath, captions, watermark, overlay, videoWithCaptionsPath, finalDuration);

    // Add audio
    await addAudioToVideo(videoWithCaptionsPath, audioPath, outputPath, finalDuration);

    // Cleanup
    [concatenatedVideoPath, videoWithCaptionsPath].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️  Cleaned up: ${path.basename(file)}`);
      }
    });

    console.log('🎉 Vid-1.4 video created successfully with timed captions!');
    return outputPath;

  } catch (error) {
    console.error('❌ Vid-1.4 creation failed:', error.message);
    throw error;
  }
}

module.exports = {
  createVideoVid14
};
