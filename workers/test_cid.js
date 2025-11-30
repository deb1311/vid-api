/**
 * Test CID fetching from Filebase worker
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'stock-clips';

async function testCID() {
  console.log('🧪 Testing CID and IPFS URL generation\n');

  console.log('📋 Listing files with CID...');
  try {
    const response = await fetch(`${WORKER_URL}/${BUCKET}?list`);
    const data = await response.json();

    if (response.ok && data.files) {
      console.log(`✅ SUCCESS!`);
      console.log(`   Total files: ${data.fileCount}`);
      console.log(`\n   First 5 files with CID and IPFS URLs:\n`);
      
      data.files.slice(0, 5).forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.name}`);
        console.log(`      Size: ${file.sizeFormatted}`);
        console.log(`      CID: ${file.cid || 'N/A'}`);
        console.log(`      IPFS URL: ${file.ipfsUrl || 'N/A'}`);
        console.log(`      S3 URL: ${file.url}`);
        console.log('');
      });

      // Count files with CID
      const filesWithCID = data.files.filter(f => f.cid);
      console.log(`   Files with CID: ${filesWithCID.length}/${data.fileCount}`);

      if (filesWithCID.length > 0) {
        console.log(`\n✅ CID fetching is working!`);
        console.log(`\n🔗 Example IPFS URL:`);
        console.log(`   ${filesWithCID[0].ipfsUrl}`);
      } else {
        console.log(`\n⚠️  No CIDs found. Files may not be pinned to IPFS yet.`);
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

testCID().catch(console.error);
