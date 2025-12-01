const axios = require('axios');
const fs = require('fs');

// CHANGE THIS TO YOUR DEPLOYED CLOUD RUN URL
const BASE_URL = process.env.CLOUD_RUN_URL || 'https://video-editor-api-mit2lwtyaq-uc.a.run.app';

console.log('🚀 Testing Cloud Run Deployment');
console.log('📍 Base URL:', BASE_URL);
console.log('');

// Test data
const testImage = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
const testAudio = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const testQuote = 'Success is not final, failure is not fatal.';
const testAuthor = '- Winston Churchill';

async function testEndpoint(name, endpoint, payload) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const startTime = Date.now();
    console.log('⏳ Sending request...');
    
    const response = await axios.post(`${BASE_URL}${endpoint}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 180000 // 3 minute timeout
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ SUCCESS (${duration}s)`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.videoUrl) {
      console.log(`\n🎥 Video URL: ${response.data.videoUrl}`);
      console.log(`   Full URL: ${BASE_URL}${response.data.videoUrl.replace(/^\//, '')}`);
    }
    
    return { success: true, duration, data: response.data };
  } catch (error) {
    console.log('❌ FAILED');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = [];
  
  // Test 1: Health Check
  console.log('\n' + '='.repeat(60));
  console.log('Test 1: Health Check');
  console.log('='.repeat(60));
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed');
    console.log('Response:', response.data);
    results.push({ test: 'Health Check', success: true });
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    results.push({ test: 'Health Check', success: false, error: error.message });
  }
  
  // Test 2: Style 1 (Bottom text, two-step)
  results.push(await testEndpoint(
    'Style 1 - Bottom Text (Two-step)',
    '/create-video-style1',
    {
      imageUrl: testImage,
      audioUrl: testAudio,
      quote: testQuote,
      author: testAuthor,
      watermark: '@test',
      duration: 10
    }
  ));
  
  // Test 3: Style 2 (Bottom text, single-step)
  results.push(await testEndpoint(
    'Style 2 - Bottom Text (Single-step)',
    '/create-video-style2',
    {
      imageUrl: testImage,
      audioUrl: testAudio,
      quote: testQuote,
      author: testAuthor,
      watermark: '@test',
      duration: 10
    }
  ));
  
  // Test 4: Style 3 (Top text, two-step)
  results.push(await testEndpoint(
    'Style 3 - Top Text (Two-step)',
    '/create-video-style3',
    {
      imageUrl: testImage,
      audioUrl: testAudio,
      quote: testQuote,
      author: testAuthor,
      watermark: '@test',
      duration: 10
    }
  ));
  
  // Test 5: Style 4 (Top text, single-step)
  results.push(await testEndpoint(
    'Style 4 - Top Text (Single-step)',
    '/create-video-style4',
    {
      imageUrl: testImage,
      audioUrl: testAudio,
      quote: testQuote,
      author: testAuthor,
      watermark: '@test',
      duration: 10
    }
  ));
  
  // Test 6: Vid-1.2 (Multi-clip)
  results.push(await testEndpoint(
    'Vid-1.2 - Multi-clip with Transitions',
    '/create-video-vid-1.2',
    {
      audioUrl: testAudio,
      quote: testQuote,
      author: testAuthor,
      watermark: '@test',
      clips: [
        {
          imageurl: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
          start: 0,
          duration: 3,
          transition: 'fade'
        },
        {
          imageurl: 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg',
          start: 3,
          duration: 3,
          transition: 'dissolve'
        },
        {
          imageurl: 'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg',
          start: 6,
          duration: 4,
          transition: 'cut'
        }
      ]
    }
  ));
  
  // Test 7: Master Endpoint
  results.push(await testEndpoint(
    'Master Endpoint - Auto-detect Style',
    '/master',
    {
      imageUrl: testImage,
      audioUrl: testAudio,
      quote: testQuote,
      author: testAuthor,
      watermark: '@test',
      duration: 10
    }
  ));
  
  // Test 8: Video Editor Interface
  console.log('\n' + '='.repeat(60));
  console.log('Test 8: Video Editor Interface');
  console.log('='.repeat(60));
  try {
    const response = await axios.get(`${BASE_URL}/editor/`);
    console.log('✅ Video editor interface accessible');
    console.log(`🌐 Open in browser: ${BASE_URL}/editor/`);
    results.push({ test: 'Video Editor Interface', success: true });
  } catch (error) {
    console.log('❌ Video editor interface failed:', error.message);
    results.push({ test: 'Video Editor Interface', success: false, error: error.message });
  }
  
  // Test 9: Webhook Proxy
  results.push(await testEndpoint(
    'Webhook Proxy',
    '/webhook-proxy',
    {
      webhookUrl: 'https://webhook.site/unique-id',
      payload: {
        test: 'data',
        timestamp: new Date().toISOString()
      }
    }
  ));
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}s)` : '';
    console.log(`${index + 1}. ${status} ${result.test || 'Test'}${duration}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Save results to file
  const reportPath = 'deployment_test_results.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: results.length,
      passed,
      failed,
      successRate: ((passed / results.length) * 100).toFixed(1) + '%'
    },
    results
  }, null, 2));
  
  console.log(`\n💾 Full results saved to: ${reportPath}`);
  
  // Important URLs
  console.log('\n\n' + '='.repeat(60));
  console.log('🔗 IMPORTANT URLS');
  console.log('='.repeat(60));
  console.log(`\nAPI Base URL: ${BASE_URL}`);
  console.log(`Health Check: ${BASE_URL}/health`);
  console.log(`Video Editor: ${BASE_URL}/editor/`);
  console.log(`Master Endpoint: ${BASE_URL}/master`);
  
  console.log('\n\n' + '='.repeat(60));
  console.log('✨ Testing Complete!');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
