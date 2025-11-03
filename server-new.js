const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Create directories
['uploads', 'temp', 'output'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure multer
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Download file from URL
async function downloadFile(url, filepath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  
  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Download and prepare video for processing
async function downloadVideo(videoUrl, outputVideoPath) {
  return new Promise((resolve, reject) => {
    console.log('=== VIDEO DOWNLOAD ===');
    console.log('Video URL:', videoUrl);
    console.log('Output video path:', outputVideoPath);
    
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoUrl,
      '-c', 'copy',
      '-y', outputVideoPath
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        if (fs.existsSync(outputVideoPath)) {
          const stats = fs.statSync(outputVideoPath);
          console.log(`Video downloaded successfully: ${outputVideoPath} (${stats.size} bytes)`);
          resolve(outputVideoPath);
        } else {
          reject(new Error('Video download completed but file not found'));
        }
      } else {
        console.error('FFmpeg video download stderr:', stderr);
        reject(new Error(`Video download failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Detect if URL is a video based on extension or content type
function isVideoUrl(url) {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
  const urlLower = url.toLowerCase();
  return videoExtensions.some(ext => urlLower.includes(ext)) || 
         urlLower.includes('youtube.com') || 
         urlLower.includes('youtu.be') ||
         urlLower.includes('vimeo.com') ||
         urlLower.includes('dailymotion.com');
}

// Extract Instagram audio using yt-dlp with fallback options
async function extractInstagramAudio(instagramUrl, outputPath) {
  console.log('=== INSTAGRAM AUDIO EXTRACTION ===');
  console.log('Instagram URL:', instagramUrl);
  console.log('Output path:', outputPath);
  
  // Validate Instagram URL format
  if (!instagramUrl.includes('instagram.com')) {
    throw new Error('Invalid Instagram URL format');
  }
  
  // Try multiple extraction strategies
  const strategies = [
    // Strategy 1: Use Chrome cookies
    {
      name: 'Chrome cookies',
      args: ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outputPath, '--cookies-from-browser', 'chrome', instagramUrl]
    },
    // Strategy 2: Use Edge cookies
    {
      name: 'Edge cookies',
      args: ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outputPath, '--cookies-from-browser', 'edge', instagramUrl]
    },
    // Strategy 3: No cookies (might work for some public posts)
    {
      name: 'No cookies',
      args: ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outputPath, instagramUrl]
    }
  ];
  
  for (const strategy of strategies) {
    console.log(`Trying strategy: ${strategy.name}`);
    
    try {
      const result = await tryExtraction(strategy.args, outputPath);
      console.log(`Success with strategy: ${strategy.name}`);
      return result;
    } catch (error) {
      console.log(`Strategy ${strategy.name} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All Instagram extraction strategies failed. The post might be private, deleted, or require manual authentication.');
}

// Helper function to try a single extraction strategy
function tryExtraction(args, outputPath) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', args);

    let stdout = '';
    let stderr = '';
    
    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Check for the created file with various possible extensions
        const possibleFiles = [
          outputPath + '.mp3',
          outputPath,
          outputPath.replace(/\.[^/.]+$/, '') + '.mp3'
        ];
        
        for (const filePath of possibleFiles) {
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`Found audio file: ${filePath} (${stats.size} bytes)`);
            resolve(filePath);
            return;
          }
        }
        
        reject(new Error('Audio file not found after extraction'));
      } else {
        // Provide more specific error messages
        let errorMessage = `yt-dlp failed with code ${code}`;
        
        if (stderr.includes('Instagram API is not granting access') || stderr.includes('Instagram sent an empty media response')) {
          errorMessage = 'Instagram access denied or post not accessible';
        } else if (stderr.includes('Video unavailable')) {
          errorMessage = 'Instagram video is unavailable or has been removed';
        } else if (stderr.includes('Private video')) {
          errorMessage = 'Instagram post is private';
        }
        
        reject(new Error(errorMessage));
      }
    });

    ytdlp.on('error', (error) => {
      reject(new Error(`yt-dlp spawn error: ${error.message}`));
    });
  });
}

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
  
  let lines = [];
  let quoteHeight = 0;
  
  // Handle quote text if provided
  if (quote && quote.trim()) {
    // Word wrapping for better readability
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
    const words = quote.split(' ');
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
    
    quoteHeight = lines.length * lineHeight;
  }
  
  const authorHeight = author ? authorLineHeight : 0;
  const spaceBetween = (author && quote && quote.trim()) ? 40 : 0;
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

// Generate video with text overlays (TOP placement for Style 5)
async function generateVideoWithTextTop(videoPath, quote, author, audioDuration, outputVideoPath) {
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
    let textFilter = '';
    
    // Add each line of the quote (center aligned)
    for (let i = 0; i < layout.lines.length; i++) {
      const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
      if (textFilter) textFilter += ',';
      textFilter += `drawtext=text='${layout.lines[i].replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`;
    }
    
    // Add author if provided (center aligned)
    if (author) {
      const authorY = textStartY + layout.topPadding + layout.quoteHeight + layout.spaceBetween;
      textFilter += `,drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`;
    }

    const args = [
      '-i', videoPath,
      '-t', audioDuration.toString(),
      '-vf', `scale=1080:${videoHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${videoStartY}:black,${textFilter}`,
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

// Style 5: Two-step approach with video/image support and TOP text placement
async function generateMediaWithTextTop(mediaPath, quote, author, audioDuration, outputPath, isVideo = false) {
  return new Promise((resolve, reject) => {
    // Calculate text layout
    const layout = calculateTextLayout(quote, author);
    
    // Calculate media dimensions to determine total group height
    const maxMediaHeight = 800; // Reasonable max height for media
    const mediaHeight = Math.min(maxMediaHeight, 1920 - layout.totalTextHeight - 100); // Leave some margin
    
    // Calculate total group height (text + media)
    const totalGroupHeight = layout.totalTextHeight + mediaHeight;
    
    // Center the entire group vertically (center of group at y=960)
    const groupStartY = (1920 - totalGroupHeight) / 2;
    const textStartY = groupStartY;
    const mediaStartY = groupStartY + layout.totalTextHeight;
    
    console.log(`Style 5 - Group height: ${totalGroupHeight}px, Group starts at: ${groupStartY}px, Text at: ${textStartY}px, Media at: ${mediaStartY}px`);
    
    // Build text filters - center aligned with adjusted positions
    let textFilter = '';
    
    // Add each line of the quote (center aligned)
    for (let i = 0; i < layout.lines.length; i++) {
      const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
      if (textFilter) textFilter += ',';
      textFilter += `drawtext=text='${layout.lines[i].replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`;
    }
    
    // Add author if provided (center aligned)
    if (author) {
      const authorY = textStartY + layout.topPadding + layout.quoteHeight + layout.spaceBetween;
      textFilter += `,drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`;
    }

    let args;
    if (isVideo) {
      // For video input - trim to audio duration and remove original audio
      args = [
        '-i', mediaPath,
        '-t', audioDuration.toString(),
        '-vf', `scale=1080:${mediaHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${mediaStartY}:black,${textFilter}`,
        '-c:v', 'libx264',
        '-an', // Remove audio from video
        '-y', outputPath
      ];
    } else {
      // For image input - create static image with text
      args = [
        '-i', mediaPath,
        '-vf', `scale=1080:${mediaHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${mediaStartY}:black,${textFilter}`,
        '-y', outputPath
      ];
    }

    console.log(`Generating ${isVideo ? 'video' : 'image'} with vertically centered text+media group...`);

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`${isVideo ? 'Video' : 'Image'} with vertically centered group generated successfully`);
        resolve(outputPath);
      } else {
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`${isVideo ? 'Video' : 'Image'} generation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Style 6: Single-step approach with video/image support and TOP text placement
async function createVideoStyle6(mediaPath, audioPath, quote, author, outputPath, isVideo = false) {
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
      const fadeInDuration = audioDuration * 0.75; // 75% fade in
      
      console.log(`Style 6 - Audio duration: ${audioDuration}s, Fade in: ${fadeInDuration}s`);

      // Calculate text layout
      const layout = calculateTextLayout(quote, author);
      
      // Calculate media dimensions to determine total group height
      const maxMediaHeight = 800; // Reasonable max height for media
      const mediaHeight = Math.min(maxMediaHeight, 1920 - layout.totalTextHeight - 100); // Leave some margin
      
      // Calculate total group height (text + media)
      const totalGroupHeight = layout.totalTextHeight + mediaHeight;
      
      // Center the entire group vertically (center of group at y=960)
      const groupStartY = (1920 - totalGroupHeight) / 2;
      const textStartY = groupStartY;
      const mediaStartY = groupStartY + layout.totalTextHeight;
      
      console.log(`Style 6 - Group height: ${totalGroupHeight}px, Group starts at: ${groupStartY}px, Text at: ${textStartY}px, Media at: ${mediaStartY}px`);
      
      // Build text filters - center aligned with adjusted positions
      let textFilter = '';
      
      // Add each line of the quote (center aligned)
      for (let i = 0; i < layout.lines.length; i++) {
        const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
        if (textFilter) textFilter += ',';
        textFilter += `drawtext=text='${layout.lines[i].replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`;
      }
      
      // Add author if provided (center aligned)
      if (author) {
        const authorY = textStartY + layout.topPadding + layout.quoteHeight + layout.spaceBetween;
        textFilter += `,drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`;
      }

      let args;
      if (isVideo) {
        // For video input - combine video with audio, trim to audio duration
        args = [
          '-i', mediaPath,
          '-i', audioPath,
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-t', audioDuration.toString(),
          '-pix_fmt', 'yuv420p',
          '-vf', `scale=1080:${mediaHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${mediaStartY}:black,fade=in:st=0:d=${fadeInDuration}:color=black,${textFilter}`,
          '-af', `afade=in:0:${fadeInDuration}`,
          '-y', outputPath
        ];
      } else {
        // For image input - loop image and combine with audio
        args = [
          '-loop', '1',
          '-i', mediaPath,
          '-i', audioPath,
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-t', audioDuration.toString(),
          '-pix_fmt', 'yuv420p',
          '-vf', `scale=1080:${mediaHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${mediaStartY}:black,fade=in:st=0:d=${fadeInDuration}:color=black,${textFilter}`,
          '-af', `afade=in:0:${fadeInDuration}`,
          '-y', outputPath
        ];
      }

      console.log('Style 6 FFmpeg command:', 'ffmpeg', args.join(' '));

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Style 6 video created successfully');
          resolve(outputPath);
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Style 6 FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Style 6 FFmpeg spawn error: ${error.message}`));
      });
    });
  });
}

// Step 1: Generate image with text overlays (TOP placement for Style 3)
async function generateImageWithTextTop(imagePath, quote, author, outputImagePath) {
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
    
    console.log(`Group height: ${totalGroupHeight}px, Group starts at: ${groupStartY}px, Text at: ${textStartY}px, Image at: ${imageStartY}px`);
    
    // Build text filters - center aligned with adjusted positions
    let textFilter = '';
    
    // Add each line of the quote (center aligned)
    for (let i = 0; i < layout.lines.length; i++) {
      const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
      if (textFilter) textFilter += ',';
      textFilter += `drawtext=text='${layout.lines[i].replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`;
    }
    
    // Add author if provided (center aligned)
    if (author) {
      const authorY = textStartY + layout.topPadding + layout.quoteHeight + layout.spaceBetween;
      textFilter += `,drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`;
    }

    const args = [
      '-i', imagePath,
      '-vf', `scale=1080:${imageHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${imageStartY}:black,${textFilter}`,
      '-y', outputImagePath
    ];

    console.log('Generating image with vertically centered text+image group...');

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('Image with vertically centered group generated successfully');
        resolve(outputImagePath);
      } else {
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`Image generation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Step 1: Generate image with text overlays (BOTTOM placement for Style 1)
async function generateImageWithText(imagePath, quote, author, outputImagePath) {
  return new Promise((resolve, reject) => {
    // Build text overlay filters
    let textFilter = `drawtext=text='${quote.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-400:shadowcolor=black:shadowx=3:shadowy=3`;
    
    if (author) {
      textFilter += `,drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-280:shadowcolor=black:shadowx=2:shadowy=2`;
    }

    const args = [
      '-i', imagePath,
      '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,${textFilter}`,
      '-y', outputImagePath
    ];

    console.log('Generating image with text...');
    console.log('FFmpeg command:', 'ffmpeg', args.join(' '));

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('Image with text generated successfully');
        resolve(outputImagePath);
      } else {
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`Image generation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

// Step 2: Create final video by combining video with text and audio (no fade)
async function createVideoWithoutFade(videoWithTextPath, audioPath, outputPath) {
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
      
      console.log(`Audio duration: ${audioDuration}s, No fade effects`);

      // Build FFmpeg command for final video without fade
      const args = [
        '-i', videoWithTextPath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', audioDuration.toString(),
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

// Step 2: Create video with fade animation from the generated image
async function createVideoWithFade(imageWithTextPath, audioPath, outputPath) {
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
      const fadeInDuration = audioDuration * 0.75; // 75% fade in
      
      console.log(`Audio duration: ${audioDuration}s, Fade in: ${fadeInDuration}s`);

      // Build FFmpeg command for video with fade
      const args = [
        '-loop', '1',
        '-i', imageWithTextPath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', audioDuration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', `fade=in:st=0:d=${fadeInDuration}:color=black`,
        '-af', `afade=in:0:${fadeInDuration}`,
        '-y', outputPath
      ];

      console.log('Creating video with fade animation...');
      console.log('FFmpeg command:', 'ffmpeg', args.join(' '));

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Video with fade created successfully');
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

// Style 5: Two-step approach with video input and TOP text placement (no fade)
async function createVideoStyle5(videoPath, audioPath, quote, author, outputPath) {
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
      console.log(`Style 5 - Audio duration: ${audioDuration}s, No fade effects`);

      try {
        // Step 1: Generate video with text overlays (TOP placement)
        const videoWithTextPath = path.join('temp', `${path.basename(outputPath, '.mp4')}-video-with-text.mp4`);
        await generateVideoWithTextTop(videoPath, quote, author || '', audioDuration, videoWithTextPath);

        // Step 2: Create final video without fade
        await createVideoWithoutFade(videoWithTextPath, audioPath, outputPath);

        // Cleanup intermediate video
        if (fs.existsSync(videoWithTextPath)) fs.unlinkSync(videoWithTextPath);

        console.log('Style 5 video created successfully');
        resolve(outputPath);
      } catch (error) {
        console.error('Style 5 Error:', error);
        reject(new Error(`Style 5 failed: ${error.message}`));
      }
    });
  });
}



// Style 4: Single-step approach with TOP text placement
async function createVideoStyle4(imagePath, audioPath, quote, author, outputPath) {
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
      const fadeInDuration = audioDuration * 0.75; // 75% fade in
      
      console.log(`Style 4 - Audio duration: ${audioDuration}s, Fade in: ${fadeInDuration}s`);

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
      
      console.log(`Style 4 - Group height: ${totalGroupHeight}px, Group starts at: ${groupStartY}px, Text at: ${textStartY}px, Image at: ${imageStartY}px`);
      
      // Build text filters - center aligned with adjusted positions
      let textFilter = '';
      
      // Add each line of the quote (center aligned)
      for (let i = 0; i < layout.lines.length; i++) {
        const lineY = textStartY + layout.topPadding + (i * layout.lineHeight);
        if (textFilter) textFilter += ',';
        textFilter += `drawtext=text='${layout.lines[i].replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`;
      }
      
      // Add author if provided (center aligned)
      if (author) {
        const authorY = textStartY + layout.topPadding + layout.quoteHeight + layout.spaceBetween;
        textFilter += `,drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=${layout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`;
      }

      // Build FFmpeg command with dynamic layout
      const args = [
        '-loop', '1',
        '-i', imagePath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', audioDuration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', `scale=1080:${imageHeight}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:${imageStartY}:black,fade=in:st=0:d=${fadeInDuration}:color=black,${textFilter}`,
        '-af', `afade=in:0:${fadeInDuration}`,
        '-y', outputPath
      ];

      console.log('Style 4 FFmpeg command:', 'ffmpeg', args.join(' '));

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Style 4 video created successfully');
          resolve(outputPath);
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Style 4 FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Style 4 FFmpeg spawn error: ${error.message}`));
      });
    });
  });
}

// Style 2: Original single-step approach (text + fade in one command)
async function createVideoStyle2(imagePath, audioPath, quote, author, outputPath) {
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
      const fadeInDuration = audioDuration * 0.75; // 75% fade in
      
      console.log(`Style 2 - Audio duration: ${audioDuration}s, Fade in: ${fadeInDuration}s`);

      // Build FFmpeg command (original approach)
      const args = [
        '-loop', '1',
        '-i', imagePath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', audioDuration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,fade=in:st=0:d=${fadeInDuration}:color=black,drawtext=text='${quote.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-400:shadowcolor=black:shadowx=3:shadowy=3${author ? `,drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=C\\\\:/Windows/Fonts/impact.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-280:shadowcolor=black:shadowx=2:shadowy=2` : ''}`,
        '-af', `afade=in:0:${fadeInDuration}`,
        '-y', outputPath
      ];

      console.log('Style 2 FFmpeg command:', 'ffmpeg', args.join(' '));

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Style 2 video created successfully');
          resolve(outputPath);
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Style 2 FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Style 2 FFmpeg spawn error: ${error.message}`));
      });
    });
  });
}

// Style 1 API endpoint (Two-step approach)
app.post('/create-video-style1', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  
  try {
    const { quote, author, imageUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, imagePath);
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Step 1: Generate image with text overlays
    const imageWithTextPath = path.join('temp', `${sessionId}-image-with-text.png`);
    await generateImageWithText(imagePath, quote, author || '', imageWithTextPath);

    // Step 2: Create video with fade animation
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoWithFade(imageWithTextPath, audioPath, outputPath);

    // Cleanup intermediate image
    if (fs.existsSync(imageWithTextPath)) fs.unlinkSync(imageWithTextPath);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: 'Style 1 video created successfully (Two-step approach)',
      style: 'Style 1'
    });

  } catch (error) {
    console.error('Style 1 Error:', error);
    
    // Cleanup on error
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Style 2 API endpoint (Single-step approach)
app.post('/create-video-style2', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  
  try {
    const { quote, author, imageUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, imagePath);
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using single-step approach
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoStyle2(imagePath, audioPath, quote, author || '', outputPath);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: 'Style 2 video created successfully (Single-step approach)',
      style: 'Style 2'
    });

  } catch (error) {
    console.error('Style 2 Error:', error);
    
    // Cleanup on error
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Style 3 API endpoint (Two-step approach with TOP text placement)
app.post('/create-video-style3', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  
  try {
    const { quote, author, imageUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, imagePath);
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Step 1: Generate image with text overlays (TOP placement)
    const imageWithTextPath = path.join('temp', `${sessionId}-image-with-text.png`);
    await generateImageWithTextTop(imagePath, quote, author || '', imageWithTextPath);

    // Step 2: Create video with fade animation
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoWithFade(imageWithTextPath, audioPath, outputPath);

    // Cleanup intermediate image
    if (fs.existsSync(imageWithTextPath)) fs.unlinkSync(imageWithTextPath);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: 'Style 3 video created successfully (Two-step approach with top text)',
      style: 'Style 3'
    });

  } catch (error) {
    console.error('Style 3 Error:', error);
    
    // Cleanup on error
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Style 4 API endpoint (Single-step approach with TOP text placement)
app.post('/create-video-style4', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  
  try {
    const { quote, author, imageUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, imagePath);
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using single-step approach (TOP text placement)
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoStyle4(imagePath, audioPath, quote, author || '', outputPath);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: 'Style 4 video created successfully (Single-step approach with top text)',
      style: 'Style 4'
    });

  } catch (error) {
    console.error('Style 4 Error:', error);
    
    // Cleanup on error
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Style 5 API endpoint (Two-step approach with video input and TOP text placement, no fade)
app.post('/create-video-style5', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let videoPath, audioPath;
  
  try {
    const { quote, author, videoUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle video input
    if (req.files && req.files.video) {
      videoPath = req.files.video[0].path;
    } else if (videoUrl) {
      videoPath = path.join('temp', `${sessionId}-video.mp4`);
      await downloadVideo(videoUrl, videoPath);
    } else {
      return res.status(400).json({ error: 'Video file or URL is required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using two-step approach (video input, TOP text placement, no fade)
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoStyle5(videoPath, audioPath, quote, author || '', outputPath);

    // Cleanup temp files
    if (videoUrl && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: 'Style 5 video created successfully (Two-step approach with video input, top text, no fade)',
      style: 'Style 5'
    });

  } catch (error) {
    console.error('Style 5 Error:', error);
    
    // Cleanup on error
    if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});



// Style 5 API endpoint (Two-step approach with video/image support and top text)
app.post('/create-video-style5', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let mediaPath, audioPath, isVideo = false;
  
  try {
    const { quote, author, imageUrl, videoUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle media input (image or video)
    if (req.files && req.files.video) {
      mediaPath = req.files.video[0].path;
      isVideo = true;
    } else if (req.files && req.files.image) {
      mediaPath = req.files.image[0].path;
      isVideo = false;
    } else if (videoUrl) {
      mediaPath = path.join('temp', `${sessionId}-video.mp4`);
      await downloadVideo(videoUrl, mediaPath);
      isVideo = true;
    } else if (imageUrl) {
      mediaPath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, mediaPath);
      isVideo = false;
    } else {
      return res.status(400).json({ error: 'Image or video required (file upload or URL)' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Get audio duration first
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
      try {
        if (code !== 0) {
          throw new Error('Failed to get audio duration');
        }

        const audioDuration = parseFloat(duration);

        // Step 1: Generate media with text overlays (TOP placement)
        const mediaWithTextPath = path.join('temp', `${sessionId}-media-with-text.${isVideo ? 'mp4' : 'png'}`);
        await generateMediaWithTextTop(mediaPath, quote, author || '', audioDuration, mediaWithTextPath, isVideo);

        // Step 2: Create final video with fade animation
        const outputPath = path.join('output', `${sessionId}-video.mp4`);
        await createVideoWithFade(mediaWithTextPath, audioPath, outputPath);

        // Cleanup intermediate media
        if (fs.existsSync(mediaWithTextPath)) fs.unlinkSync(mediaWithTextPath);

        // Cleanup temp files
        if ((imageUrl || videoUrl) && fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
        if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

        res.json({
          success: true,
          videoUrl: `/video/${sessionId}-video.mp4`,
          message: `Style 5 video created successfully (Two-step approach with ${isVideo ? 'video' : 'image'} and top text)`,
          style: 'Style 5',
          mediaType: isVideo ? 'video' : 'image'
        });
      } catch (error) {
        console.error('Style 5 Error:', error);
        
        // Cleanup on error
        if (mediaPath && fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
        if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        
        res.status(500).json({ error: error.message });
      }
    });

  } catch (error) {
    console.error('Style 5 Error:', error);
    
    // Cleanup on error
    if (mediaPath && fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Style 6 API endpoint (Single-step approach with video/image support and top text)
app.post('/create-video-style6', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let mediaPath, audioPath, isVideo = false;
  
  try {
    const { quote, author, imageUrl, videoUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle media input (image or video)
    if (req.files && req.files.video) {
      mediaPath = req.files.video[0].path;
      isVideo = true;
    } else if (req.files && req.files.image) {
      mediaPath = req.files.image[0].path;
      isVideo = false;
    } else if (videoUrl) {
      mediaPath = path.join('temp', `${sessionId}-video.mp4`);
      await downloadVideo(videoUrl, mediaPath);
      isVideo = true;
    } else if (imageUrl) {
      mediaPath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, mediaPath);
      isVideo = false;
    } else {
      return res.status(400).json({ error: 'Image or video required (file upload or URL)' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using single-step approach (TOP text placement with video/image support)
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoStyle6(mediaPath, audioPath, quote, author || '', outputPath, isVideo);

    // Cleanup temp files
    if ((imageUrl || videoUrl) && fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: `Style 6 video created successfully (Single-step approach with ${isVideo ? 'video' : 'image'} and top text)`,
      style: 'Style 6',
      mediaType: isVideo ? 'video' : 'image'
    });

  } catch (error) {
    console.error('Style 6 Error:', error);
    
    // Cleanup on error
    if (mediaPath && fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoint (defaults to Style 1)
app.post('/create-video', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  
  try {
    const { quote, author, imageUrl, audioUrl, instagramUrl } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, imagePath);
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      await downloadFile(audioUrl, audioPath);
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Step 1: Generate image with text overlays
    const imageWithTextPath = path.join('temp', `${sessionId}-image-with-text.png`);
    await generateImageWithText(imagePath, quote, author || '', imageWithTextPath);

    // Step 2: Create video with fade animation
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoWithFade(imageWithTextPath, audioPath, outputPath);

    // Cleanup intermediate image
    if (fs.existsSync(imageWithTextPath)) fs.unlinkSync(imageWithTextPath);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: 'Video created successfully (Style 1 - default)',
      style: 'Style 1 (default)'
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Cleanup on error
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Serve videos
app.get('/video/:filename', (req, res) => {
  const videoPath = path.join('output', req.params.filename);
  if (fs.existsSync(videoPath)) {
    res.sendFile(path.resolve(videoPath));
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'New Video Editor API is running' });
});

// Serve video-editor-app with proper MIME types
app.use('/editor', express.static('video-editor-app', {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`New Video Editor API running on port ${PORT}`);
  console.log(`Video Editor UI available at http://localhost:${PORT}/editor/`);
});