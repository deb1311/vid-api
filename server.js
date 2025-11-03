const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Add CORS support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Create necessary directories
const dirs = ['uploads', 'temp', 'output', 'public'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Download file from URL with better error handling
async function downloadFile(url, filepath) {
  try {
    console.log(`Downloading file from: ${url}`);
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`File downloaded successfully: ${filepath}`);
        resolve();
      });
      writer.on('error', (error) => {
        console.error(`Download error: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

// Generate a silent audio file as fallback
async function generateSilentAudio(outputPath, duration = 10) {
  const command = `ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${duration} -c:a mp3 -y "${outputPath}"`;
  console.log(`Generating silent audio: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('Silent audio generated successfully');
    return outputPath;
  } catch (error) {
    console.error('Failed to generate silent audio:', error);
    throw error;
  }
}

// Check if URL is an Instagram reel
function isInstagramReel(url) {
  return url.includes('instagram.com') && (url.includes('/reel/') || url.includes('/p/'));
}

// Extract audio from Instagram reel using yt-dlp with multiple strategies
async function extractInstagramAudio(instagramUrl, outputPath) {
  const strategies = [
    // Strategy 1: Basic extraction with verbose output
    `yt-dlp -x --audio-format mp3 --audio-quality 0 --verbose -o "${outputPath}" "${instagramUrl}"`,
    // Strategy 2: With updated user agent and headers
    `yt-dlp -x --audio-format mp3 --audio-quality 0 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15" --add-header "Accept-Language:en-US,en;q=0.9" -o "${outputPath}" "${instagramUrl}"`,
    // Strategy 3: Force format and ignore errors
    `yt-dlp -x --audio-format mp3 --audio-quality 0 --ignore-errors --no-warnings -o "${outputPath}" "${instagramUrl}"`,
    // Strategy 4: Use different extractor options
    `yt-dlp -x --audio-format mp3 --audio-quality 0 --extractor-args "instagram:variant=mobile" -o "${outputPath}" "${instagramUrl}"`,
    // Strategy 5: Try with cookies simulation
    `yt-dlp -x --audio-format mp3 --audio-quality 0 --add-header "Cookie: sessionid=dummy" -o "${outputPath}" "${instagramUrl}"`
  ];

  console.log('=== INSTAGRAM AUDIO EXTRACTION ===');
  console.log('Instagram URL:', instagramUrl);
  console.log('Output path:', outputPath);
  console.log('yt-dlp version check...');
  
  // Check yt-dlp version
  try {
    const { stdout: version } = await execAsync('yt-dlp --version');
    console.log('yt-dlp version:', version.trim());
  } catch (error) {
    console.log('Could not get yt-dlp version:', error.message);
  }

  for (let i = 0; i < strategies.length; i++) {
    const command = strategies[i];
    console.log(`\n--- Trying strategy ${i + 1} ---`);
    console.log(`Command: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2 minute timeout
      
      console.log(`Strategy ${i + 1} completed`);
      if (stdout) console.log(`STDOUT: ${stdout.substring(0, 500)}...`);
      if (stderr) console.log(`STDERR: ${stderr.substring(0, 500)}...`);

      // Check for extracted file with more thorough search
      const tempDir = path.dirname(outputPath);
      const baseName = path.basename(outputPath, '.mp3');
      
      const possiblePaths = [
        outputPath + '.mp3',
        outputPath,
        outputPath.replace('.mp3', '') + '.mp3',
        path.join(tempDir, baseName + '.mp3'),
        path.join(tempDir, baseName + '.m4a'),
        path.join(tempDir, baseName + '.webm')
      ];

      console.log('Checking for extracted files...');
      for (const possiblePath of possiblePaths) {
        console.log(`Checking: ${possiblePath}`);
        if (fs.existsSync(possiblePath)) {
          const stats = fs.statSync(possiblePath);
          console.log(`✅ Found audio file: ${possiblePath} (${stats.size} bytes)`);
          
          // Convert to MP3 if it's not already
          if (!possiblePath.endsWith('.mp3')) {
            const mp3Path = possiblePath.replace(/\.[^.]+$/, '.mp3');
            console.log(`Converting to MP3: ${mp3Path}`);
            await execAsync(`ffmpeg -i "${possiblePath}" -acodec mp3 -y "${mp3Path}"`);
            if (fs.existsSync(mp3Path)) {
              fs.unlinkSync(possiblePath); // Remove original
              return path.resolve(mp3Path);
            }
          }
          
          return path.resolve(possiblePath);
        }
      }
      
      console.log('No audio file found after extraction');
    } catch (error) {
      console.log(`Strategy ${i + 1} failed: ${error.message}`);
      if (error.message.includes('timeout')) {
        console.log('Strategy timed out, trying next...');
      }
      continue;
    }
  }

  console.log('All Instagram extraction strategies failed');
  throw new Error('All Instagram extraction strategies failed. The post might be private, deleted, or require manual authentication.');
}

// Create video with image, quote, and audio
async function createVideo(imagePath, audioPath, quote, author, outputPath) {
  return new Promise((resolve, reject) => {
    // Verify files exist before processing
    if (!fs.existsSync(imagePath)) {
      reject(new Error(`Image file not found: ${imagePath}`));
      return;
    }

    if (!fs.existsSync(audioPath)) {
      reject(new Error(`Audio file not found: ${audioPath}`));
      return;
    }

    // Get audio duration first
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err);
        reject(new Error(`Failed to analyze audio file: ${err.message}`));
        return;
      }

      if (!metadata.format || !metadata.format.duration) {
        reject(new Error('Could not determine audio duration'));
        return;
      }

      const audioDuration = parseFloat(metadata.format.duration);
      const fadeInDuration = audioDuration * 0.40; // 40% of total time for fade in

      console.log(`Audio file: ${audioPath}`);
      console.log(`Audio duration: ${audioDuration}s, Fade in duration: ${fadeInDuration}s`);
      console.log('Audio metadata:', JSON.stringify(metadata, null, 2));

      // Build video filters array
      const videoFilters = [
        // Scale image to fill most of the vertical space while maintaining aspect ratio
        'scale=1080:1400:force_original_aspect_ratio=decrease',
        // Center the scaled image and add black bars top/bottom
        'pad=1080:1920:(ow-iw)/2:260:black',
        // Add fade in only (40% of total time)
        `fade=in:0:${Math.round(fadeInDuration * 30)}`
      ];

      // Determine font path for Linux container
      let fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
      if (!fs.existsSync(fontPath)) {
        fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
        if (!fs.existsSync(fontPath)) {
          fontPath = 'arial'; // Fallback to system font
        }
      }

      // Add quote text with drop shadow if quote is provided
      if (quote && quote.trim()) {
        const quoteText = `"${quote.replace(/'/g, "\\'")}"`;
        videoFilters.push(
          `drawtext=text='${quoteText}':fontfile=${fontPath}:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-400:enable='between(t,0.5,${audioDuration})':shadowcolor=black:shadowx=3:shadowy=3:line_spacing=10`
        );
      }

      // Add author attribution with drop shadow
      if (author) {
        videoFilters.push(
          `drawtext=text='${author.replace(/'/g, "\\'")}':fontfile=${fontPath}:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-280:enable='between(t,0.5,${audioDuration})':shadowcolor=black:shadowx=2:shadowy=2`
        );
      }

      // Normalize paths for Windows
      const normalizedImagePath = path.resolve(imagePath);
      const normalizedAudioPath = path.resolve(audioPath);
      const normalizedOutputPath = path.resolve(outputPath);

      console.log('Normalized paths:');
      console.log('Image:', normalizedImagePath);
      console.log('Audio:', normalizedAudioPath);
      console.log('Output:', normalizedOutputPath);

      // Build video filter with proper font path
      const videoFilterString = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,fade=in:0:${Math.round(fadeInDuration * 30)}`;

      // Add text overlays to the video filter with Linux font path if quote exists
      let textFilter = '';
      if (quote && quote.trim()) {
        const quoteText2 = `"${quote.replace(/'/g, "\\'").replace(/"/g, '\\"')}"`;
        textFilter = `,drawtext=text='${quoteText2}':fontfile=${fontPath}:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-400:shadowcolor=black:shadowx=3:shadowy=3`;
      }

      let authorFilter = '';
      if (author) {
        authorFilter = `,drawtext=text='${author.replace(/'/g, "\\'").replace(/"/g, '\\"')}':fontfile=${fontPath}:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-280:shadowcolor=black:shadowx=2:shadowy=2`;
      }

      const fullVideoFilter = videoFilterString + textFilter + authorFilter;

      // Add audio fade back - but with proper duration format
      const audioFadeFilter = `afade=in:0:${fadeInDuration}`;

      // SIMPLEST POSSIBLE COMMAND - just like the working manual one
      const ffmpegCmd = `ffmpeg -loop 1 -i "${normalizedImagePath}" -i "${normalizedAudioPath}" -c:v libx264 -c:a aac -t ${audioDuration} -pix_fmt yuv420p -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" -y "${normalizedOutputPath}"`;

      console.log('=== DIRECT FFMPEG COMMAND ===');
      console.log(ffmpegCmd);
      console.log('=============================');

      // Write command to batch file for debugging
      const batchFile = `debug-command.bat`;
      fs.writeFileSync(batchFile, ffmpegCmd);
      console.log(`Command written to ${batchFile}`);

      // Build complete video filter with text overlays and fade
      let videoFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,fade=in:0:${Math.round(fadeInDuration * 30)}`;

      // Add quote text with Linux font path if quote exists
      if (quote && quote.trim()) {
        const quoteText3 = `"${quote.replace(/'/g, "\\'").replace(/"/g, '\\"')}"`;
        videoFilter += `,drawtext=text='${quoteText3}':fontfile=${fontPath}:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-400:shadowcolor=black:shadowx=3:shadowy=3`;
      }

      // Add author if provided
      if (author) {
        videoFilter += `,drawtext=text='${author.replace(/'/g, "\\'").replace(/"/g, '\\"')}':fontfile=${fontPath}:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-280:shadowcolor=black:shadowx=2:shadowy=2`;
      }

      // Try using spawn instead of exec to avoid command parsing issues
      const args = [
        '-loop', '1',
        '-i', normalizedImagePath,
        '-i', normalizedAudioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-t', audioDuration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', videoFilter,
        '-af', `afade=in:0:${fadeInDuration}`,
        '-y', normalizedOutputPath
      ];

      console.log('FFmpeg args:', args);

      const ffmpegProcess = spawn('ffmpeg', args);
      let stdout = '';
      let stderr = '';

      ffmpegProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log('FFmpeg completed successfully');
          console.log('FFmpeg stdout:', stdout);
          if (stderr) console.log('FFmpeg stderr:', stderr);
          resolve(normalizedOutputPath);
        } else {
          console.error('FFmpeg failed with code:', code);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg failed with exit code ${code}`));
        }
      });

      ffmpegProcess.on('error', (error) => {
        console.error('FFmpeg spawn error:', error);
        reject(new Error(`FFmpeg spawn failed: ${error.message}`));
      });
    });
  });
}

// API endpoint to create video
app.post('/create-video', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { quote, author, imageUrl, audioUrl, instagramUrl } = req.body;

    let imagePath, audioPath;
    const sessionId = uuidv4();
    let tempAudioPath = null;

    // Handle image input (file upload or URL)
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = path.join('temp', `${sessionId}-image.jpg`);
      await downloadFile(imageUrl, imagePath);
    } else {
      return res.status(400).json({ error: 'Image file or URL is required' });
    }

    // Handle audio input (file upload, URL, or Instagram reel)
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl && isInstagramReel(instagramUrl)) {
      // Extract audio from Instagram reel
      tempAudioPath = path.join('temp', `${sessionId}-instagram-audio`);
      try {
        audioPath = await extractInstagramAudio(instagramUrl, tempAudioPath);
      } catch (error) {
        console.log('Instagram audio extraction failed, generating silent audio as fallback');
        audioPath = path.join('temp', `${sessionId}-silent-audio.mp3`);
        await generateSilentAudio(audioPath, 10);
      }
    } else if (audioUrl) {
      audioPath = path.join('temp', `${sessionId}-audio.mp3`);
      try {
        await downloadFile(audioUrl, audioPath);
      } catch (error) {
        console.log('Audio download failed, generating silent audio as fallback');
        audioPath = path.join('temp', `${sessionId}-silent-audio.mp3`);
        await generateSilentAudio(audioPath, 10);
      }
    } else {
      // Generate silent audio as default
      console.log('No audio provided, generating silent audio');
      audioPath = path.join('temp', `${sessionId}-silent-audio.mp3`);
      await generateSilentAudio(audioPath, 10);
    }

    // Create output video
    const outputPath = path.join('output', `${sessionId}-video.mp4`);

    console.log('=== BEFORE VIDEO CREATION ===');
    console.log('Image path:', imagePath, 'exists:', fs.existsSync(imagePath));
    console.log('Audio path:', audioPath, 'exists:', fs.existsSync(audioPath));
    if (fs.existsSync(audioPath)) {
      const stats = fs.statSync(audioPath);
      console.log('Audio file size:', stats.size, 'bytes');
    }

    await createVideo(imagePath, audioPath, quote, author, outputPath);

    // Clean up temporary files AFTER video creation
    if (imageUrl && fs.existsSync(imagePath)) {
      console.log('Cleaning up image:', imagePath);
      fs.unlinkSync(imagePath);
    }
    if (audioUrl && fs.existsSync(audioPath)) {
      console.log('Cleaning up audio URL file:', audioPath);
      fs.unlinkSync(audioPath);
    }
    // Temporarily disable cleanup to debug audio issue
    // if (instagramUrl && fs.existsSync(audioPath)) {
    //   console.log('Cleaning up Instagram audio file:', audioPath);
    //   fs.unlinkSync(audioPath);
    // }

    res.json({
      success: true,
      videoUrl: `/video/${sessionId}-video.mp4`,
      message: 'Video created successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create video' });
  }
});

// Serve generated videos
app.get('/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join('output', filename);

  if (fs.existsSync(videoPath)) {
    res.sendFile(path.resolve(videoPath));
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

// Vid-1.2 endpoint - Multi-clip with transitions
app.post('/vid-1.2', async (req, res) => {
  try {
    const { audioUrl, quote, author, watermark, clips } = req.body;
    
    if (!audioUrl || !clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: audioUrl and clips array' 
      });
    }

    const sessionId = uuidv4();
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const audioPath = path.join('temp', `${sessionId}-instagram-audio.mp3`);

    // Import the vid-1.2 function
    const { createVideoVid12 } = require('./endpoints/vid-1.2');

    // Handle audio - local file, Instagram URL, or direct URL
    if (audioUrl.startsWith('temp/') || audioUrl.startsWith('uploads/')) {
      // Local file - copy to temp location
      console.log('Vid-1.2: Using local audio file...');
      if (fs.existsSync(audioUrl)) {
        fs.copyFileSync(audioUrl, audioPath);
      } else {
        throw new Error(`Local audio file not found: ${audioUrl}`);
      }
    } else if (audioUrl.includes('instagram.com')) {
      // Instagram URL - download using server function
      console.log('Vid-1.2: Downloading audio from Instagram...');
      try {
        audioPath = await extractInstagramAudio(audioUrl, audioPath.replace('.mp3', ''));
      } catch (error) {
        console.log('Instagram extraction failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    } else {
      // Direct audio URL - download
      console.log('Vid-1.2: Downloading direct audio URL...');
      try {
        await downloadFile(audioUrl, audioPath);
      } catch (error) {
        console.log('Direct audio download failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    }

    // Create video with transitions
    await createVideoVid12(audioPath, quote, author, watermark, clips, outputPath);

    // Cleanup audio file
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      message: 'Vid-1.2 video created successfully with transitions',
      videoUrl: `/video/${path.basename(outputPath)}`,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Vid-1.2 Error:', error);
    res.status(500).json({
      error: 'Failed to create vid-1.2 video',
      details: error.message
    });
  }
});

// Vid-1.3 endpoint - Multi-clip with smart aspect ratio management
app.post('/vid-1.3', async (req, res) => {
  try {
    const { audioUrl, quote, author, watermark, clips, captions, overlay = false } = req.body;
    
    // Validate required fields - either quote or captions must be provided
    if (!audioUrl || !clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: audioUrl and clips array' 
      });
    }
    
    if (!quote && (!captions || !Array.isArray(captions) || captions.length === 0)) {
      return res.status(400).json({ 
        error: 'Either quote or captions array must be provided' 
      });
    }

    const sessionId = uuidv4();
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const audioPath = path.join('temp', `${sessionId}-instagram-audio.mp3`);

    // Import the vid-1.3 function
    const { createVideoVid13 } = require('./endpoints/vid-1.3');

    // Handle audio - local file, Instagram URL, or direct URL
    if (audioUrl.startsWith('temp/') || audioUrl.startsWith('uploads/')) {
      // Local file - copy to temp location
      console.log('Vid-1.3: Using local audio file...');
      if (fs.existsSync(audioUrl)) {
        fs.copyFileSync(audioUrl, audioPath);
      } else {
        throw new Error(`Local audio file not found: ${audioUrl}`);
      }
    } else if (audioUrl.includes('instagram.com')) {
      // Instagram URL - download using server function
      console.log('Vid-1.3: Downloading audio from Instagram...');
      try {
        audioPath = await extractInstagramAudio(audioUrl, audioPath.replace('.mp3', ''));
      } catch (error) {
        console.log('Instagram extraction failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    } else {
      // Direct audio URL - download
      console.log('Vid-1.3: Downloading direct audio URL...');
      try {
        await downloadFile(audioUrl, audioPath);
      } catch (error) {
        console.log('Direct audio download failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    }

    // Create video with smart aspect ratio management and overlay support
    await createVideoVid13(audioPath, quote, author, watermark, clips, captions, outputPath, overlay);

    // Cleanup audio file
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      message: `Vid-1.3 video created successfully with smart aspect ratio${overlay ? ' and overlay' : ''}`,
      videoUrl: `/video/${path.basename(outputPath)}`,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Vid-1.3 Error:', error);
    res.status(500).json({
      error: 'Failed to create vid-1.3 video',
      details: error.message
    });
  }
});

// Vid-1.4 endpoint - Multi-clip with timed captions (no quote parameter)
app.post('/vid-1.4', async (req, res) => {
  try {
    const { audioUrl, captions, watermark, clips, overlay = false } = req.body;
    
    // Validate required fields
    if (!audioUrl || !clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: audioUrl and clips array' 
      });
    }

    const sessionId = uuidv4();
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const audioPath = path.join('temp', `${sessionId}-instagram-audio.mp3`);

    // Import the vid-1.4 function
    const { createVideoVid14 } = require('./endpoints/vid-1.4');

    // Handle audio - local file, Instagram URL, or direct URL
    if (audioUrl.startsWith('temp/') || audioUrl.startsWith('uploads/')) {
      // Local file - copy to temp location
      console.log('Vid-1.4: Using local audio file...');
      if (fs.existsSync(audioUrl)) {
        fs.copyFileSync(audioUrl, audioPath);
      } else {
        throw new Error(`Local audio file not found: ${audioUrl}`);
      }
    } else if (audioUrl.includes('instagram.com')) {
      // Instagram URL - download using server function
      console.log('Vid-1.4: Downloading audio from Instagram...');
      try {
        audioPath = await extractInstagramAudio(audioUrl, audioPath.replace('.mp3', ''));
      } catch (error) {
        console.log('Instagram extraction failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    } else {
      // Direct audio URL - download
      console.log('Vid-1.4: Downloading direct audio URL...');
      try {
        await downloadFile(audioUrl, audioPath);
      } catch (error) {
        console.log('Direct audio download failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    }

    // Create video with timed captions and overlay support
    await createVideoVid14(audioPath, captions, watermark, clips, outputPath, overlay);

    // Cleanup audio file
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      message: `Vid-1.4 video created successfully with timed captions${overlay ? ' and overlay' : ''}`,
      videoUrl: `/video/${path.basename(outputPath)}`,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Vid-1.4 Error:', error);
    res.status(500).json({
      error: 'Failed to create vid-1.4 video',
      details: error.message
    });
  }
});

// Vid-1.5 endpoint - Multi-clip with timed captions and overlay support
app.post('/vid-1.5', async (req, res) => {
  try {
    const { audioUrl, captions, watermark, clips, overlay = false } = req.body;
    
    // Validate required fields
    if (!audioUrl || !clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: audioUrl and clips array' 
      });
    }

    const sessionId = uuidv4();
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const audioPath = path.join('temp', `${sessionId}-instagram-audio.mp3`);

    // Import the vid-1.5 function
    const { createVideoVid15 } = require('./endpoints/vid-1.5');

    // Handle audio - local file, Instagram URL, or direct URL
    if (audioUrl.startsWith('temp/') || audioUrl.startsWith('uploads/')) {
      // Local file - copy to temp location
      console.log('Vid-1.5: Using local audio file...');
      if (fs.existsSync(audioUrl)) {
        fs.copyFileSync(audioUrl, audioPath);
      } else {
        throw new Error(`Local audio file not found: ${audioUrl}`);
      }
    } else if (audioUrl.includes('instagram.com')) {
      // Instagram URL - download using server function
      console.log('Vid-1.5: Downloading audio from Instagram...');
      try {
        audioPath = await extractInstagramAudio(audioUrl, audioPath.replace('.mp3', ''));
      } catch (error) {
        console.log('Instagram extraction failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    } else {
      // Direct audio URL - download
      console.log('Vid-1.5: Downloading direct audio URL...');
      try {
        await downloadFile(audioUrl, audioPath);
      } catch (error) {
        console.log('Direct audio download failed, generating silent audio');
        await generateSilentAudio(audioPath, 10);
      }
    }

    // Create video with timed captions and overlay support
    await createVideoVid15(audioPath, captions, watermark, clips, outputPath, overlay);

    // Cleanup audio file
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      message: `Vid-1.5 video created successfully with timed captions${overlay ? ' and overlay' : ''}`,
      videoUrl: `/video/${path.basename(outputPath)}`,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Vid-1.5 Error:', error);
    res.status(500).json({
      error: 'Failed to create vid-1.5 video',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Video Editor API is running' });
});

// Webhook proxy endpoint to bypass CORS issues
app.post('/webhook-proxy', async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    
    if (!webhookUrl || !payload) {
      return res.status(400).json({ 
        error: 'Missing webhookUrl or payload in request body' 
      });
    }

    console.log('🔗 Proxying webhook call to:', webhookUrl);
    console.log('📦 Payload:', payload);

    // Make the webhook call from the server (no CORS issues)
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Video-Editor-API/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('✅ Webhook call successful:', response.status);
    
    // Return success response to the client
    res.json({
      success: true,
      status: response.status,
      message: 'Webhook called successfully',
      response: response.data || 'No response body'
    });

  } catch (error) {
    console.error('❌ Webhook proxy error:', error.message);
    
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      statusCode = error.response.status;
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      if (error.response.data) {
        errorMessage += ` - ${JSON.stringify(error.response.data)}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from webhook URL';
      statusCode = 408; // Request Timeout
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.code || 'Unknown error'
    });
  }
});

// Debug endpoint for Instagram audio extraction
app.post('/debug-instagram', async (req, res) => {
  try {
    const { instagramUrl } = req.body;
    
    if (!instagramUrl) {
      return res.status(400).json({ error: 'Instagram URL is required' });
    }
    
    const sessionId = uuidv4();
    const outputPath = path.join('temp', `${sessionId}-debug-audio`);
    
    console.log('=== DEBUG INSTAGRAM EXTRACTION ===');
    console.log('URL:', instagramUrl);
    console.log('Output:', outputPath);
    
    try {
      const audioPath = await extractInstagramAudio(instagramUrl, outputPath);
      
      if (fs.existsSync(audioPath)) {
        const stats = fs.statSync(audioPath);
        res.json({
          success: true,
          message: 'Instagram audio extracted successfully',
          audioPath: audioPath,
          fileSize: stats.size,
          url: `/temp-audio/${path.basename(audioPath)}`
        });
      } else {
        res.json({
          success: false,
          message: 'Audio extraction completed but file not found'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: 'Instagram extraction failed',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve temporary audio files for debugging
app.get('/temp-audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const audioPath = path.join('temp', filename);
  
  if (fs.existsSync(audioPath)) {
    res.sendFile(path.resolve(audioPath));
  } else {
    res.status(404).json({ error: 'Audio file not found' });
  }
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

// Serve demo.html
app.get('/demo', (req, res) => {
  res.sendFile(path.resolve('demo.html'));
});

app.listen(PORT, () => {
  console.log(`Video Editor API running on port ${PORT}`);
  console.log(`Video Editor UI available at http://localhost:${PORT}/editor/`);
});