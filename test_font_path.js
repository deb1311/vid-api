const { spawn } = require('child_process');
const fs = require('fs');

// Test different font path formats
async function testFontPaths() {
  console.log('🔍 Testing different font path formats...\n');
  
  const fontPaths = [
    'C\\\\:/Windows/Fonts/arialbd.ttf',  // Current format
    'C\\:/Windows/Fonts/arialbd.ttf',    // Single backslash
    '/Windows/Fonts/arialbd.ttf',        // Unix-style
    'arialbd.ttf',                        // Just filename (uses fontconfig)
    'Arial Bold',                         // Font name
  ];
  
  for (let i = 0; i < fontPaths.length; i++) {
    const fontPath = fontPaths[i];
    console.log(`\n--- Test ${i + 1}: ${fontPath} ---`);
    
    try {
      await testWithFontPath(fontPath, `temp/font_test_${i}.mp4`);
      console.log(`✅ Font path ${i + 1} works!`);
    } catch (error) {
      console.log(`❌ Font path ${i + 1} failed: ${error.message}`);
    }
  }
}

function testWithFontPath(fontPath, outputPath) {
  return new Promise((resolve, reject) => {
    const textFilter = `drawtext=text='TEST TEXT':fontfile=${fontPath}:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`;
    
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=blue:size=1080x1920:duration=1',
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
        // Check if file has reasonable size (text rendered)
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
          
          // Check if drawtext was in the output
          if (stderr.includes('drawtext') || stderr.includes('Parsed_drawtext')) {
            console.log('   drawtext filter processed');
          }
        }
        resolve();
      } else {
        reject(new Error(`FFmpeg failed: ${stderr.substring(0, 200)}`));
      }
    });
  });
}

testFontPaths().catch(console.error);