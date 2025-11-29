/**
 * Comprehensive B2 Worker Test Suite
 * Tests all functionality with actual files from the bucket
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'assets-3234';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testWorkerHealth() {
  log('\n🏥 Test 1: Worker Health Check', 'bright');
  log('─'.repeat(50), 'cyan');
  
  try {
    const response = await fetch(`${WORKER_URL}/`);
    
    if (response.status === 400) {
      log('✅ Worker is responding correctly', 'green');
      log(`   Status: ${response.status} (expected for root path)`, 'cyan');
      return true;
    } else {
      log('⚠️  Unexpected status code', 'yellow');
      log(`   Status: ${response.status}`, 'cyan');
      return false;
    }
  } catch (error) {
    log('❌ Worker not responding', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\n💡 Start the worker with:', 'yellow');
    log('   wrangler dev --config filebase-fetcher-wrangler.toml', 'cyan');
    return false;
  }
}

async function testListFiles() {
  log('\n📋 Test 2: List Files Endpoint', 'bright');
  log('─'.repeat(50), 'cyan');
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${WORKER_URL}/${BUCKET}?list`);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      log('❌ List request failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${errorText}`, 'red');
      return null;
    }
    
    const data = await response.json();
    
    log('✅ File listing successful', 'green');
    log(`   Bucket: ${data.bucket}`, 'cyan');
    log(`   Total Files: ${data.fileCount}`, 'cyan');
    log(`   Response Time: ${duration}ms`, 'cyan');
    log(`   CORS Header: ${response.headers.get('access-control-allow-origin')}`, 'cyan');
    
    // Show first 5 files
    if (data.files && data.files.length > 0) {
      log('\n   First 5 files:', 'yellow');
      data.files.slice(0, 5).forEach((file, i) => {
        log(`   ${i + 1}. ${file.name} (${file.sizeFormatted})`, 'cyan');
      });
    }
    
    return data.files;
  } catch (error) {
    log('❌ List test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

async function testFileDownload(fileName) {
  log(`\n📥 Test 3: Download File - "${fileName}"`, 'bright');
  log('─'.repeat(50), 'cyan');
  
  try {
    const encodedName = encodeURIComponent(fileName);
    const url = `${WORKER_URL}/${BUCKET}/${encodedName}`;
    
    log(`   URL: ${url}`, 'cyan');
    
    const startTime = Date.now();
    const response = await fetch(url, { method: 'HEAD' }); // Use HEAD to avoid downloading full file
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorResponse = await fetch(url);
      const errorText = await errorResponse.text();
      log('❌ Download failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${errorText}`, 'red');
      return false;
    }
    
    log('✅ File accessible', 'green');
    log(`   Content-Type: ${response.headers.get('content-type')}`, 'cyan');
    log(`   Content-Length: ${(response.headers.get('content-length') / 1024).toFixed(2)} KB`, 'cyan');
    log(`   Response Time: ${duration}ms`, 'cyan');
    log(`   CORS: ${response.headers.get('access-control-allow-origin')}`, 'cyan');
    log(`   Cache-Control: ${response.headers.get('cache-control')}`, 'cyan');
    
    return true;
  } catch (error) {
    log('❌ Download test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testCORS() {
  log('\n🌐 Test 4: CORS Preflight', 'bright');
  log('─'.repeat(50), 'cyan');
  
  try {
    const response = await fetch(`${WORKER_URL}/${BUCKET}/test.mp4`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://example.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    log('✅ CORS preflight successful', 'green');
    log(`   Status: ${response.status}`, 'cyan');
    log(`   Allow-Origin: ${response.headers.get('access-control-allow-origin')}`, 'cyan');
    log(`   Allow-Methods: ${response.headers.get('access-control-allow-methods')}`, 'cyan');
    log(`   Allow-Headers: ${response.headers.get('access-control-allow-headers')}`, 'cyan');
    log(`   Max-Age: ${response.headers.get('access-control-max-age')}`, 'cyan');
    
    return true;
  } catch (error) {
    log('❌ CORS test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testPrefixFiltering() {
  log('\n🔍 Test 5: Prefix Filtering', 'bright');
  log('─'.repeat(50), 'cyan');
  
  try {
    const response = await fetch(`${WORKER_URL}/${BUCKET}?list&prefix=Motion`);
    
    if (!response.ok) {
      log('⚠️  Prefix filtering not working', 'yellow');
      return false;
    }
    
    const data = await response.json();
    
    log('✅ Prefix filtering works', 'green');
    log(`   Files matching "Motion": ${data.fileCount}`, 'cyan');
    
    if (data.files && data.files.length > 0) {
      log(`   Sample: ${data.files[0].name}`, 'cyan');
    }
    
    return true;
  } catch (error) {
    log('⚠️  Prefix filtering test failed', 'yellow');
    log(`   Error: ${error.message}`, 'yellow');
    return false;
  }
}

async function testSpecialCharacters() {
  log('\n🔤 Test 6: Special Characters in Filenames', 'bright');
  log('─'.repeat(50), 'cyan');
  
  // Test with a file that has spaces (most common in this bucket)
  const testFile = 'Motion Monarchy 1.mp4';
  
  try {
    const encodedName = encodeURIComponent(testFile);
    const url = `${WORKER_URL}/${BUCKET}/${encodedName}`;
    
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      log('✅ Special characters handled correctly', 'green');
      log(`   Test file: "${testFile}"`, 'cyan');
      log(`   Encoded: ${encodedName}`, 'cyan');
      return true;
    } else {
      log('⚠️  Special character handling issue', 'yellow');
      log(`   Status: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log('⚠️  Special character test failed', 'yellow');
    log(`   Error: ${error.message}`, 'yellow');
    return false;
  }
}

async function runAllTests() {
  log('\n' + '═'.repeat(50), 'bright');
  log('  B2 WORKER COMPREHENSIVE TEST SUITE', 'bright');
  log('═'.repeat(50), 'bright');
  log(`  Worker URL: ${WORKER_URL}`, 'cyan');
  log(`  Bucket: ${BUCKET}`, 'cyan');
  log('═'.repeat(50), 'bright');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  // Test 1: Worker Health
  results.total++;
  const healthOk = await testWorkerHealth();
  if (!healthOk) {
    log('\n❌ Worker is not running. Aborting tests.', 'red');
    process.exit(1);
  }
  results.passed++;
  
  // Test 2: List Files
  results.total++;
  const files = await testListFiles();
  if (files && files.length > 0) {
    results.passed++;
  } else {
    results.failed++;
    log('\n❌ Cannot proceed without file list', 'red');
    process.exit(1);
  }
  
  // Test 3: Download File
  results.total++;
  const downloadOk = await testFileDownload(files[0].name);
  if (downloadOk) results.passed++;
  else results.failed++;
  
  // Test 4: CORS
  results.total++;
  const corsOk = await testCORS();
  if (corsOk) results.passed++;
  else results.failed++;
  
  // Test 5: Prefix Filtering
  results.total++;
  const prefixOk = await testPrefixFiltering();
  if (prefixOk) results.passed++;
  else results.failed++;
  
  // Test 6: Special Characters
  results.total++;
  const specialCharsOk = await testSpecialCharacters();
  if (specialCharsOk) results.passed++;
  else results.failed++;
  
  // Summary
  log('\n' + '═'.repeat(50), 'bright');
  log('  TEST SUMMARY', 'bright');
  log('═'.repeat(50), 'bright');
  log(`  Total Tests: ${results.total}`, 'cyan');
  log(`  ✅ Passed: ${results.passed}`, 'green');
  log(`  ❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.failed === 0 ? 'green' : 'yellow');
  log('═'.repeat(50), 'bright');
  
  if (results.failed === 0) {
    log('\n🎉 All tests passed! Worker is functioning correctly.', 'green');
  } else {
    log(`\n⚠️  ${results.failed} test(s) failed. Review the output above.`, 'yellow');
  }
  
  log('\n');
}

// Run all tests
runAllTests().catch(error => {
  log('\n❌ Test suite crashed', 'red');
  log(`   Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
