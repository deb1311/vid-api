const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import endpoint functions
const { generateImageWithText, createVideoWithFade } = require('./endpoints/style1');
const { createVideoStyle2 } = require('./endpoints/style2');
const { generateImageWithTextTop, createVideoWithFade: createVideoWithFadeStyle3 } = require('./endpoints/style3');
const { createVideoStyle4 } = require('./endpoints/style4');
const { createVideoVid1 } = require('./endpoints/vid-1');
const { createVideoVid12 } = require('./endpoints/vid-1.2');
const { downloadFile, downloadVideo, extractInstagramAudio } = require('./endpoints/utils');
const { handleMasterRequest, upload: masterUpload } = require('./endpoints/master');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to construct full URL
function getFullUrl(req, relativePath) {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  return `${protocol}://${host}${relativePath}`;
}

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

// Create directories
['uploads', 'temp', 'output'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure multer
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Style 1 API endpoint (Two-step approach with BOTTOM text placement)
app.post('/create-video-style1', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  
  try {
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
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
    await generateImageWithText(imagePath, quote, author || '', watermark || '', imageWithTextPath);

    // Step 2: Create video with fade animation
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoWithFade(imageWithTextPath, audioPath, outputPath, maxDuration);

    // Cleanup intermediate image
    if (fs.existsSync(imageWithTextPath)) fs.unlinkSync(imageWithTextPath);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Style 1 video created successfully (Two-step approach with bottom text)',
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

// Style 2 API endpoint (Single-step approach with BOTTOM text placement)
app.post('/create-video-style2', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  
  try {
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
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
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoStyle2(imagePath, audioPath, quote, author || '', watermark || '', outputPath, maxDuration);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Style 2 video created successfully (Single-step approach with bottom text)',
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
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
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
    await generateImageWithTextTop(imagePath, quote, author || '', watermark || '', imageWithTextPath);

    // Step 2: Create video with fade animation
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoWithFadeStyle3(imageWithTextPath, audioPath, outputPath, maxDuration);

    // Cleanup intermediate image
    if (fs.existsSync(imageWithTextPath)) fs.unlinkSync(imageWithTextPath);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
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
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
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
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoStyle4(imagePath, audioPath, quote, author || '', watermark || '', outputPath, maxDuration);

    // Cleanup temp files
    if (imageUrl && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
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

// Vid-1 API endpoint (Two-step approach with video input and TOP text placement, no fade)
app.post('/create-video-vid-1', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let videoPath, audioPath;
  
  try {
    const { quote, author, watermark, videoUrl, audioUrl, instagramUrl, duration } = req.body;
    
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
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoVid1(videoPath, audioPath, quote, author || '', watermark || '', outputPath, maxDuration);

    // Cleanup temp files
    if (videoUrl && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Vid-1 video created successfully (Two-step approach with video input, top text, no fade)',
      style: 'Vid-1'
    });

  } catch (error) {
    console.error('Vid-1 Error:', error);
    
    // Cleanup on error
    if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    res.status(500).json({ error: error.message });
  }
});

// Vid-1.2 API endpoint (Multi-clip approach with multiple video sources and TOP text placement, no fade)
app.post('/create-video-vid-1.2', upload.fields([
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const sessionId = uuidv4();
  let audioPath;
  
  try {
    const { quote, author, watermark, audioUrl, instagramUrl, duration, clips } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    if (!clips) {
      return res.status(400).json({ error: 'Clips array is required' });
    }

    // Parse clips if it's a string
    let parsedClips;
    try {
      parsedClips = typeof clips === 'string' ? JSON.parse(clips) : clips;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid clips format. Expected JSON array.' });
    }

    if (!Array.isArray(parsedClips) || parsedClips.length === 0) {
      return res.status(400).json({ error: 'Clips must be a non-empty array' });
    }

    // Validate clip format
    for (let i = 0; i < parsedClips.length; i++) {
      const clip = parsedClips[i];
      
      if (!clip.videoUrl && !clip.videourl && !clip.imageurl) {
        return res.status(400).json({ 
          error: `Clip ${i + 1} must have either 'videourl' or 'imageurl' property` 
        });
      }
      
      if (typeof clip.start !== 'number' || typeof clip.duration !== 'number') {
        return res.status(400).json({ 
          error: `Clip ${i + 1} must have numeric 'start' and 'duration' properties` 
        });
      }
      
      if (clip.start < 0 || clip.duration <= 0) {
        return res.status(400).json({ 
          error: `Clip ${i + 1} must have start >= 0 and duration > 0` 
        });
      }
      
      // Validate transition type if provided
      if (clip.transition && !['cut', 'fade', 'dissolve'].includes(clip.transition)) {
        return res.status(400).json({ 
          error: `Clip ${i + 1} has invalid transition. Use: cut, fade, or dissolve` 
        });
      }
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
      return res.status(400).json({ error: 'Audio required (instagramUrl, audioUrl, or audio file)' });
    }

    // Create video using multi-clip approach (multiple video sources, TOP text placement, no fade)
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoVid12(audioPath, quote, author || '', watermark || '', parsedClips, outputPath);

    // Cleanup temp files
    if (audioUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (instagramUrl && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Vid-1.2 video created successfully (Multi-clip approach with multiple video sources, top text, no fade)',
      style: 'Vid-1.2'
    });

  } catch (error) {
    console.error('Vid-1.2 Error:', error);
    
    // Cleanup on error
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

// Master endpoint - wrapper for all other endpoints
app.post('/master', masterUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), handleMasterRequest);

// Serve video editor interface
app.get('/editor/', (req, res) => {
  res.sendFile(path.resolve('video-editor-app/index.html'));
});

// Serve video editor static files with proper MIME types
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Modular Video Editor API is running' });
});

// Simple webhook proxy endpoint
app.post('/webhook-proxy', async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing webhookUrl in request body' 
      });
    }

    if (!payload) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing payload in request body' 
      });
    }

    console.log('🔗 Webhook proxy call to:', webhookUrl);
    console.log('📦 Payload keys:', Object.keys(payload));

    // Import axios for webhook calls
    const axios = require('axios');

    // Simple axios POST request
    const response = await axios({
      method: 'POST',
      url: webhookUrl,
      data: payload,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000,
      validateStatus: function (status) {
        // Accept any status code (don't throw on 4xx/5xx)
        return true;
      }
    });

    console.log('📥 Webhook response status:', response.status);
    console.log('📥 Webhook response data:', response.data);
    
    // Return the actual response from the webhook
    res.json({
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      data: response.data,
      message: response.status >= 200 && response.status < 300 ? 'Webhook called successfully' : 'Webhook returned error status'
    });

  } catch (error) {
    console.error('❌ Webhook proxy error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Modular Video Editor API running on port ${PORT}`);
});