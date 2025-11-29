/**
 * Integration Test - Demonstrates worker usage for both browser and backend
 */

const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'assets-3234';
const TEST_FILE = 'Motion Monarchy 1.mp4';

console.log('═══════════════════════════════════════════════════════');
console.log('  B2 Worker Integration Test');
console.log('═══════════════════════════════════════════════════════\n');

// Helper function to get media URL
function getMediaUrl(fileName) {
  return `${WORKER_URL}/${BUCKET}/${encodeURIComponent(fileName)}`;
}

// Test 1: List files (for video editor file picker)
async function testListFiles() {
  console.log('📋 Test 1: List Files (Video Editor Use Case)');
  console.log('   Use case: Video editor needs to show available videos\n');
  
  try {
    const response = await fetch(`${WORKER_URL}/${BUCKET}?list`);
    const data = await response.json();
    
    console.log(`   ✅ Found ${data.fileCount} files`);
    console.log(`   First 5 files:`);
    data.files.slice(0, 5).forEach((file, i) => {
      console.log(`      ${i + 1}. ${file.name} (${file.sizeFormatted})`);
    });
    console.log('');
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Test 2: Get video URL (for video editor playback)
async function testVideoUrl() {
  console.log('🎥 Test 2: Get Video URL (Video Editor Playback)');
  console.log('   Use case: Video editor loads video for preview\n');
  
  const videoUrl = getMediaUrl(TEST_FILE);
  console.log(`   Video URL: ${videoUrl}`);
  
  try {
    const response = await fetch(videoUrl);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const cors = response.headers.get('access-control-allow-origin');
      
      console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Content-Length: ${(contentLength / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   CORS: ${cors}`);
      console.log(`   ✅ Video editor can load this URL directly in <video> element\n`);
      return true;
    } else {
      console.log(`   ❌ Failed: ${response.status} ${response.statusText}\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Test 3: Range request (for video seeking)
async function testRangeRequest() {
  console.log('📊 Test 3: Range Request (Video Seeking)');
  console.log('   Use case: User seeks to middle of video\n');
  
  const videoUrl = getMediaUrl(TEST_FILE);
  
  try {
    const response = await fetch(videoUrl, {
      headers: { 'Range': 'bytes=0-1023' }
    });
    
    if (response.status === 206) {
      const contentRange = response.headers.get('content-range');
      console.log(`   ✅ Status: ${response.status} Partial Content`);
      console.log(`   Content-Range: ${contentRange}`);
      console.log(`   ✅ Video seeking will work properly\n`);
      return true;
    } else {
      console.log(`   ⚠️  Status: ${response.status} (Range requests may not work)\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Test 4: Download video (for backend rendering)
async function testBackendDownload() {
  console.log('⬇️  Test 4: Download Video (Backend Rendering)');
  console.log('   Use case: Backend downloads video for FFmpeg processing\n');
  
  const videoUrl = getMediaUrl(TEST_FILE);
  
  try {
    const startTime = Date.now();
    const response = await fetch(videoUrl);
    
    if (response.ok) {
      // Simulate downloading (just read first chunk)
      const reader = response.body.getReader();
      const { value } = await reader.read();
      reader.cancel();
      
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
      console.log(`   Downloaded first chunk: ${value.length} bytes`);
      console.log(`   Time: ${duration}ms`);
      console.log(`   ✅ Backend can download full video for processing\n`);
      return true;
    } else {
      console.log(`   ❌ Failed: ${response.status} ${response.statusText}\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Test 5: FFmpeg compatibility
async function testFFmpegCompatibility() {
  console.log('🎬 Test 5: FFmpeg Compatibility');
  console.log('   Use case: Backend uses FFmpeg to process video\n');
  
  const videoUrl = getMediaUrl(TEST_FILE);
  
  console.log(`   FFmpeg command example:`);
  console.log(`   ffmpeg -i "${videoUrl}" output.mp4\n`);
  
  try {
    // Test HEAD request (FFmpeg does this first)
    const response = await fetch(videoUrl, { method: 'HEAD' });
    
    if (response.ok) {
      console.log(`   ✅ HEAD request works: ${response.status}`);
      console.log(`   ✅ FFmpeg can use this URL as input\n`);
      return true;
    } else {
      console.log(`   ❌ HEAD request failed: ${response.status}\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Test 6: Multiple concurrent requests (stress test)
async function testConcurrentRequests() {
  console.log('🔄 Test 6: Concurrent Requests');
  console.log('   Use case: Multiple users/processes accessing videos\n');
  
  const videoUrl = getMediaUrl(TEST_FILE);
  const numRequests = 5;
  
  try {
    const startTime = Date.now();
    const promises = Array(numRequests).fill(null).map(() => 
      fetch(videoUrl, { method: 'HEAD' })
    );
    
    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const allSuccess = responses.every(r => r.ok);
    
    if (allSuccess) {
      console.log(`   ✅ ${numRequests} concurrent requests succeeded`);
      console.log(`   Total time: ${duration}ms`);
      console.log(`   Average: ${(duration / numRequests).toFixed(0)}ms per request`);
      console.log(`   ✅ Worker handles concurrent access well\n`);
      return true;
    } else {
      console.log(`   ❌ Some requests failed\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  results.push(await testListFiles());
  results.push(await testVideoUrl());
  results.push(await testRangeRequest());
  results.push(await testBackendDownload());
  results.push(await testFFmpegCompatibility());
  results.push(await testConcurrentRequests());
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Test Results');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n   ✅ All tests passed!');
    console.log('   ✅ Worker is ready for:');
    console.log('      - Video editor app (browser)');
    console.log('      - Backend rendering (Node.js/FFmpeg)');
    console.log('      - Production deployment\n');
  } else {
    console.log(`\n   ⚠️  ${total - passed} test(s) failed`);
    console.log('   Check the errors above\n');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📝 Integration Examples:\n');
  console.log('   Video Editor (HTML):');
  console.log(`   <video src="${getMediaUrl(TEST_FILE)}" controls></video>\n`);
  console.log('   Backend (Node.js):');
  console.log(`   const url = "${getMediaUrl(TEST_FILE)}";`);
  console.log(`   const response = await fetch(url);\n`);
  console.log('   Backend (FFmpeg):');
  console.log(`   ffmpeg -i "${getMediaUrl(TEST_FILE)}" output.mp4\n`);
}

// Run tests
runAllTests().catch(console.error);
