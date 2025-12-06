const axios = require('axios');
const fs = require('fs');

async function testVid1() {
  try {
    console.log('🎬 Testing Vid-1 endpoint with text escaping...');
    
    const testData = JSON.parse(fs.readFileSync('test_vid1_text_escape.json', 'utf8'));
    
    const payload = {
      endpoint: 'vid-1',
      data: testData
    };
    
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post('http://localhost:8080/master', payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minute timeout
    });
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.url) {
      console.log(`\n🎥 Video URL: ${response.data.url}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testVid1();
