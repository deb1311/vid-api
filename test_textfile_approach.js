const { spawn } = require('child_process');
const fs = require('fs');

// Test using textfile instead of inline text
async function testTextfileApproach() {
  console.log('🔍 Testing textfile approach...\n');
  
  const quote = "For others it's a dream, for us it's a mission.";
  
  // Write text to a file
  fs.writeFileSync('temp/quote.txt', quote);
  console.log('Created temp/quote.txt');
  
  // Test 1: Using textfile parameter
  console.log('\nTest 1: Using textfile parameter...');
  await testWithTextfile('temp/quote.txt', 'temp/textfile_test.mp4');
  
  // Test 2: Using inline text with simpler escaping
  console.log('\nTest 2: Using inline text with simpler quote...');
  await testWithInlineText('Hello World Test', 'temp/inline_simple.mp4');
  
  // Test 3: Using inline text with apostrophe
  console.log('\nTest 3: Using inline text with apostrophe...');
  await testWithInlineText("It's a test", 'temp/inline_apostrophe.mp4');
  
  console.log('\n📊 Results:');
  ['textfile_test.mp4', 'inline_simple.mp4', 'inline_apostrophe.mp4'].forEach(file => {
    const filePath = `temp/${file}`;
    if (fs.existsSync(filePath)) {
      console.log(`  ${file}: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);
    }
  });
}

function testWithTextfile(textfilePath, outputPath) {
  return new Promise((resolve, reject) => {
    // Use textfile parameter instead of text
    const textFilter = `drawtext=textfile=${textfilePath.replace(/\\/g, '/')}:fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=500:shadowcolor=black:shadowx=2:shadowy=2`;
    
    console.log('  Filter:', textFilter);
    
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=purple:size=1080x1920:duration=2',
      '-vf', textFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('  ✅ Success');
        resolve();
      } else {
        console.log('  ❌ Failed:', stderr.substring(0, 200));
        reject(new Error('Failed'));
      }
    });
  });
}

function testWithInlineText(text, outputPath) {
  return new Promise((resolve, reject) => {
    // Simple escaping
    const escaped = text.replace(/'/g, "'\\''");
    const textFilter = `drawtext=text='${escaped}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=500:shadowcolor=black:shadowx=2:shadowy=2`;
    
    console.log('  Filter:', textFilter);
    
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=orange:size=1080x1920:duration=2',
      '-vf', textFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('  ✅ Success');
        resolve();
      } else {
        console.log('  ❌ Failed:', stderr.substring(0, 200));
        reject(new Error('Failed'));
      }
    });
  });
}

testTextfileApproach().catch(console.error);