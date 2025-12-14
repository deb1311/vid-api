const { createVideoVid1 } = require('./endpoints/vid-1');
const path = require('path');
const fs = require('fs');

async function testVid1TextRendering() {
  console.log('🧪 Testing text rendering with vid-1...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  try {
    console.log('📝 Testing vid-1 with quote and author...');
    await createVideoVid1(
      'assets/test-video.mp4',
      'assets/test-audio.mp3',
      'This is a test quote for vid-1',
      'Test Author Vid-1',
      'Vid-1 Watermark',
      'temp/test_vid1_text.mp4',
      5 // 5 second duration
    );
    
    console.log('✅ Vid-1 text rendering test completed successfully');
    console.log(`📁 Output file: temp/test_vid1_text.mp4`);
    
    // Check if file exists and has reasonable size
    if (fs.existsSync('temp/test_vid1_text.mp4')) {
      const stats = fs.statSync('temp/test_vid1_text.mp4');
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
  } catch (error) {
    console.error('❌ Vid-1 text rendering test failed:', error.message);
    throw error;
  }
}

testVid1TextRendering();