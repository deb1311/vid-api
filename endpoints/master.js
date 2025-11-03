const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Import all endpoint functions
const { generateImageWithText, createVideoWithFade } = require('./style1');
const { createVideoStyle2 } = require('./style2');
const { generateImageWithTextTop, createVideoWithFade: createVideoWithFadeStyle3 } = require('./style3');
const { createVideoStyle4 } = require('./style4');
const { createVideoVid1 } = require('./vid-1');
const { createVideoVid12 } = require('./vid-1.2');
const { createVideoVid13 } = require('./vid-1.3');
const { createVideoVid14 } = require('./vid-1.4');
const { createVideoVid15 } = require('./vid-1.5');
const { downloadFile, downloadVideo, extractInstagramAudio } = require('./utils');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Helper function to construct full URL
function getFullUrl(req, relativePath) {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  return `${protocol}://${host}${relativePath}`;
}

// Helper function to handle file paths (local or URL)
async function handleFilePath(fileUrl, sessionId, fileType, tempFileName) {
  if (!fileUrl) return null;
  
  // Check if it's a URL
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const tempPath = path.join('temp', `${sessionId}-${tempFileName}`);
    if (fileType === 'video') {
      await downloadVideo(fileUrl, tempPath);
    } else {
      await downloadFile(fileUrl, tempPath);
    }
    return tempPath;
  } 
  // Check if it's a local file path
  else if (fs.existsSync(fileUrl)) {
    return fileUrl;
  } 
  // Invalid path
  else {
    throw new Error(`${fileType} file not found: ${fileUrl}`);
  }
}

// Master endpoint function
async function handleMasterRequest(req, res) {
  const { endpoint, data } = req.body;
  
  if (!endpoint) {
    return res.status(400).json({ 
      status: 'error', 
      error: 'Master endpoint error: "endpoint" parameter is required' 
    });
  }
  
  if (!data) {
    return res.status(400).json({ 
      status: 'error', 
      error: 'Master endpoint error: "data" parameter is required' 
    });
  }

  try {
    // Create a new request object with the data, preserving original request methods
    const mockReq = {
      body: data,
      files: req.files || {},
      get: req.get.bind(req),
      protocol: req.protocol,
      headers: req.headers
    };

    // Create a response handler that captures the response
    let responseData = null;
    let statusCode = 200;
    
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return mockRes;
      },
      json: (data) => {
        responseData = data;
        return mockRes;
      }
    };

    // Route to the appropriate endpoint
    switch (endpoint.toLowerCase()) {
      case 'style1':
      case 'create-video-style1':
        await handleStyle1(mockReq, mockRes);
        break;
        
      case 'style2':
      case 'create-video-style2':
        await handleStyle2(mockReq, mockRes);
        break;
        
      case 'style3':
      case 'create-video-style3':
        await handleStyle3(mockReq, mockRes);
        break;
        
      case 'style4':
      case 'create-video-style4':
        await handleStyle4(mockReq, mockRes);
        break;
        
      case 'vid-1':
      case 'create-video-vid-1':
        await handleVid1(mockReq, mockRes);
        break;
        
      case 'vid-1.2':
      case 'create-video-vid-1.2':
        await handleVid12(mockReq, mockRes);
        break;
        
      case 'vid-1.3':
      case 'create-video-vid-1.3':
        await handleVid13(mockReq, mockRes);
        break;
        
      case 'vid-1.4':
      case 'create-video-vid-1.4':
        await handleVid14(mockReq, mockRes);
        break;
        
      case 'vid-1.5':
      case 'create-video-vid-1.5':
        await handleVid15(mockReq, mockRes);
        break;
        
      default:
        return res.status(400).json({ 
          status: 'error', 
          error: `Master endpoint error: Unknown endpoint "${endpoint}". Available endpoints: style1, style2, style3, style4, vid-1, vid-1.2, vid-1.3, vid-1.4, vid-1.5` 
        });
    }

    // Return the response with status and url format
    if (responseData) {
      if (statusCode === 200 && responseData.success && responseData.videoUrl) {
        // Use the videoUrl as-is since it's already a full URL from the handlers
        return res.json({
          status: 'success',
          url: responseData.videoUrl
        });
      } else {
        return res.status(statusCode).json({
          status: 'error',
          error: `Master endpoint error (${endpoint}): ${responseData.error || JSON.stringify(responseData)}`
        });
      }
    } else {
      return res.status(500).json({
        status: 'error',
        error: `Master endpoint error (${endpoint}): No response received from endpoint`
      });
    }

  } catch (error) {
    console.error(`Master endpoint error (${endpoint}):`, error);
    return res.status(500).json({
      status: 'error',
      error: `Master endpoint error (${endpoint}): ${error.message}`
    });
  }
}

// Style 1 handler with fixed file handling
async function handleStyle1(req, res) {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  let tempImagePath = null, tempAudioPath = null;
  
  try {
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = await handleFilePath(imageUrl, sessionId, 'image', 'image.jpg');
      if (imageUrl.startsWith('http')) tempImagePath = imagePath;
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
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
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Style 1 video created successfully (Two-step approach with bottom text)',
      style: 'Style 1'
    });

  } catch (error) {
    console.error('Style 1 Error:', error);
    
    // Cleanup on error
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Style 2 handler with fixed file handling
async function handleStyle2(req, res) {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  let tempImagePath = null, tempAudioPath = null;
  
  try {
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = await handleFilePath(imageUrl, sessionId, 'image', 'image.jpg');
      if (imageUrl.startsWith('http')) tempImagePath = imagePath;
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using single-step approach
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoStyle2(imagePath, audioPath, quote, author || '', watermark || '', outputPath, maxDuration);

    // Cleanup temp files
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Style 2 video created successfully (Single-step approach with bottom text)',
      style: 'Style 2'
    });

  } catch (error) {
    console.error('Style 2 Error:', error);
    
    // Cleanup on error
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Style 3 handler with fixed file handling
async function handleStyle3(req, res) {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  let tempImagePath = null, tempAudioPath = null;
  
  try {
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = await handleFilePath(imageUrl, sessionId, 'image', 'image.jpg');
      if (imageUrl.startsWith('http')) tempImagePath = imagePath;
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
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
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Style 3 video created successfully (Two-step approach with top text)',
      style: 'Style 3'
    });

  } catch (error) {
    console.error('Style 3 Error:', error);
    
    // Cleanup on error
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Style 4 handler with fixed file handling
async function handleStyle4(req, res) {
  const sessionId = uuidv4();
  let imagePath, audioPath;
  let tempImagePath = null, tempAudioPath = null;
  
  try {
    const { quote, author, watermark, imageUrl, audioUrl, instagramUrl, duration } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle image
    if (req.files && req.files.image) {
      imagePath = req.files.image[0].path;
    } else if (imageUrl) {
      imagePath = await handleFilePath(imageUrl, sessionId, 'image', 'image.jpg');
      if (imageUrl.startsWith('http')) tempImagePath = imagePath;
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using single-step approach (TOP text placement)
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoStyle4(imagePath, audioPath, quote, author || '', watermark || '', outputPath, maxDuration);

    // Cleanup temp files
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Style 4 video created successfully (Single-step approach with top text)',
      style: 'Style 4'
    });

  } catch (error) {
    console.error('Style 4 Error:', error);
    
    // Cleanup on error
    if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Vid-1 handler with fixed file handling
async function handleVid1(req, res) {
  const sessionId = uuidv4();
  let videoPath, audioPath;
  let tempVideoPath = null, tempAudioPath = null;
  
  try {
    const { quote, author, watermark, videoUrl, audioUrl, instagramUrl, duration } = req.body;
    
    if (!quote) {
      return res.status(400).json({ error: 'Quote is required' });
    }

    // Handle video input
    if (req.files && req.files.video) {
      videoPath = req.files.video[0].path;
    } else if (videoUrl) {
      videoPath = await handleFilePath(videoUrl, sessionId, 'video', 'video.mp4');
      if (videoUrl.startsWith('http')) tempVideoPath = videoPath;
    } else {
      return res.status(400).json({ error: 'Video file or URL is required' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using two-step approach (video input, TOP text placement, no fade)
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    const maxDuration = duration ? parseFloat(duration) : null;
    await createVideoVid1(videoPath, audioPath, quote, author || '', watermark || '', outputPath, maxDuration);

    // Cleanup temp files
    if (tempVideoPath && fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Vid-1 video created successfully (Two-step approach with video input, top text, no fade)',
      style: 'Vid-1'
    });

  } catch (error) {
    console.error('Vid-1 Error:', error);
    
    // Cleanup on error
    if (tempVideoPath && fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Vid-1.2 handler with fixed file handling
async function handleVid12(req, res) {
  const sessionId = uuidv4();
  let audioPath;
  let tempAudioPath = null;
  
  try {
    const { quote, author, watermark, audioUrl, instagramUrl, clips } = req.body;
    
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

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
    } else {
      return res.status(400).json({ error: 'Audio required (instagramUrl, audioUrl, or audio file)' });
    }

    // Create video using multi-clip approach
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoVid12(audioPath, quote, author || '', watermark || '', parsedClips, outputPath);

    // Cleanup temp files
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Vid-1.2 video created successfully (Multi-clip approach with multiple video sources, top text, no fade)',
      style: 'Vid-1.2'
    });

  } catch (error) {
    console.error('Vid-1.2 Error:', error);
    
    // Cleanup on error
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Vid-1.3 handler
async function handleVid13(req, res) {
  const sessionId = uuidv4();
  let audioPath;
  let tempAudioPath = null;
  
  try {
    const { quote, author, watermark, audioUrl, instagramUrl, clips, captions, overlay } = req.body;
    
    if (!clips) {
      return res.status(400).json({ error: 'Clips array is required' });
    }

    // Parse clips and captions
    let parsedClips, parsedCaptions = null;
    try {
      parsedClips = typeof clips === 'string' ? JSON.parse(clips) : clips;
      if (captions) {
        parsedCaptions = typeof captions === 'string' ? JSON.parse(captions) : captions;
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid clips or captions format.' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using vid-1.3 approach
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoVid13(audioPath, quote, author || '', watermark || '', parsedClips, parsedCaptions, outputPath, overlay || false);

    // Cleanup temp files
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Vid-1.3 video created successfully (Smart aspect ratio with overlay support)',
      style: 'Vid-1.3'
    });

  } catch (error) {
    console.error('Vid-1.3 Error:', error);
    
    // Cleanup on error
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Vid-1.4 handler
async function handleVid14(req, res) {
  const sessionId = uuidv4();
  let audioPath;
  let tempAudioPath = null;
  
  try {
    const { watermark, audioUrl, instagramUrl, clips, captions, overlay } = req.body;
    
    if (!clips) {
      return res.status(400).json({ error: 'Clips array is required' });
    }

    if (!captions) {
      return res.status(400).json({ error: 'Captions array is required for Vid-1.4' });
    }

    // Parse clips and captions
    let parsedClips, parsedCaptions;
    try {
      parsedClips = typeof clips === 'string' ? JSON.parse(clips) : clips;
      parsedCaptions = typeof captions === 'string' ? JSON.parse(captions) : captions;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid clips or captions format.' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using vid-1.4 approach
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoVid14(audioPath, parsedCaptions, watermark || '', parsedClips, outputPath, overlay || false);

    // Cleanup temp files
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Vid-1.4 video created successfully (Timed captions with overlay support)',
      style: 'Vid-1.4'
    });

  } catch (error) {
    console.error('Vid-1.4 Error:', error);
    
    // Cleanup on error
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

// Vid-1.5 handler
async function handleVid15(req, res) {
  const sessionId = uuidv4();
  let audioPath;
  let tempAudioPath = null;
  
  try {
    const { watermark, audioUrl, instagramUrl, clips, captions, overlay } = req.body;
    
    if (!clips) {
      return res.status(400).json({ error: 'Clips array is required' });
    }

    if (!captions) {
      return res.status(400).json({ error: 'Captions array is required for Vid-1.5' });
    }

    // Parse clips and captions
    let parsedClips, parsedCaptions;
    try {
      parsedClips = typeof clips === 'string' ? JSON.parse(clips) : clips;
      parsedCaptions = typeof captions === 'string' ? JSON.parse(captions) : captions;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid clips or captions format.' });
    }

    // Handle audio
    if (req.files && req.files.audio) {
      audioPath = req.files.audio[0].path;
    } else if (instagramUrl) {
      const tempPath = path.join('temp', `${sessionId}-instagram-audio`);
      audioPath = await extractInstagramAudio(instagramUrl, tempPath);
      tempAudioPath = audioPath;
    } else if (audioUrl) {
      audioPath = await handleFilePath(audioUrl, sessionId, 'audio', 'audio.mp3');
      if (audioUrl.startsWith('http')) tempAudioPath = audioPath;
    } else {
      return res.status(400).json({ error: 'Audio required' });
    }

    // Create video using vid-1.5 approach
    const outputPath = path.join('output', `${sessionId}-video.mp4`);
    await createVideoVid15(audioPath, parsedCaptions, watermark || '', parsedClips, outputPath, overlay || false);

    // Cleanup temp files
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

    res.json({
      success: true,
      videoUrl: getFullUrl(req, `/video/${sessionId}-video.mp4`),
      message: 'Vid-1.5 video created successfully (Cinematic overlay with timed captions)',
      style: 'Vid-1.5'
    });

  } catch (error) {
    console.error('Vid-1.5 Error:', error);
    
    // Cleanup on error
    if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  handleMasterRequest,
  upload
};