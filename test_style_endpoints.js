const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const TEST_QUOTE = "POV: My lawyer on the phone telling me its best to leave the country (I already left)";
const TEST_IMAGE = "https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg";
const TEST_AUDIO = "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/599_audio.mp3";
const TEST_AUTHOR = "Test Author: Name";
const TEST_WATERMARK = "@e2";

const results = [];

async function testEndpoint(name, endpoint, data) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 Testing: ${name}`);
  console.log(`${'='.repeat(60)}`);
  
  const startTime = Date.now();
  
  try {
    const payload = {
      endpoint: endpoint,
      data: data
    };
    
    console.log('📦 Testing with special characters in text...');
    
    const response = await axios.post(`${BASE_URL}/master`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 3 minute timeout
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ SUCCESS (${duration}s)`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.url) {
      console.log(`🎥 Video URL: ${response.data.url}`);
    }
    
    results.push({
      name,
      endpoint,
      status: 'SUCCESS',
      duration: `${duration}s`,
      url: response.data.url || response.data.videoUrl
    });
    
    return true;
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`❌ FAILED (${duration}s)`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    results.push({
      name,
      endpoint,
      status: 'FAILED',
      duration: `${duration}s`,
      error: error.response?.data || error.message
    });
    
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Style Endpoints Tests...\n');
  
  // Test Style 1: Two-step with bottom text
  await testEndpoint(
    'Style 1: Two-step with bottom text',
    'style1',
    {
      quote: TEST_QUOTE,
      author: TEST_AUTHOR,
      watermark: TEST_WATERMARK,
      imageUrl: TEST_IMAGE,
      audioUrl: TEST_AUDIO,
      duration: 6
    }
  );
  
  // Test Style 2: Single-step with bottom text
  await testEndpoint(
    'Style 2: Single-step with bottom text',
    'style2',
    {
      quote: TEST_QUOTE,
      author: TEST_AUTHOR,
      watermark: TEST_WATERMARK,
      imageUrl: TEST_IMAGE,
      audioUrl: TEST_AUDIO,
      duration: 6
    }
  );
  
  // Test Style 3: Two-step with top text
  await testEndpoint(
    'Style 3: Two-step with top text',
    'style3',
    {
      quote: TEST_QUOTE,
      author: TEST_AUTHOR,
      watermark: TEST_WATERMARK,
      imageUrl: TEST_IMAGE,
      audioUrl: TEST_AUDIO,
      duration: 6
    }
  );
  
  // Test Style 4: Single-step with top text
  await testEndpoint(
    'Style 4: Single-step with top text',
    'style4',
    {
      quote: TEST_QUOTE,
      author: TEST_AUTHOR,
      watermark: TEST_WATERMARK,
      imageUrl: TEST_IMAGE,
      audioUrl: TEST_AUDIO,
      duration: 6
    }
  );
  
  // Print summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log('\n' + '-'.repeat(60));
  console.log('Detailed Results:');
  console.log('-'.repeat(60));
  
  results.forEach((result, index) => {
    const icon = result.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`\n${index + 1}. ${icon} ${result.name}`);
    console.log(`   Endpoint: ${result.endpoint}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration}`);
    if (result.url) {
      console.log(`   URL: ${result.url}`);
    }
    if (result.error) {
      console.log(`   Error: ${JSON.stringify(result.error)}`);
    }
  });
  
  // Save results to file
  fs.writeFileSync('test_style_results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results saved to test_style_results.json');
  
  console.log('\n' + '='.repeat(60));
  
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
