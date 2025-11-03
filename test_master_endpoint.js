const axios = require('axios');

// Test the master endpoint
async function testMasterEndpoint() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Master Endpoint...\n');

  // Test 1: Missing endpoint parameter
  try {
    console.log('Test 1: Missing endpoint parameter');
    const response = await axios.post(`${baseUrl}/master`, {
      data: { quote: "Test quote" }
    });
    console.log('❌ Should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctly rejected missing endpoint parameter');
      console.log(`   Response: ${JSON.stringify(error.response.data)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 2: Missing data parameter
  try {
    console.log('Test 2: Missing data parameter');
    const response = await axios.post(`${baseUrl}/master`, {
      endpoint: "style1"
    });
    console.log('❌ Should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctly rejected missing data parameter');
      console.log(`   Response: ${JSON.stringify(error.response.data)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 3: Invalid endpoint
  try {
    console.log('Test 3: Invalid endpoint');
    const response = await axios.post(`${baseUrl}/master`, {
      endpoint: "invalid-endpoint",
      data: { quote: "Test quote" }
    });
    console.log('❌ Should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctly rejected invalid endpoint');
      console.log(`   Response: ${JSON.stringify(error.response.data)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 4: Valid endpoint but missing required data (should fail at endpoint level)
  try {
    console.log('Test 4: Valid endpoint but missing required data');
    const response = await axios.post(`${baseUrl}/master`, {
      endpoint: "style1",
      data: { author: "Test Author" } // Missing required quote
    });
    console.log('❌ Should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctly rejected missing quote parameter');
      console.log(`   Response: ${JSON.stringify(error.response.data)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 5: Valid request structure (will fail due to missing files, but should show proper routing)
  try {
    console.log('Test 5: Valid request structure (will fail due to missing files)');
    const response = await axios.post(`${baseUrl}/master`, {
      endpoint: "style1",
      data: {
        quote: "This is a test quote",
        author: "Test Author",
        imageUrl: "https://example.com/test.jpg",
        audioUrl: "https://example.com/test.mp3"
      }
    });
    console.log('❌ Should have failed due to missing files');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Request properly routed to style1 endpoint');
      console.log(`   Response: ${JSON.stringify(error.response.data)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('🎉 Master endpoint tests completed!');
}

// Run tests if server is running
testMasterEndpoint().catch(error => {
  if (error.code === 'ECONNREFUSED') {
    console.log('❌ Server not running. Please start the server first with: node server-modular.js');
  } else {
    console.error('❌ Test error:', error.message);
  }
});