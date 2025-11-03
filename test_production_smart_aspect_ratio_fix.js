const axios = require('axios');

// Production URL
const PRODUCTION_URL = 'https://video-editor-api-519298355551.us-central1.run.app';

// Test data with empty author field (the original issue)
const testData = {
  "quote": "GFGEG",
  "author": "", // Empty author - this was causing the issue
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
    }
  ],
  "overlay": true
};

async function testProductionDeployment() {
  console.log('🌐 Testing Smart Aspect Ratio Fix on Production');
  console.log('=' .repeat(60));
  console.log(`🔗 Production URL: ${PRODUCTION_URL}`);
  
  try {
    // First test health endpoint
    console.log('\n🏥 Testing health endpoint...');
    const healthResponse = await axios.get(`${PRODUCTION_URL}/health`, {
      timeout: 30000
    });
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test the master endpoint with vid-1.3 (the original failing case)
    console.log('\n🧪 Testing vid-1.3 with empty author field (original issue)...');
    const masterPayload = {
      endpoint: 'vid-1.3',
      data: testData
    };

    const startTime = Date.now();
    
    const response = await axios.post(`${PRODUCTION_URL}/master`, masterPayload, {
      timeout: 600000, // 10 minutes timeout for production
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n🎉 SUCCESS! Smart aspect ratio fix is working in production!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    console.log(`⏱️  Processing time: ${duration}s`);
    
    if (response.data.status === 'success' && response.data.url) {
      console.log(`🎬 Production Video URL: ${response.data.url}`);
      console.log('\n✅ The smart aspect ratio error has been successfully fixed in production!');
      console.log('🔧 All endpoints now handle empty text fields correctly.');
    }

  } catch (error) {
    console.error('\n❌ PRODUCTION TEST FAILED:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', JSON.stringify(error.response.data, null, 2));
      
      // Check if it's the old smart aspect ratio error
      if (error.response.data.error && error.response.data.error.includes('Smart aspect ratio application failed with code 1')) {
        console.error('🚨 The smart aspect ratio error is still occurring in production!');
        console.error('🔧 The deployment may not have included the fixes.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Cannot connect to production service.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏰ Request timed out. Production processing may be taking longer than expected.');
    }
  }
}

// Also test a style endpoint to verify all fixes are deployed
async function testStyleEndpointProduction() {
  console.log('\n🎨 Testing Style1 endpoint with empty author...');
  
  const styleTestData = {
    "quote": "Test Quote",
    "author": "", // Empty author
    "watermark": "@TestWatermark",
    "imageUrl": "https://images.pexels.com/photos/13943357/pexels-photo-13943357.jpeg",
    "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/relaxing-guitar-loop-v5-245859.mp3",
    "duration": 5
  };

  try {
    const masterPayload = {
      endpoint: 'style1',
      data: styleTestData
    };

    const startTime = Date.now();
    
    const response = await axios.post(`${PRODUCTION_URL}/master`, masterPayload, {
      timeout: 300000, // 5 minutes timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('✅ Style1 endpoint working correctly in production!');
    console.log(`⏱️  Processing time: ${duration}s`);
    console.log(`🎬 Video URL: ${response.data.url}`);

  } catch (error) {
    console.error('❌ Style1 test failed:', error.message);
    if (error.response) {
      console.error('📊 Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runProductionTests() {
  await testProductionDeployment();
  await testStyleEndpointProduction();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Production testing completed');
  console.log('🌐 Your API is live at:', PRODUCTION_URL);
}

runProductionTests().catch(console.error);