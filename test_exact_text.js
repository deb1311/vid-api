const { spawn } = require('child_process');
const fs = require('fs');

// Test with exact text from ID 78
async function testExactText() {
  console.log('🔍 Testing with exact text from ID 78...\n');
  
  const quote = "For others it's a dream, for us it's a mission.";
  const watermark = "@sd1";
  
  // Test different escaping methods
  const tests = [
    {
      name: 'Current escaping',
      escape: (text) => text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/,/g, '\\,')
    },
    {
      name: 'Double escape for spawn',
      escape: (text) => text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/'/g, "\\\\'")
        .replace(/:/g, '\\\\:')
        .replace(/,/g, '\\\\,')
    },
    {
      name: 'No comma escape',
      escape: (text) => text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
    },
    {
      name: 'Simple - just apostrophe',
      escape: (text) => text
        .replace(/'/g, "'\\''")
    }
  ];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n--- Test ${i + 1}: ${test.name} ---`);
    
    const escapedQuote = test.escape(quote);
    const escapedWatermark = test.escape(watermark);
    
    console.log(`Escaped quote: ${escapedQuote}`);
    
    try {
      await testWithText(escapedQuote, escapedWatermark, `temp/text_test_${i}.mp4`);
      console.log(`✅ Test ${i + 1} works!`);
    } catch (error) {
      console.log(`❌ Test ${i + 1} failed: ${error.message}`);
    }
  }
}

function testWithText(quote, watermark, outputPath) {
  return new Promise((resolve, reject) => {
    const textFilter = `drawtext=text='${quote}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=500,drawtext=text='${watermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=940`;
    
    console.log(`Filter: ${textFilter.substring(0, 150)}...`);
    
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=darkblue:size=1080x1920:duration=2',
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
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
        resolve();
      } else {
        // Show the actual error
        const errorLines = stderr.split('\n').filter(line => 
          line.includes('Error') || line.includes('error') || line.includes('Invalid')
        );
        reject(new Error(errorLines.join(' | ') || `FFmpeg exit code ${code}`));
      }
    });
  });
}

testExactText().catch(console.error);