const fs = require('fs');
const path = require('path');

// Import style endpoint functions
const { generateImageWithText, createVideoWithFade } = require('./endpoints/style1');
const { createVideoStyle2 } = require('./endpoints/style2');
const { generateImageWithTextTop, createVideoWithFade: createVideoWithFade3 } = require('./endpoints/style3');
const { createVideoStyle4 } = require('./endpoints/style4');

async function testEndpoint(name, testFunction) {
  console.log(`\n🧪 Testing ${name}...`);
  try {
    await testFunction();
    console.log(`✅ ${name} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return false;
  }
}

async function testStyleEndpoints() {
  console.log('🚀 Testing text rendering across all STYLE endpoints...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  const results = {};
  
  // Test text with special characters (the problematic case)
  const testQuote = "For others it's a dream, for us it's a mission.";
  const testAuthor = "Test Author";
  const testWatermark = "@testuser";
  
  // Test Style 1 (two-step: image then video)
  results['style1'] = await testEndpoint('Style 1', async () => {
    const imageOutput = 'temp/test_style1_image.png';
    const videoOutput = 'temp/test_style1_video.mp4';
    
    await generateImageWithText(
      'assets/test-image.jpg',
      testQuote,
      testAuthor,
      testWatermark,
      imageOutput
    );
    
    await createVideoWithFade(
      imageOutput,
      'assets/test-audio.mp3',
      videoOutput,
      5
    );
    
    if (!fs.existsSync(videoOutput)) {
      throw new Error('Output video not created');
    }
  });
  
  // Test Style 2 (single-step)
  results['style2'] = await testEndpoint('Style 2', async () => {
    const videoOutput = 'temp/test_style2_video.mp4';
    
    await createVideoStyle2(
      'assets/test-image.jpg',
      'assets/test-audio.mp3',
      testQuote,
      testAuthor,
      testWatermark,
      videoOutput,
      5
    );
    
    if (!fs.existsSync(videoOutput)) {
      throw new Error('Output video not created');
    }
  });
  
  // Test Style 3 (two-step with TOP text)
  results['style3'] = await testEndpoint('Style 3', async () => {
    const imageOutput = 'temp/test_style3_image.png';
    const videoOutput = 'temp/test_style3_video.mp4';
    
    await generateImageWithTextTop(
      'assets/test-image.jpg',
      testQuote,
      testAuthor,
      testWatermark,
      imageOutput
    );
    
    await createVideoWithFade3(
      imageOutput,
      'assets/test-audio.mp3',
      videoOutput,
      5
    );
    
    if (!fs.existsSync(videoOutput)) {
      throw new Error('Output video not created');
    }
  });
  
  // Test Style 4 (single-step with TOP text)
  results['style4'] = await testEndpoint('Style 4', async () => {
    const videoOutput = 'temp/test_style4_video.mp4';
    
    await createVideoStyle4(
      'assets/test-image.jpg',
      'assets/test-audio.mp3',
      testQuote,
      testAuthor,
      testWatermark,
      videoOutput,
      5
    );
    
    if (!fs.existsSync(videoOutput)) {
      throw new Error('Output video not created');
    }
  });
  
  // Print results summary
  console.log('\n📊 Style Endpoints Test Results:');
  console.log('================================');
  for (const [endpoint, success] of Object.entries(results)) {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${endpoint}: ${status}`);
  }
  
  const failedEndpoints = Object.entries(results)
    .filter(([_, success]) => !success)
    .map(([endpoint, _]) => endpoint);
  
  if (failedEndpoints.length > 0) {
    console.log(`\n⚠️  Failed endpoints: ${failedEndpoints.join(', ')}`);
    return false;
  } else {
    console.log('\n🎉 All style endpoints passed!');
    return true;
  }
}

testStyleEndpoints().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
