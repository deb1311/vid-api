/**
 * Test if IPFS URLs are accessible
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'stock-clips';

async function testIPFSUrl() {
  console.log('🧪 Testing IPFS URL accessibility\n');

  // Get first file
  const response = await fetch(`${WORKER_URL}/${BUCKET}?list`);
  const data = await response.json();

  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    
    console.log(`Testing file: ${file.name}`);
    console.log(`CID: ${file.cid}`);
    console.log(`IPFS URL: ${file.ipfsUrl}\n`);

    // Test IPFS URL
    console.log('📥 Testing IPFS URL with HEAD request...');
    try {
      const ipfsResponse = await fetch(file.ipfsUrl, { method: 'HEAD' });
      
      if (ipfsResponse.ok) {
        console.log(`✅ IPFS URL is accessible!`);
        console.log(`   Status: ${ipfsResponse.status}`);
        console.log(`   Content-Type: ${ipfsResponse.headers.get('content-type')}`);
        console.log(`   Content-Length: ${ipfsResponse.headers.get('content-length')}`);
        console.log(`   Accept-Ranges: ${ipfsResponse.headers.get('accept-ranges')}`);
      } else {
        console.log(`❌ IPFS URL failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error accessing IPFS URL: ${error.message}`);
    }

    // Test S3 URL via worker
    console.log(`\n📥 Testing S3 URL via worker...`);
    const workerUrl = `${WORKER_URL}/${BUCKET}/${file.name}`;
    const workerResponse = await fetch(workerUrl, { method: 'HEAD' });
    
    if (workerResponse.ok) {
      console.log(`✅ Worker URL is accessible!`);
      console.log(`   Status: ${workerResponse.status}`);
      console.log(`   Content-Type: ${workerResponse.headers.get('content-type')}`);
      console.log(`   Content-Length: ${workerResponse.headers.get('content-length')}`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   IPFS Gateway: ${file.ipfsUrl}`);
    console.log(`   Worker Proxy: ${workerUrl}`);
    console.log(`   Direct S3: ${file.url}`);
  }
}

testIPFSUrl().catch(console.error);
