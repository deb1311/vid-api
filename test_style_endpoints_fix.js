const axios = require('axios');

// Test data with empty author field (similar to the issue that caused vid-1.3 to fail)
const testData = {
  "quote": "Test Quote",
  "author": "", // Empty author - this was causing the issue
  "watermark": "@TestWatermark",
  "imageUrl": "https://images.pexels.com/photos/13943357/pexels-photo-13943357.jpeg",
  "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/relaxing-guitar-loop-v5-245859.mp3",
  "duration": 5
};

// Test data with all empty text fields
const testDataAllEmpty = {
  "quote": "",
  "author": "",
  "watermark": "",
  "imageUrl": "https://images.pexels.com/photos/13943357/pexels-photo-13943357.jpeg",
  "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/relaxing-guitar-loop-v5-245859.mp3",
  "duration": 5
};

async function testStyleEndpoint(endpoint, data, testName) {
  console.log(`\n🧪 Testing ${endpoint} - ${testName}...`);
  
  try {
    const masterPayload = {
      endpoint: endpoint,
      data: data
    };

    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/master', masterPayload, {
      timeout: 120000, // 2 minutes timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ SUCCESS! Processing time: ${duration}s`);
    console.log(`🎬 Video URL: ${response.data.url}`);
    
    return true;

  } catch (error) {
    console.error(`❌ ERROR:`, error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', JSON.stringify(error.response.data, null, 2));
      
      // Check if it's a text filter related error
      if (error.response.data.error && (
        error.response.data.error.includes('failed with code 1') ||
        error.response.data.error.includes('filter') ||
        error.response.data.error.includes('drawtext')
      )) {
        console.error('🚨 Text filter error detected! The fix may not have been applied correctly.');
      }
    }
    
    return false;
  }
}

async function runStyleEndpointTests() {
  console.log('🔧 Testing Style Endpoints with Empty Text Field Fixes');
  console.log('=' .repeat(60));
  
  const endpoints = ['style1', 'style2', 'style3', 'style4'];
  let successCount = 0;
  let totalTests = 0;
  
  // Test each style endpoint with empty author
  for (const endpoint of endpoints) {
    totalTests++;
    const success = await testStyleEndpoint(endpoint, testData, 'Empty Author Test');
    if (success) successCount++;
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(60));
  console.log(`✅ Successful: ${successCount}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 All style endpoints are working correctly with empty text fields!');
    console.log('🔧 The text filter fixes have been successfully applied.');
  } else {
    console.log('\n⚠️  Some endpoints still have issues. Please check the error messages above.');
  }
  
  // Test one endpoint with all empty fields
  console.log('\n🧪 Testing Style1 with ALL empty text fields...');
  totalTests++;
  const allEmptySuccess = await testStyleEndpoint('style1', testDataAllEmpty, 'All Empty Fields Test');
  if (allEmptySuccess) {
    successCount++;
    console.log('✅ Style1 handles all empty text fields correctly!');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Final Results: ${successCount}/${totalTests} tests passed`);
}

runStyleEndpointTests().catch(console.error);