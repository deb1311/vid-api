const axios = require('axios');

// Test data from user
const testData = {
  "quote": "GFGEG",
  "author": "",
  "watermark": "@TheSuccessFormula",
  "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/relaxing-guitar-loop-v5-245859.mp3",
  "duration": 10,
  "clips": [
    {
      "start": 0,
      "duration": 1,
      "description": "dhdghgh",
      "begin": 8.6,
      "volume": 100,
      "videourl": "https://www.pexels.com/download/video/30763731/"
    },
    {
      "start": 1,
      "duration": 1,
      "description": "",
      "videourl": "https://www.pexels.com/download/video/13765936/"
    },
    {
      "start": 2,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/13943357/pexels-photo-13943357.jpeg"
    },
    {
      "start": 3,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/18673852/pexels-photo-18673852.jpeg"
    },
    {
      "start": 4,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/13125315/pexels-photo-13125315.jpeg"
    },
    {
      "start": 5,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/18858931/pexels-photo-18858931.jpeg"
    },
    {
      "start": 6,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/3036363/pexels-photo-3036363.jpeg"
    },
    {
      "start": 7,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/14508041/pexels-photo-14508041.jpeg"
    },
    {
      "start": 8,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/9614840/pexels-photo-9614840.jpeg"
    },
    {
      "start": 9,
      "duration": 1,
      "description": "",
      "imageurl": "https://images.pexels.com/photos/7478696/pexels-photo-7478696.jpeg"
    }
  ],
  "overlay": true
};

async function testVid13Fix() {
  console.log('🧪 Testing Vid-1.3 with fixed smart aspect ratio handling...');
  console.log('📊 Test data:', JSON.stringify(testData, null, 2));
  
  try {
    // Test via master endpoint
    const masterPayload = {
      endpoint: 'vid-1.3',
      data: testData
    };

    console.log('\n🚀 Testing via master endpoint...');
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/master', masterPayload, {
      timeout: 300000, // 5 minutes timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n✅ SUCCESS!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    console.log(`⏱️  Processing time: ${duration}s`);
    
    if (response.data.status === 'success' && response.data.url) {
      console.log(`🎬 Video URL: ${response.data.url}`);
      console.log('\n🎉 Smart aspect ratio fix is working correctly!');
    } else {
      console.log('⚠️  Unexpected response format');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', JSON.stringify(error.response.data, null, 2));
      
      // Check if it's the old error
      if (error.response.data.error && error.response.data.error.includes('Smart aspect ratio application failed with code 1')) {
        console.error('🚨 The smart aspect ratio error is still occurring!');
        console.error('🔧 The fix may not have been applied correctly.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Server is not running. Please start the server first.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏰ Request timed out. The processing may be taking longer than expected.');
    }
  }
}

// Also test direct vid-1.3 endpoint
async function testDirectVid13() {
  console.log('\n🧪 Testing direct Vid-1.3 endpoint...');
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/create-video-vid-1.3', testData, {
      timeout: 300000, // 5 minutes timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n✅ DIRECT ENDPOINT SUCCESS!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    console.log(`⏱️  Processing time: ${duration}s`);
    
    if (response.data.success && response.data.videoUrl) {
      console.log(`🎬 Video URL: ${response.data.videoUrl}`);
    }

  } catch (error) {
    console.error('\n❌ DIRECT ENDPOINT ERROR:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run tests
async function runTests() {
  console.log('🔧 Testing Smart Aspect Ratio Error Fixes');
  console.log('=' .repeat(50));
  
  // Test master endpoint first
  await testVid13Fix();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test direct endpoint
  await testDirectVid13();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test completed');
}

runTests().catch(console.error);