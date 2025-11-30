/**
 * Detailed test for Filebase worker with error logging
 */

const WORKER_URL = 'http://127.0.0.1:8787';

async function testDetailed() {
  console.log('🔍 Detailed Filebase Worker Test\n');

  // Test with a bucket name
  const bucket = 'assets';
  
  try {
    console.log(`Testing bucket: ${bucket}`);
    const response = await fetch(`${WORKER_URL}/${bucket}?list`);
    const data = await response.json();

    console.log('\n📊 Response:');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Data:`, JSON.stringify(data, null, 2));

    if (data.error) {
      console.log('\n❌ Error Details:');
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message || 'N/A'}`);
      console.log(`Details: ${data.details || 'N/A'}`);
    }

  } catch (error) {
    console.log('\n❌ Exception:', error.message);
    console.log(error.stack);
  }
}

testDetailed().catch(console.error);
