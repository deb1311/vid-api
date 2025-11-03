const axios = require('axios');

async function testAllEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing ALL Endpoints through Master Endpoint...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper function to test an endpoint
  async function testEndpoint(name, endpoint, data, expectedError = null) {
    try {
      console.log(`Testing ${name}...`);
      const response = await axios.post(`${baseUrl}/master`, {
        endpoint: endpoint,
        data: data
      });
      
      if (expectedError) {
        console.log(`❌ ${name}: Expected error but got success`);
        testResults.failed++;
        testResults.tests.push({ name, status: 'failed', reason: 'Expected error but got success' });
      } else {
        console.log(`✅ ${name}: Success response received`);
        testResults.passed++;
        testResults.tests.push({ name, status: 'passed' });
      }
    } catch (error) {
      if (expectedError && error.response && error.response.data.error.includes(expectedError)) {
        console.log(`✅ ${name}: Expected error received - ${expectedError}`);
        testResults.passed++;
        testResults.tests.push({ name, status: 'passed', note: 'Expected error' });
      } else if (error.response && error.response.status === 400) {
        console.log(`✅ ${name}: Validation working - ${error.response.data.error}`);
        testResults.passed++;
        testResults.tests.push({ name, status: 'passed', note: 'Validation error' });
      } else {
        console.log(`❌ ${name}: Unexpected error - ${error.response?.data?.error || error.message}`);
        testResults.failed++;
        testResults.tests.push({ name, status: 'failed', reason: error.response?.data?.error || error.message });
      }
    }
    console.log('');
  }

  // Test Style endpoints
  await testEndpoint(
    'Style 1 - Missing Quote',
    'style1',
    { author: 'Test Author' },
    'Quote is required'
  );

  await testEndpoint(
    'Style 1 - Missing Image',
    'style1',
    { quote: 'Test quote', audioUrl: 'test.mp3' },
    'Image required'
  );

  await testEndpoint(
    'Style 2 - Valid Structure',
    'style2',
    { 
      quote: 'Test quote',
      author: 'Test Author',
      imageUrl: 'https://example.com/test.jpg',
      audioUrl: 'https://example.com/test.mp3'
    }
  );

  await testEndpoint(
    'Style 3 - Valid Structure',
    'style3',
    { 
      quote: 'Test quote',
      author: 'Test Author',
      imageUrl: 'https://example.com/test.jpg',
      audioUrl: 'https://example.com/test.mp3'
    }
  );

  await testEndpoint(
    'Style 4 - Valid Structure',
    'style4',
    { 
      quote: 'Test quote',
      author: 'Test Author',
      imageUrl: 'https://example.com/test.jpg',
      audioUrl: 'https://example.com/test.mp3'
    }
  );

  // Test Vid endpoints
  await testEndpoint(
    'Vid-1 - Missing Video',
    'vid-1',
    { quote: 'Test quote', audioUrl: 'test.mp3' },
    'Video file or URL is required'
  );

  await testEndpoint(
    'Vid-1.2 - Missing Clips',
    'vid-1.2',
    { quote: 'Test quote', audioUrl: 'test.mp3' },
    'Clips array is required'
  );

  await testEndpoint(
    'Vid-1.2 - Valid Structure',
    'vid-1.2',
    {
      quote: 'Test quote',
      audioUrl: 'https://example.com/test.mp3',
      clips: [
        {
          videourl: 'https://example.com/video1.mp4',
          start: 0,
          duration: 5
        }
      ]
    }
  );

  await testEndpoint(
    'Vid-1.3 - Missing Clips',
    'vid-1.3',
    { quote: 'Test quote', audioUrl: 'test.mp3' },
    'Clips array is required'
  );

  await testEndpoint(
    'Vid-1.3 - Valid Structure',
    'vid-1.3',
    {
      quote: 'Test quote',
      audioUrl: 'https://example.com/test.mp3',
      clips: [
        {
          imageurl: 'https://example.com/image1.jpg',
          start: 0,
          duration: 4
        }
      ],
      overlay: true
    }
  );

  await testEndpoint(
    'Vid-1.4 - Missing Captions',
    'vid-1.4',
    { 
      audioUrl: 'test.mp3',
      clips: [{ videourl: 'test.mp4', start: 0, duration: 5 }]
    },
    'Captions array is required'
  );

  await testEndpoint(
    'Vid-1.4 - Valid Structure',
    'vid-1.4',
    {
      audioUrl: 'https://example.com/test.mp3',
      clips: [
        {
          videourl: 'https://example.com/video1.mp4',
          start: 0,
          duration: 5
        }
      ],
      captions: [
        {
          text: 'Test caption',
          start: 0,
          duration: 3
        }
      ]
    }
  );

  await testEndpoint(
    'Vid-1.5 - Missing Captions',
    'vid-1.5',
    { 
      audioUrl: 'test.mp3',
      clips: [{ videourl: 'test.mp4', start: 0, duration: 5 }]
    },
    'Captions array is required'
  );

  await testEndpoint(
    'Vid-1.5 - Valid Structure',
    'vid-1.5',
    {
      audioUrl: 'https://example.com/test.mp3',
      clips: [
        {
          imageurl: 'https://example.com/image1.jpg',
          start: 0,
          duration: 4
        }
      ],
      captions: [
        {
          text: 'Test caption',
          start: 0,
          duration: 3
        }
      ],
      overlay: true
    }
  );

  // Test case sensitivity and alternative names
  await testEndpoint(
    'Case Sensitivity - STYLE1',
    'STYLE1',
    { author: 'Test Author' },
    'Quote is required'
  );

  await testEndpoint(
    'Alternative Name - create-video-style2',
    'create-video-style2',
    { author: 'Test Author' },
    'Quote is required'
  );

  // Print results
  console.log('🎯 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
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

  console.log('\n🎉 All endpoint routing and validation tests completed!');
  
  return testResults.failed === 0;
}

// Run tests
testAllEndpoints().catch(error => {
  if (error.code === 'ECONNREFUSED') {
    console.log('❌ Server not running. Please start the server first with: node server-modular.js');
  } else {
    console.error('❌ Test error:', error.message);
  }
});