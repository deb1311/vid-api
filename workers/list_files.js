// Quick script to list files in assets-3234 bucket
const WORKER_URL = 'http://127.0.0.1:8787';

async function listFiles() {
  try {
    const response = await fetch(`${WORKER_URL}/assets-3234?list`);
    const data = await response.json();
    
    console.log(`\n📦 Bucket: ${data.bucket}`);
    console.log(`📊 Total Files: ${data.fileCount}\n`);
    
    console.log('First 20 files:\n');
    data.files.slice(0, 20).forEach((file, i) => {
      const icon = file.contentType?.startsWith('video/') ? '🎥' : 
                   file.contentType?.startsWith('image/') ? '🖼️' : '📄';
      console.log(`${i + 1}. ${icon} ${file.name}`);
      console.log(`   Size: ${file.sizeFormatted} | Type: ${file.contentType || 'unknown'}`);
      console.log(`   URL: ${WORKER_URL}/assets-3234/${file.name}\n`);
    });
    
    if (data.fileCount > 20) {
      console.log(`...and ${data.fileCount - 20} more files\n`);
    }
    
    console.log('✅ Worker is functioning correctly!');
    console.log('\nTo test a file, use:');
    console.log(`  ${WORKER_URL}/assets-3234/[filename]`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listFiles();
