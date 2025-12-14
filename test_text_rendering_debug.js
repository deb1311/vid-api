const { createVideoVid13 } = require('./endpoints/vid-1.3');
const path = require('path');
const fs = require('fs');

async function testTextRendering() {
  console.log('🧪 Testing text rendering with vid-1.3...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  // Test with simple quote and author
  const testPayload = {
    audioPath: 'assets/test-audio.mp3',
    quote: 'This is a test quote to verify text rendering',
    author: 'Test Author',
    watermark: 'Test Watermark',
    clips: [
      {
        imageurl: 'assets/test-image.jpg',
        duration: 5,
        start: 0
      }
    ],
    captions: null,
    outputPath: 'temp/test_text_rendering.mp4',
    overlay: false
  };
  
  try {
    console.log('📝 Testing with quote and author...');
    await createVideoVid13(
      testPayload.audioPath,
      testPayload.quote,
      testPayload.author,
      testPayload.watermark,
      testPayload.clips,
      testPayload.captions,
      testPayload.outputPath,
      testPayload.overlay
    );
    
    console.log('✅ Text rendering test completed successfully');
    console.log(`📁 Output file: ${testPayload.outputPath}`);
    
    // Check if file exists and has reasonable size
    if (fs.existsSync(testPayload.outputPath)) {
      const stats = fs.statSync(testPayload.outputPath);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
  } catch (error) {
    console.error('❌ Text rendering test failed:', error.message);
    throw error;
  }
}

// Test with captions
async function testCaptionRendering() {
  console.log('🧪 Testing caption rendering with vid-1.3...');
  
  const testPayload = {
    audioPath: 'assets/test-audio.mp3',
    quote: '', // Empty quote since we're using captions
    author: '',
    watermark: 'Caption Test',
    clips: [
      {
        imageurl: 'assets/test-image.jpg',
        duration: 10,
        start: 0
      }
    ],
    captions: [
      {
        text: 'First caption line',
        start: 0,
        duration: 3
      },
      {
        text: 'Second caption appears here',
        start: 3,
        duration: 3
      },
      {
        text: 'Final caption text',
        start: 6,
        duration: 4
      }
    ],
    outputPath: 'temp/test_caption_rendering.mp4',
    overlay: false
  };
  
  try {
    console.log('📝 Testing with timed captions...');
    await createVideoVid13(
      testPayload.audioPath,
      testPayload.quote,
      testPayload.author,
      testPayload.watermark,
      testPayload.clips,
      testPayload.captions,
      testPayload.outputPath,
      testPayload.overlay
    );
    
    console.log('✅ Caption rendering test completed successfully');
    console.log(`📁 Output file: ${testPayload.outputPath}`);
    
    // Check if file exists and has reasonable size
    if (fs.existsSync(testPayload.outputPath)) {
      const stats = fs.statSync(testPayload.outputPath);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
  } catch (error) {
    console.error('❌ Caption rendering test failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  try {
    await testTextRendering();
    console.log('\n');
    await testCaptionRendering();
    console.log('\n✅ All text rendering tests completed');
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests();