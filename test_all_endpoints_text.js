const fs = require('fs');
const path = require('path');

// Import all endpoint functions
const { createVideoVid1 } = require('./endpoints/vid-1');
const { createVideoVid12 } = require('./endpoints/vid-1.2');
const { createVideoVid13 } = require('./endpoints/vid-1.3');
const { createVideoVid14 } = require('./endpoints/vid-1.4');
const { createVideoVid15 } = require('./endpoints/vid-1.5');

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

async function testAllEndpoints() {
  console.log('🚀 Testing text rendering across all video endpoints...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  const results = {};
  
  // Test Vid-1
  results['vid-1'] = await testEndpoint('Vid-1', async () => {
    await createVideoVid1(
      'assets/test-video.mp4',
      'assets/test-audio.mp3',
      'Vid-1 Test Quote',
      'Vid-1 Author',
      'Vid-1 Watermark',
      'temp/test_vid1_all.mp4',
      5
    );
  });
  
  // Test Vid-1.2
  results['vid-1.2'] = await testEndpoint('Vid-1.2', async () => {
    await createVideoVid12(
      'assets/test-audio.mp3',
      'Vid-1.2 Test Quote',
      'Vid-1.2 Author',
      'Vid-1.2 Watermark',
      [{
        videoUrl: 'assets/test-video.mp4',
        begin: 0,
        duration: 5
      }],
      'temp/test_vid12_all.mp4'
    );
  });
  
  // Test Vid-1.3
  results['vid-1.3'] = await testEndpoint('Vid-1.3', async () => {
    await createVideoVid13(
      'assets/test-audio.mp3',
      'Vid-1.3 Test Quote',
      'Vid-1.3 Author',
      'Vid-1.3 Watermark',
      [{
        imageurl: 'assets/test-image.jpg',
        duration: 5,
        start: 0
      }],
      null, // captions
      'temp/test_vid13_all.mp4',
      false // overlay
    );
  });
  
  // Test Vid-1.4
  results['vid-1.4'] = await testEndpoint('Vid-1.4', async () => {
    await createVideoVid14(
      'assets/test-audio.mp3',
      [{ text: 'Vid-1.4 Test Caption', start: 0, duration: 5 }], // captions
      'Vid-1.4 Watermark',
      [{
        imageurl: 'assets/test-image.jpg',
        duration: 5,
        start: 0
      }],
      'temp/test_vid14_all.mp4',
      false // overlay
    );
  });
  
  // Test Vid-1.5
  results['vid-1.5'] = await testEndpoint('Vid-1.5', async () => {
    await createVideoVid15(
      'assets/test-audio.mp3',
      [{ text: 'Vid-1.5 Test Caption', start: 0, duration: 5 }], // captions
      'Vid-1.5 Watermark',
      [{
        imageurl: 'assets/test-image.jpg',
        duration: 5,
        start: 0
      }],
      'temp/test_vid15_all.mp4',
      false // overlay
    );
  });
  
  // Print results summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
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
    console.log('\n🎉 All endpoints passed!');
    return true;
  }
}

testAllEndpoints().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});