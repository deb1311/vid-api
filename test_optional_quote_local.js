const axios = require('axios');

// Test the optional quote functionality locally
const BASE_URL = 'http://localhost:8080';

async function testOptionalQuote() {
  console.log('🧪 Testing Optional Quote Functionality...\n');

  // Test 1: Main endpoint without quote
  console.log('1️⃣ Testing /create-video without quote...');
  try {
    const response1 = await axios.post(`${BASE_URL}/create-video`, {
      author: "Test Author",
      imageUrl: "https://picsum.photos/1080/1920",
      audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    });
    console.log('✅ Main endpoint works without quote');
    console.log('Response:', response1.data.message);
  } catch (error) {
    console.log('❌ Main endpoint failed:', error.response?.data || error.message);
  }

  console.log('\n');

  // Test 2: Vid-1.2 endpoint without quote
  console.log('2️⃣ Testing /vid-1.2 without quote...');
  try {
    const response2 = await axios.post(`${BASE_URL}/vid-1.2`, {
      audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      author: "Test Author",
      watermark: "Test Brand",
      clips: [
        {
          url: "https://picsum.photos/1080/1920",
          start: 0,
          duration: 5
        }
      ]
    });
    console.log('✅ Vid-1.2 endpoint works without quote');
    console.log('Response:', response2.data.message);
  } catch (error) {
    console.log('❌ Vid-1.2 endpoint failed:', error.response?.data || error.message);
  }

  console.log('\n');

  // Test 3: Main endpoint with quote (backward compatibility)
  console.log('3️⃣ Testing /create-video with quote (backward compatibility)...');
  try {
    const response3 = await axios.post(`${BASE_URL}/create-video`, {
      quote: "This is a test quote",
      author: "Test Author",
      imageUrl: "https://picsum.photos/1080/1920",
      audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    });
    console.log('✅ Main endpoint works with quote (backward compatible)');
    console.log('Response:', response3.data.message);
  } catch (error) {
    console.log('❌ Main endpoint with quote failed:', error.response?.data || error.message);
  }

  console.log('\n');

  // Test 4: Vid-1.2 endpoint with quote (backward compatibility)
  console.log('4️⃣ Testing /vid-1.2 with quote (backward compatibility)...');
  try {
    const response4 = await axios.post(`${BASE_URL}/vid-1.2`, {
      quote: "This is a test quote",
      audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      author: "Test Author",
      watermark: "Test Brand",
      clips: [
        {
          url: "https://picsum.photos/1080/1920",
          start: 0,
          duration: 5
        }
      ]
    });
    console.log('✅ Vid-1.2 endpoint works with quote (backward compatible)');
    console.log('Response:', response4.data.message);
  } catch (error) {
    console.log('❌ Vid-1.2 endpoint with quote failed:', error.response?.data || error.message);
  }

  console.log('\n🏁 Testing complete!');
}

// Run the tests
testOptionalQuote().catch(console.error);