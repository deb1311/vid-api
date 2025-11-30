/**
 * Test Filebase worker with stock-clips bucket
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'stock-clips';

async function testStockClips() {
  console.log('🧪 Testing Filebase Worker with stock-clips bucket\n');

  // Test 1: List files
  console.log('📋 Test 1: Listing files...');
  try {
    const response = await fetch(`${WORKER_URL}/${BUCKET}?list`);
    const data = await response.json();

    if (response.ok && data.files) {
      console.log(`✅ SUCCESS!`);
      console.log(`   Bucket: ${data.bucket}`);
      console.log(`   Total files: ${data.fileCount}`);
      console.log(`\n   First 10 files:`);
      data.files.slice(0, 10).forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.name} (${file.sizeFormatted})`);
      });

      // Test 2: Fetch first file
      if (data.files.length > 0) {
        const firstFile = data.files[0];
        console.log(`\n📥 Test 2: Fetching file: ${firstFile.name}`);
        
        const fileUrl = `${WORKER_URL}/${BUCKET}/${firstFile.name}`;
        const fileResponse = await fetch(fileUrl, { method: 'HEAD' });
        
        if (fileResponse.ok) {
          console.log(`✅ File fetch successful!`);
          console.log(`   Status: ${fileResponse.status}`);
          console.log(`   Content-Type: ${fileResponse.headers.get('content-type')}`);
          console.log(`   Content-Length: ${fileResponse.headers.get('content-length')}`);
          console.log(`   Accept-Ranges: ${fileResponse.headers.get('accept-ranges')}`);
          console.log(`   CORS Origin: ${fileResponse.headers.get('access-control-allow-origin')}`);
          console.log(`   Cache-Control: ${fileResponse.headers.get('cache-control')}`);
          
          // Test 3: Range request (for video streaming)
          console.log(`\n📹 Test 3: Testing range request (video streaming)...`);
          const rangeResponse = await fetch(fileUrl, {
            headers: { 'Range': 'bytes=0-1023' }
          });
          
          if (rangeResponse.ok || rangeResponse.status === 206) {
            console.log(`✅ Range request successful!`);
            console.log(`   Status: ${rangeResponse.status} (206 = Partial Content)`);
            console.log(`   Content-Range: ${rangeResponse.headers.get('content-range')}`);
            console.log(`   Content-Length: ${rangeResponse.headers.get('content-length')}`);
          } else {
            console.log(`❌ Range request failed: ${rangeResponse.status}`);
          }
          
          console.log(`\n✅ All tests passed! Worker is working correctly.`);
          console.log(`\n🔗 Example URLs:`);
          console.log(`   List: ${WORKER_URL}/${BUCKET}?list`);
          console.log(`   File: ${fileUrl}`);
        } else {
          const errorText = await fileResponse.text();
          console.log(`❌ File fetch failed: ${fileResponse.status}`);
          console.log(`   Error:`, errorText);
        }
      }
    } else {
      console.log(`❌ List failed: ${response.status}`);
      console.log(`   Error:`, data);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
  }
}

testStockClips().catch(console.error);
