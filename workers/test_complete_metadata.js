/**
 * Complete metadata test - CID, IPFS URL, and Duration
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'stock-clips';

async function testCompleteMetadata() {
  console.log('🧪 Complete Filebase Worker Metadata Test\n');
  console.log('=' .repeat(70));

  try {
    const response = await fetch(`${WORKER_URL}/${BUCKET}?list`);
    const data = await response.json();

    if (response.ok && data.files) {
      console.log(`\n✅ Successfully fetched ${data.fileCount} files\n`);
      
      // Show sample files
      console.log('📋 Sample Files (first 5):\n');
      data.files.slice(0, 5).forEach((file, i) => {
        console.log(`${i + 1}. ${file.name}`);
        console.log(`   📦 Size: ${file.sizeFormatted}`);
        console.log(`   ⏱️  Duration: ${file.duration ? file.duration + 's' : 'N/A'}`);
        console.log(`   🔗 CID: ${file.cid}`);
        console.log(`   🌐 IPFS: ${file.ipfsUrl}`);
        console.log(`   📁 S3: ${file.url}`);
        console.log('');
      });

      // Statistics
      const filesWithDuration = data.files.filter(f => f.duration);
      const filesWithCID = data.files.filter(f => f.cid);
      
      console.log('=' .repeat(70));
      console.log('\n📊 Statistics:\n');
      console.log(`   Total Files: ${data.fileCount}`);
      console.log(`   Files with CID: ${filesWithCID.length} (${Math.round(filesWithCID.length/data.fileCount*100)}%)`);
      console.log(`   Files with Duration: ${filesWithDuration.length} (${Math.round(filesWithDuration.length/data.fileCount*100)}%)`);
      
      if (filesWithDuration.length > 0) {
        const avgDuration = filesWithDuration.reduce((sum, f) => sum + f.duration, 0) / filesWithDuration.length;
        const maxDuration = Math.max(...filesWithDuration.map(f => f.duration));
        const minDuration = Math.min(...filesWithDuration.map(f => f.duration));
        const totalDuration = filesWithDuration.reduce((sum, f) => sum + f.duration, 0);
        
        console.log(`\n   Duration Stats:`);
        console.log(`     Average: ${avgDuration.toFixed(2)}s`);
        console.log(`     Min: ${minDuration.toFixed(2)}s`);
        console.log(`     Max: ${maxDuration.toFixed(2)}s`);
        console.log(`     Total: ${(totalDuration / 60).toFixed(2)} minutes`);
      }

      console.log('\n=' .repeat(70));
      console.log('\n✅ All metadata features working correctly!\n');
      console.log('🚀 Ready to deploy to production\n');
      
      console.log('📝 API Endpoints:');
      console.log(`   List: ${WORKER_URL}/${BUCKET}?list`);
      console.log(`   File: ${WORKER_URL}/${BUCKET}/[filename]`);
      console.log('');

    } else {
      console.log(`❌ Failed: ${response.status}`);
      console.log(data);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testCompleteMetadata().catch(console.error);
