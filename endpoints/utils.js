const axios = require('axios');
const fs = require('fs');
const { spawn } = require('child_process');

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

// Smart file handler - handles both local files and URLs
async function handleFileSource(fileSource, outputPath) {
  if (!fileSource) {
    throw new Error('File source is required');
  }
  
  // Check if it's a URL
  if (fileSource.startsWith('http://') || fileSource.startsWith('https://')) {
    await downloadFile(fileSource, outputPath);
    return outputPath;
  } 
  // Check if it's a local file path
  else if (fs.existsSync(fileSource)) {
    // Copy local file to output path
    fs.copyFileSync(fileSource, outputPath);
    return outputPath;
  } 
  // Invalid path
  else {
    throw new Error(`File not found: ${fileSource}`);
  }
}

// Smart video handler - handles both local files and URLs
async function handleVideoSource(videoSource, outputPath) {
  if (!videoSource) {
    throw new Error('Video source is required');
  }
  
  // Check if it's a URL
  if (videoSource.startsWith('http://') || videoSource.startsWith('https://')) {
    await downloadVideo(videoSource, outputPath);
    return outputPath;
  } 
  // Check if it's a local file path
  else if (fs.existsSync(videoSource)) {
    // Copy local file to output path
    fs.copyFileSync(videoSource, outputPath);
    return outputPath;
  } 
  // Invalid path
  else {
    throw new Error(`Video file not found: ${videoSource}`);
  }
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

// Escape text for FFmpeg drawtext filter
// FFmpeg's drawtext filter uses special characters that need escaping
function escapeDrawtext(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')   // Backslash (must be first)
    .replace(/'/g, "\\'")      // Single quote
    .replace(/:/g, '\\:')      // Colon (parameter separator)
    .replace(/\[/g, '\\[')     // Left bracket
    .replace(/\]/g, '\\]')     // Right bracket
    .replace(/,/g, '\\,')      // Comma (filter separator)
    .replace(/;/g, '\\;');     // Semicolon (filter chain separator)
}

module.exports = {
  downloadFile,
  downloadVideo,
  extractInstagramAudio,
  calculateTextLayout,
  handleFileSource,
  handleVideoSource,
  escapeDrawtext
};