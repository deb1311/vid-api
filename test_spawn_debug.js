const { spawn, execSync } = require('child_process');
const fs = require('fs');

// Test spawn vs exec to see if there's a difference
async function testSpawnVsExec() {
  console.log('🔍 Testing spawn vs exec for FFmpeg...\n');
  
  const textFilter = `drawtext=text='TEST TEXT':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`;
  
  // Test 1: Using spawn (current method)
  console.log('Test 1: Using spawn...');
  await testWithSpawn(textFilter, 'temp/spawn_test.mp4');
  
  // Test 2: Using execSync
  console.log('\nTest 2: Using execSync...');
  testWithExec(textFilter, 'temp/exec_test.mp4');
  
  // Compare file sizes
  console.log('\n📊 File size comparison:');
  if (fs.existsSync('temp/spawn_test.mp4')) {
    console.log(`  spawn_test.mp4: ${fs.statSync('temp/spawn_test.mp4').size} bytes`);
  }
  if (fs.existsSync('temp/exec_test.mp4')) {
    console.log(`  exec_test.mp4: ${fs.statSync('temp/exec_test.mp4').size} bytes`);
  }
}

function testWithSpawn(textFilter, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=red:size=1080x1920:duration=2',
      '-vf', textFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];
    
    console.log('  Args:', JSON.stringify(args));
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('  ✅ spawn completed');
        resolve();
      } else {
        console.log('  ❌ spawn failed:', stderr.substring(0, 200));
        reject(new Error('spawn failed'));
      }
    });
  });
}

function testWithExec(textFilter, outputPath) {
  const cmd = `ffmpeg -f lavfi -i "color=c=red:size=1080x1920:duration=2" -vf "${textFilter}" -c:v libx264 -pix_fmt yuv420p -y ${outputPath}`;
  
  console.log('  Command:', cmd.substring(0, 200) + '...');
  
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log('  ✅ exec completed');
  } catch (error) {
    console.log('  ❌ exec failed:', error.message.substring(0, 200));
  }
}

testSpawnVsExec().catch(console.error);