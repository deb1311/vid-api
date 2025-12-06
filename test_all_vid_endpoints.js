const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const TEST_QUOTE = "POV: My lawyer on the phone telling me its best to leave the country (I already left)";
const TEST_VIDEO = "https://videos.pexels.com/video-files/6184758/6184758-hd_1080_2048_24fps.mp4";
const TEST_IMAGE = "https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg";
const TEST_AUDIO = "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/599_audio.mp3";
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
    
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
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
  console.log('\n🚀 Starting comprehensive endpoint tests...\n');
  
  // Test 1: Vid-1 (Video background with text)
  await testEndpoint(
    'Vid-1: Video background with text',
    'vid-1',
    {
      quote: TEST_QUOTE,
      videoUrl: TEST_VIDEO,
      audioUrl: TEST_AUDIO,
      watermark: TEST_WATERMARK,
      duration: 6
    }
  );
  
  // Test 2: Vid-1.2 (Multi-clip)
  await testEndpoint(
    'Vid-1.2: Multi-clip with transitions',
    'vid-1.2',
    {
      quote: TEST_QUOTE,
      audioUrl: TEST_AUDIO,
      watermark: TEST_WATERMARK,
      clips: [
        {
          videourl: TEST_VIDEO,
          duration: 3,
          transition: 'fade'
        },
        {
          imageurl: TEST_IMAGE,
          duration: 3,
          transition: 'fade'
        }
      ]
    }
  );
  
  // Test 3: Vid-1.3 (Smart aspect ratio with quote)
  await testEndpoint(
    'Vid-1.3: Smart aspect ratio with quote',
    'vid-1.3',
    {
      quote: TEST_QUOTE,
      audioUrl: TEST_AUDIO,
      watermark: TEST_WATERMARK,
      clips: [
        {
          videourl: TEST_VIDEO,
          duration: 3
        },
        {
          imageurl: TEST_IMAGE,
          duration: 3
        }
      ],
      overlay: false
    }
  );
  
  // Test 4: Vid-1.3 with captions
  await testEndpoint(
    'Vid-1.3: Smart aspect ratio with captions',
    'vid-1.3',
    {
      audioUrl: TEST_AUDIO,
      watermark: TEST_WATERMARK,
      clips: [
        {
          videourl: TEST_VIDEO,
          duration: 3
        },
        {
          imageurl: TEST_IMAGE,
          duration: 3
        }
      ],
      captions: [
        { text: "First caption: with colon!", start: 0, duration: 2 },
        { text: "Second caption (with parentheses)", start: 2, duration: 2 },
        { text: "Third caption", start: 4, duration: 2 }
      ],
      overlay: false
    }
  );
  
  // Test 5: Vid-1.4 (Timed captions only)
  await testEndpoint(
    'Vid-1.4: Timed captions (no quote)',
    'vid-1.4',
    {
      audioUrl: TEST_AUDIO,
      watermark: TEST_WATERMARK,
      clips: [
        {
          videourl: TEST_VIDEO,
          duration: 3
        },
        {
          imageurl: TEST_IMAGE,
          duration: 3
        }
      ],
      captions: [
        { text: "Caption 1: Testing colons", start: 0, duration: 2 },
        { text: "Caption 2 (testing parentheses)", start: 2, duration: 2 },
        { text: "Caption 3", start: 4, duration: 2 }
      ],
      overlay: false
    }
  );
  
  // Test 6: Vid-1.5 (Cinematic overlay)
  await testEndpoint(
    'Vid-1.5: Cinematic overlay with captions',
    'vid-1.5',
    {
      audioUrl: TEST_AUDIO,
      watermark: TEST_WATERMARK,
      clips: [
        {
          videourl: TEST_VIDEO,
          duration: 3
        },
        {
          imageurl: TEST_IMAGE,
          duration: 3
        }
      ],
      captions: [
        { text: "Overlay caption: test", start: 0, duration: 2 },
        { text: "Another caption (test)", start: 2, duration: 2 },
        { text: "Final caption", start: 4, duration: 2 }
      ],
      overlay: true
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
  fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results saved to test_results.json');
  
  console.log('\n' + '='.repeat(60));
  
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
