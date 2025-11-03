const axios = require('axios');

// Test just the validation - no actual video processing
const BASE_URL = 'http://localhost:8080';

async function testValidation() {
  console.log('🧪 Testing Quote Parameter Validation...\n');

  // Test 1: Main endpoint without quote - should pass validation
  console.log('1️⃣ Testing /create-video validation without quote...');
  try {
    const response1 = await axios.post(`${BASE_URL}/create-video`, {
      author: "Test Author"
      // Missing imageUrl and audioUrl to trigger different validation error
    });
    console.log('Response:', response1.data);
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

  // Test 2: Vid-1.2 endpoint without quote - should pass validation
  console.log('2️⃣ Testing /vid-1.2 validation without quote...');
  try {
    const response2 = await axios.post(`${BASE_URL}/vid-1.2`, {
      author: "Test Author"
      // Missing audioUrl and clips to trigger different validation error
    });
    console.log('Response:', response2.data);
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

  // Test 3: Check that other endpoints still work as expected
  console.log('3️⃣ Testing /vid-1.3 validation (should still require quote OR captions)...');
  try {
    const response3 = await axios.post(`${BASE_URL}/vid-1.3`, {
      audioUrl: "test.mp3",
      clips: [{ imageurl: "test.jpg", start: 0, duration: 5 }]
      // No quote and no captions - should fail
    });
    console.log('Response:', response3.data);
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('Either quote or captions')) {
      console.log('✅ Vid-1.3 validation unchanged - still requires quote OR captions');
    } else {
      console.log('🔍 Different error:', errorMsg);
    }
  }

  console.log('\n🏁 Validation testing complete!');
}

// Run the tests
testValidation().catch(console.error);