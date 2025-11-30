/**
 * Test video duration parsing
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'stock-clips';

async function testDuration() {
  console.log('🧪 Testing Video Duration Parsing\n');

  console.log('📋 Fetching files with duration...');
  try {
    const response = await fetch(`${WORKER_URL}/${BUCKET}?list`);
    const data = await response.json();

    if (response.ok && data.files) {
      console.log(`✅ SUCCESS!`);
      console.log(`   Total files: ${data.fileCount}`);
      console.log(`\n   First 10 files with metadata:\n`);
      
      data.files.slice(0, 10).forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.name}`);
        console.log(`      Size: ${file.sizeFormatted}`);
        console.log(`      Duration: ${file.duration ? file.duration + 's' : 'N/A'}`);
        console.log(`      CID: ${file.cid ? file.cid.substring(0, 20) + '...' : 'N/A'}`);
        console.log(`      IPFS: ${file.ipfsUrl ? '✓' : '✗'}`);
        console.log('');
      });

      // Count files with duration
      const filesWithDuration = data.files.filter(f => f.duration);
      console.log(`   Files with duration: ${filesWithDuration.length}/${data.fileCount}`);

      if (filesWithDuration.length > 0) {
        const avgDuration = filesWithDuration.reduce((sum, f) => sum + f.duration, 0) / filesWithDuration.length;
        const maxDuration = Math.max(...filesWithDuration.map(f => f.duration));
        const minDuration = Math.min(...filesWithDuration.map(f => f.duration));
        
        console.log(`\n📊 Duration Statistics:`);
        console.log(`   Average: ${avgDuration.toFixed(2)}s`);
        console.log(`   Min: ${minDuration.toFixed(2)}s`);
        console.log(`   Max: ${maxDuration.toFixed(2)}s`);
        
        console.log(`\n✅ Duration parsing is working!`);
      } else {
        console.log(`\n⚠️  No durations found.`);
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

testDuration().catch(console.error);
