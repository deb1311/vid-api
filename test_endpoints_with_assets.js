const axios = require('axios');
const path = require('path');

async function testEndpointsWithAssets() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Endpoints with Real Assets...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper function to test an endpoint
  async function testEndpoint(name, endpoint, data, shouldSucceed = false) {
    try {
      console.log(`Testing ${name}...`);
      const response = await axios.post(`${baseUrl}/master`, {
        endpoint: endpoint,
        data: data
      }, { timeout: 30000 }); // 30 second timeout
      
      if (shouldSucceed) {
        console.log(`✅ ${name}: SUCCESS - Video created!`);
        console.log(`   URL: ${response.data.url}`);
        testResults.passed++;
        testResults.tests.push({ name, status: 'passed', url: response.data.url });
      } else {
        console.log(`❌ ${name}: Expected failure but got success`);
        testResults.failed++;
        testResults.tests.push({ name, status: 'failed', reason: 'Expected failure but got success' });
      }
    } catch (error) {
      if (shouldSucceed) {
        console.log(`❌ ${name}: FAILED - ${error.response?.data?.error || error.message}`);
        testResults.failed++;
        testResults.tests.push({ name, status: 'failed', reason: error.response?.data?.error || error.message });
      } else {
        console.log(`✅ ${name}: Expected error - ${error.response?.data?.error || error.message}`);
        testResults.passed++;
        testResults.tests.push({ name, status: 'passed', note: 'Expected error' });
      }
    }
    console.log('');
  }

  // Test with local assets (should succeed)
  const localImagePath = path.resolve('assets/test-image.jpg');
  const localAudioPath = path.resolve('assets/test-audio.mp3');
  const localVideoPath = path.resolve('assets/test-video.mp4');

  console.log('📁 Using local assets:');
  console.log(`   Image: ${localImagePath}`);
  console.log(`   Audio: ${localAudioPath}`);
  console.log(`   Video: ${localVideoPath}\n`);

  // Test Style 1 with local assets
  await testEndpoint(
    'Style 1 - Local Assets',
    'style1',
    { 
      quote: 'This is a test quote for Style 1',
      author: 'Test Author',
      watermark: 'Test Watermark',
      imageUrl: localImagePath,
      audioUrl: localAudioPath,
      duration: 5
    },
    true // Should succeed
  );

  // Test Style 2 with local assets
  await testEndpoint(
    'Style 2 - Local Assets',
    'style2',
    { 
      quote: 'This is a test quote for Style 2',
      author: 'Test Author',
      imageUrl: localImagePath,
      audioUrl: localAudioPath,
      duration: 5
    },
    true // Should succeed
  );

  // Test Vid-1 with local assets
  await testEndpoint(
    'Vid-1 - Local Assets',
    'vid-1',
    { 
      quote: 'This is a test quote for Vid-1',
      author: 'Test Author',
      videoUrl: localVideoPath,
      audioUrl: localAudioPath,
      duration: 5
    },
    true // Should succeed
  );

  // Test Vid-1.2 with local assets
  await testEndpoint(
    'Vid-1.2 - Local Assets',
    'vid-1.2',
    {
      quote: 'This is a test quote for Vid-1.2',
      author: 'Test Author',
      audioUrl: localAudioPath,
      clips: [
        {
          videourl: localVideoPath,
          start: 0,
          duration: 3
        },
        {
          imageurl: localImagePath,
          start: 3,
          duration: 2
        }
      ]
    },
    true // Should succeed
  );

  // Test Vid-1.3 with local assets
  await testEndpoint(
    'Vid-1.3 - Local Assets',
    'vid-1.3',
    {
      quote: 'This is a test quote for Vid-1.3',
      author: 'Test Author',
      audioUrl: localAudioPath,
      clips: [
        {
          imageurl: localImagePath,
          start: 0,
          duration: 3
        }
      ],
      overlay: false
    },
    true // Should succeed
  );

  // Test Vid-1.4 with local assets and captions
  await testEndpoint(
    'Vid-1.4 - Local Assets with Captions',
    'vid-1.4',
    {
      audioUrl: localAudioPath,
      watermark: 'Test Watermark',
      clips: [
        {
          videourl: localVideoPath,
          start: 0,
          duration: 5
        }
      ],
      captions: [
        {
          text: 'First caption for Vid-1.4',
          start: 0,
          duration: 2
        },
        {
          text: 'Second caption for Vid-1.4',
          start: 2,
          duration: 3
        }
      ]
    },
    true // Should succeed
  );

  // Test Vid-1.5 with local assets and captions
  await testEndpoint(
    'Vid-1.5 - Local Assets with Captions',
    'vid-1.5',
    {
      audioUrl: localAudioPath,
      watermark: 'Test Watermark',
      clips: [
        {
          imageurl: localImagePath,
          start: 0,
          duration: 5
        }
      ],
      captions: [
        {
          text: 'Caption for Vid-1.5 with overlay',
          start: 0,
          duration: 5
        }
      ],
      overlay: true
    },
    true // Should succeed
  );

  // Test validation errors (should fail)
  await testEndpoint(
    'Style 1 - Missing Quote',
    'style1',
    { 
      author: 'Test Author',
      imageUrl: localImagePath,
      audioUrl: localAudioPath
    },
    false // Should fail
  );

  await testEndpoint(
    'Vid-1.4 - Missing Captions',
    'vid-1.4',
    { 
      audioUrl: localAudioPath,
      clips: [{ videourl: localVideoPath, start: 0, duration: 5 }]
    },
    false // Should fail
  );

  // Print results
  console.log('🎯 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.tests.filter(t => t.status === 'failed').forEach(test => {
      console.log(`   - ${test.name}: ${test.reason}`);
    });
  }

  const successfulVideos = testResults.tests.filter(t => t.status === 'passed' && t.url);
  if (successfulVideos.length > 0) {
    console.log('\n🎬 SUCCESSFULLY CREATED VIDEOS:');
    successfulVideos.forEach(test => {
      console.log(`   - ${test.name}: ${test.url}`);
    });
  }

  console.log('\n🎉 Comprehensive endpoint testing completed!');
  
  return testResults.failed === 0;
}

// Run tests
testEndpointsWithAssets().catch(error => {
  if (error.code === 'ECONNREFUSED') {
    console.log('❌ Server not running. Please start the server first with: node server-modular.js');
  } else {
    console.error('❌ Test error:', error.message);
  }
});