const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { downloadFile, downloadVideo, extractInstagramAudio, calculateTextLayout, handleFileSource, handleVideoSource } = require('./utils');

/**
 * Vid-1.2: Multi-clip video creation with text overlays
 * Features:
 * - Multiple video clips from different sources
 * - Support for both video URLs and image URLs
 * - Custom start time and duration for each clip
 * - Text overlays (quote, author, watermark)
 * - Audio synchronization with duration capping
 * - Clean concatenation of clips
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

// Convert image to video with specified duration
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
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
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
        console.error(`❌ Image to video conversion failed:`, stderr);
        reject(new Error(`Image conversion failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Extract a clip segment from a video file
async function extractClipSegment(inputPath, beginTime, duration, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Extracting clip: ${path.basename(inputPath)} (begin: ${beginTime}s, duration: ${duration}s)`);

    const args = [
      '-i', inputPath,
      '-ss', beginTime.toString(),
      '-t', duration.toString(),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-r', '30',
      '-vf', 'setsar=1',
      '-avoid_negative_ts', 'make_zero',
      '-y', outputPath
    ];

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

// Download and extract all clips (supports both videos and images)
async function processClips(clips, sessionId) {
  const processedClips = [];

  console.log(`📹 Processing ${clips.length} clips (videos and images)...`);

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

        // Convert image to video with specified duration
        await convertImageToVideo(imagePath, clip.duration, clipPath);

        // Cleanup image file
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

        // Extract clip segment
        await extractClipSegment(sourceVideoPath, clip.begin || 0, clip.duration, clipPath);

        // Cleanup source video
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

// Concatenate multiple clips into a single video (with resolution normalization)
async function concatenateClips(clipPaths, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`🔗 Concatenating ${clipPaths.length} clips...`);

    if (clipPaths.length === 1) {
      // Single clip - normalize resolution
      const args = [
        '-i', clipPaths[0],
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
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
          console.log('✅ Single clip normalized successfully');
          resolve(outputPath);
        } else {
          console.error('❌ Normalization failed:', stderr);
          reject(new Error(`Normalization failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });

      return;
    }

    // Multiple clips - normalize resolution and concatenate
    const inputs = [];
    clipPaths.forEach(clipPath => {
      inputs.push('-i', clipPath);
    });

    // Normalize all clips to 1920x1080 with consistent SAR and FPS before concatenating
    const normalizeFilters = clipPaths.map((_, i) =>
      `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30[v${i}]`
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

    console.log(`🎬 FFmpeg concat with normalization: ${clipPaths.length} clips → ${path.basename(outputPath)}`);

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
        console.log('✅ Clips concatenated successfully with normalization');
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

// Add text overlays to video
async function addTextOverlays(videoPath, quote, author, watermark, outputPath, maxDuration) {
  return new Promise((resolve, reject) => {
    console.log('📝 Adding text overlays...');

    // Calculate text layout
    const layout = calculateTextLayout(quote, author);

    // Video dimensions and positioning
    const videoHeight = 800;
    const totalGroupHeight = layout.totalTextHeight + videoHeight;
    const groupStartY = (1920 - totalGroupHeight) / 2;
    const textStartY = groupStartY;
    const videoStartY = groupStartY + layout.totalTextHeight;

    console.log(`📐 Layout: Text at ${textStartY}px, Video at ${videoStartY}px`);

    // Build text filters
    let textFilters = [];

    // Add quote lines if quote exists
    if (quote && quote.trim() && layout.lines.length > 0) {
      for (let i = 0; i < layout.lines.length; i++) {
        const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
        const cleanText = layout.lines[i].replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
        if (cleanText.trim() !== '') { // Only add non-empty lines
          textFilters.push(
            `drawtext=text='${cleanText}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`
          );
        }
      }
    }

    // Add author - use editor's positioning (65% down the screen)
    if (author && author.trim() !== '') {
      const authorY = 1920 * 0.65; // Match editor: canvasHeight * 0.65
      const cleanAuthor = author.replace(/'/g, '').replace(/:/g, ' -').replace(/"/g, '');
      if (cleanAuthor.trim() !== '') { // Only add non-empty author
        textFilters.push(
          `drawtext=text='${cleanAuthor}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`
        );
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

    // Build video filter with proper text handling
    let videoFilter;
    if (textFilters.length > 0) {
      const textFilter = textFilters.join(',');
      videoFilter = `scale=1080:${videoHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${videoStartY}:black,${textFilter}`;
    } else {
      // No text filters - just scale and pad
      videoFilter = `scale=1080:${videoHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${videoStartY}:black`;
    }

    const args = [
      '-i', videoPath,
      '-vf', videoFilter,
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
        console.log('✅ Text overlays added successfully');
        resolve(outputPath);
      } else {
        console.error('❌ Text overlay failed:', stderr);
        reject(new Error(`Text overlay failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Combine video with audio
async function addAudioToVideo(videoPath, audioPath, outputPath, duration) {
  return new Promise((resolve, reject) => {
    console.log('🎵 Adding audio to video...');

    const args = [
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-t', duration.toString(),
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];

    console.log(`🎬 Final video: ${duration}s duration`);

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

// Calculate automatic durations for clips that don't have duration specified (NEW VERSION)
function calculateSmartDurations(clips) {
  const processedClips = [...clips]; // Create a copy to avoid modifying original
  
  console.log('📐 Calculating automatic durations...');
  console.log('🚨🚨🚨 KIRO DEBUG: NEW FUNCTION VERSION CALLED! 🚨🚨🚨');
  
  for (let i = 0; i < processedClips.length; i++) {
    const clip = processedClips[i];
    
    // Skip if duration is already specified
    if (clip.duration && clip.duration > 0) {
      console.log(`📐 Clip ${i + 1}: Duration already specified (${clip.duration}s)`);
      continue;
    }
    

    
    // Calculate duration based on next clip's start time
    if (i < processedClips.length - 1) {
      // Not the last clip - calculate from next clip's start time
      const nextClip = processedClips[i + 1];
      const currentStart = clip.start || 0;
      const nextStart = nextClip.start || 0;
      
      console.log(`📐 DEBUG: Clip ${i + 1} - current: ${currentStart}, next: ${nextStart}, isImage: ${isImageUrl(clip.videoUrl)}`);
      
      if (nextStart > currentStart) {
        clip.duration = nextStart - currentStart;
        const mediaType = hasImageUrl(clip) ? 'image' : 'video';
        console.log(`📐 Auto-duration for ${mediaType} ${i + 1}: ${clip.duration}s (calculated from next clip start: ${nextStart}s - ${currentStart}s)`);
      } else {
        // Fallback to default if next clip's start time doesn't make sense
        clip.duration = hasImageUrl(clip) ? 4 : 5;
        const mediaType = hasImageUrl(clip) ? 'image' : 'video';
        console.log(`📐 Auto-duration for ${mediaType} ${i + 1}: ${clip.duration}s (fallback default - next clip start time invalid)`);
      }
    } else {
      // Last clip - use default durations based on media type
      const mediaType = hasImageUrl(clip) ? 'image' : 'video';
      if (hasImageUrl(clip)) {
        clip.duration = 4; // Default 4 seconds for images
        console.log(`📐 Auto-duration for ${mediaType} ${i + 1}: ${clip.duration}s (last clip - default for images)`);
      } else {
        clip.duration = 5; // Default 5 seconds for videos
        console.log(`📐 Auto-duration for ${mediaType} ${i + 1}: ${clip.duration}s (last clip - default for videos)`);
      }
    }
  }
  
  return processedClips;
}

// Main function: Create multi-clip video (supports both videos and images)
async function createVideoVid12(audioPath, quote, author, watermark, clips, outputPath) {
  console.log('🚀 Starting Vid-1.2 video creation...');
  console.log(`📊 Input: ${clips.length} clips (videos/images), Audio: ${path.basename(audioPath)}`);

  try {
    const sessionId = path.basename(outputPath, '.mp4');

    // Calculate automatic durations for clips without duration specified
    const processedClips = calculateSmartDurations(clips);
    console.log('📐 Duration calculation completed');

    // Calculate video duration from processed clips
    const totalVideoDuration = processedClips.reduce((sum, clip) => sum + clip.duration, 0);
    console.log(`⏱️  Total video duration: ${totalVideoDuration}s`);

    // Get audio duration
    const audioDuration = await getAudioDuration(audioPath);

    // Cap video duration to audio duration
    const finalDuration = Math.min(totalVideoDuration, audioDuration);
    console.log(`⏱️  Final duration: ${finalDuration}s (${totalVideoDuration > audioDuration ? 'capped by audio' : 'full video'})`);

    // Step 1: Process all clips (using processed clips with calculated durations)
    const clipPaths = await processClips(processedClips, sessionId);

    // Step 2: Concatenate clips
    const concatenatedVideoPath = path.join('temp', `${sessionId}-concatenated.mp4`);
    await concatenateClips(clipPaths, concatenatedVideoPath);

    // Step 3: Add text overlays
    const videoWithTextPath = path.join('temp', `${sessionId}-with-text.mp4`);
    await addTextOverlays(concatenatedVideoPath, quote, author, watermark, videoWithTextPath, finalDuration);

    // Step 4: Add audio
    await addAudioToVideo(videoWithTextPath, audioPath, outputPath, finalDuration);

    // Cleanup intermediate files
    [concatenatedVideoPath, videoWithTextPath].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️  Cleaned up: ${path.basename(file)}`);
      }
    });

    console.log('🎉 Vid-1.2 video created successfully!');
    return outputPath;

  } catch (error) {
    console.error('❌ Vid-1.2 creation failed:', error.message);
    throw error;
  }
}

module.exports = {
  createVideoVid12
};
