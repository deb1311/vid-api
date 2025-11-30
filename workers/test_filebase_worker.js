/**
 * Test script for Filebase worker
 */

const WORKER_URL = 'http://127.0.0.1:8787';

async function testFilebaseWorker() {
  console.log('🧪 Testing Filebase Worker\n');

  // First, let's try to list files from a common bucket name
  // You'll need to replace 'my-bucket' with your actual bucket name
  const testBuckets = ['assets', 'videos', 'media', 'my-bucket', 'test'];

  console.log('📋 Attempting to list files from different bucket names...\n');

  for (const bucket of testBuckets) {
    try {
      console.log(`Trying bucket: ${bucket}`);
      const response = await fetch(`${WORKER_URL}/${bucket}?list`);
      const data = await response.json();

      if (response.ok && data.files) {
        console.log(`✅ SUCCESS! Found bucket: ${bucket}`);
        console.log(`   Files found: ${data.fileCount}`);
        console.log(`   Files:`, JSON.stringify(data.files.slice(0, 5), null, 2));
        
        // Try to fetch the first file
        if (data.files.length > 0) {
          const firstFile = data.files[0];
          console.log(`\n📥 Attempting to fetch first file: ${firstFile.name}`);
          
          const fileUrl = `${WORKER_URL}/${bucket}/${firstFile.name}`;
          const fileResponse = await fetch(fileUrl, { method: 'HEAD' });
          
          if (fileResponse.ok) {
            console.log(`✅ File fetch successful!`);
            console.log(`   Status: ${fileResponse.status}`);
            console.log(`   Content-Type: ${fileResponse.headers.get('content-type')}`);
            console.log(`   Content-Length: ${fileResponse.headers.get('content-length')}`);
            console.log(`   CORS: ${fileResponse.headers.get('access-control-allow-origin')}`);
          } else {
            console.log(`❌ File fetch failed: ${fileResponse.status} ${fileResponse.statusText}`);
          }
        }
        
        return; // Exit after finding a working bucket
      } else {
        console.log(`   ❌ ${data.error || 'Not found'}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('\n⚠️  Could not find any accessible buckets.');
  console.log('Please provide your actual Filebase bucket name to test.');
}

testFilebaseWorker().catch(console.error);
