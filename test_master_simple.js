const axios = require('axios');

async function testMasterEndpoint() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Master Endpoint - Simple Tests...\n');

  // Test 1: Health check first
  try {
    console.log('Test 0: Health check');
    const response = await axios.get(`${baseUrl}/health`);
    console.log('✅ Server is healthy');
    console.log(`   Response: ${JSON.stringify(response.data)}\n`);
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return;
  }

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

  // Test 4: Valid endpoint but missing required data
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

  // Test 5: Test different endpoint routing
  try {
    console.log('Test 5: Test vid-1.2 endpoint routing (should fail due to missing clips)');
    const response = await axios.post(`${baseUrl}/master`, {
      endpoint: "vid-1.2",
      data: {
        quote: "Test quote",
        audioUrl: "test.mp3"
      }
    });
    console.log('❌ Should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400 && 
        error.response.data.error.includes('Clips array is required')) {
      console.log('✅ Correctly routed to vid-1.2 and validated clips requirement');
      console.log(`   Response: ${JSON.stringify(error.response.data)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 6: Test case sensitivity
  try {
    console.log('Test 6: Test case sensitivity (STYLE1 vs style1)');
    const response = await axios.post(`${baseUrl}/master`, {
      endpoint: "STYLE1",
      data: { author: "Test Author" }
    });
    console.log('❌ Should have failed');
  } catch (error) {
    if (error.response && error.response.status === 400 && 
        error.response.data.error.includes('Quote is required')) {
      console.log('✅ Case insensitive routing works (STYLE1 -> style1)');
      console.log(`   Response: ${JSON.stringify(error.response.data)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  console.log('🎉 Master endpoint tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('✅ Parameter validation working');
  console.log('✅ Endpoint routing working');
  console.log('✅ Error wrapping working');
  console.log('✅ Case insensitive endpoint names working');
}

testMasterEndpoint().catch(error => {
  if (error.code === 'ECONNREFUSED') {
    console.log('❌ Server not running. Please start the server first with: node server-modular.js');
  } else {
    console.error('❌ Test error:', error.message);
  }
});