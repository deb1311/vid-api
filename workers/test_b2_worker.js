/**
 * Test script for B2 Worker
 * Tests fetching files from assets-3234 bucket
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'assets-3234';

// Test files - update these with actual files in your bucket
const TEST_FILES = [
  'test.mp4',
  'videos/sample.mp4',
  'images/photo.jpg'
];

async function testFile(filePath) {
  const url = `${WORKER_URL}/${BUCKET}/${filePath}`;
  console.log(`\n🧪 Testing: ${filePath}`);
  console.log(`   URL: ${url}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const duration = Date.now() - startTime;
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Duration: ${duration}ms`);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const cors = response.headers.get('access-control-allow-origin');
      
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Content-Length: ${contentLength ? (contentLength / 1024).toFixed(2) + ' KB' : 'unknown'}`);
      console.log(`   CORS: ${cors}`);
      console.log(`   ✅ Success!`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Fetch Error: ${error.message}`);
    return false;
  }
}

async function testWorkerHealth() {
  console.log('🏥 Testing Worker Health...');
  const url = `${WORKER_URL}/`;
  
  try {
    const response = await fetch(url);
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 400) {
      console.log('   ✅ Worker is responding (expected 400 for root path)');
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Worker not responding: ${error.message}`);
    console.log('   Make sure worker is running: wrangler dev --config filebase-fetcher-wrangler.toml');
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('  B2 Worker Test - assets-3234 Bucket');
  console.log('═══════════════════════════════════════');
  
  // Test worker health
  const isHealthy = await testWorkerHealth();
  if (!isHealthy) {
    console.log('\n❌ Worker is not running. Start it with:');
    console.log('   cd workers && wrangler dev --config filebase-fetcher-wrangler.toml');
    process.exit(1);
  }
  
  // Test files
  console.log('\n📁 Testing Files...');
  let successCount = 0;
  
  for (const file of TEST_FILES) {
    const success = await testFile(file);
    if (success) successCount++;
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${successCount}/${TEST_FILES.length} tests passed`);
  console.log('═══════════════════════════════════════');
  
  if (successCount === 0) {
    console.log('\n💡 Tips:');
    console.log('   - Make sure files exist in assets-3234 bucket');
    console.log('   - Update TEST_FILES array with actual file paths');
    console.log('   - Check B2 credentials are correct');
  }
}

// Run tests
runTests().catch(console.error);
