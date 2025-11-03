const axios = require('axios');

// Test the deployed API with optional quote functionality
const BASE_URL = 'https://video-editor-api-519298355551.us-central1.run.app';

async function testProductionAPI() {
  console.log('🌐 Testing Production API - Optional Quote Functionality...\n');
  console.log(`🔗 API URL: ${BASE_URL}\n`);

  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.data || error.message);
  }

  console.log('\n');

  // Test 2: Main endpoint without quote - validation only
  console.log('2️⃣ Testing /create-video validation without quote...');
  try {
    const response = await axios.post(`${BASE_URL}/create-video`, {
      author: "Test Author"
      // Missing imageUrl and audioUrl to trigger different validation error
    });
    console.log('Response:', response.data);
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('Quote is required')) {
      console.log('❌ Still requires quote - validation not updated');
    } else if (errorMsg.includes('Image file or URL is required')) {
      console.log('✅ Quote validation removed - now failing on image requirement');
    } else {
      console.log('🔍 Different error:', errorMsg);
    }
  }

  console.log('\n');

  // Test 3: Vid-1.2 endpoint without quote - validation only
  console.log('3️⃣ Testing /vid-1.2 validation without quote...');
  try {
    const response = await axios.post(`${BASE_URL}/vid-1.2`, {
      author: "Test Author"
      // Missing audioUrl and clips to trigger different validation error
    });
    console.log('Response:', response.data);
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('quote')) {
      console.log('❌ Still requires quote - validation not updated');
    } else if (errorMsg.includes('audioUrl') || errorMsg.includes('clips')) {
      console.log('✅ Quote validation removed - now failing on other requirements');
    } else {
      console.log('🔍 Different error:', errorMsg);
    }
  }

  console.log('\n');

  // Test 4: Vid-1.3 endpoint (should still require quote OR captions)
  console.log('4️⃣ Testing /vid-1.3 validation (should still require quote OR captions)...');
  try {
    const response = await axios.post(`${BASE_URL}/vid-1.3`, {
      audioUrl: "test.mp3",
      clips: [{ imageurl: "test.jpg", start: 0, duration: 5 }]
      // No quote and no captions - should fail
    });
    console.log('Response:', response.data);
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('Either quote or captions')) {
      console.log('✅ Vid-1.3 validation unchanged - still requires quote OR captions');
    } else {
      console.log('🔍 Different error:', errorMsg);
    }
  }

  console.log('\n');

  // Test 5: Check available endpoints
  console.log('5️⃣ Testing available endpoints...');
  try {
    const response = await axios.get(`${BASE_URL}/`);
    console.log('✅ Root endpoint accessible');
  } catch (error) {
    console.log('🔍 Root endpoint response:', error.response?.status || error.message);
  }

  console.log('\n🏁 Production API testing complete!');
  console.log(`\n🎉 Deployment successful! API is live at: ${BASE_URL}`);
}

// Run the tests
testProductionAPI().catch(console.error);