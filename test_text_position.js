const { spawn } = require('child_process');
const fs = require('fs');

// Test text at different Y positions to see where it's visible
async function testTextPositions() {
  console.log('🔍 Testing text at different Y positions...\n');
  
  const positions = [
    { y: 100, name: 'top' },
    { y: 500, name: 'upper-middle' },
    { y: 960, name: 'center' },
    { y: 1400, name: 'lower-middle' },
    { y: 1800, name: 'bottom' }
  ];
  
  for (const pos of positions) {
    console.log(`Testing Y=${pos.y} (${pos.name})...`);
    await createTestVideo(pos.y, `temp/pos_test_${pos.name}.mp4`);
  }
  
  console.log('\n✅ All position tests complete. Check the videos in temp/ folder.');
}

function createTestVideo(yPos, outputPath) {
  return new Promise((resolve, reject) => {
    const textFilter = `drawtext=text='TEXT AT Y=${yPos}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=${yPos}:shadowcolor=black:shadowx=3:shadowy=3`;
    
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=darkblue:size=1080x1920:duration=2',
      '-vf', textFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const size = fs.statSync(outputPath).size;
        console.log(`  ✅ Created (${(size/1024).toFixed(1)} KB)`);
        resolve();
      } else {
        console.log(`  ❌ Failed`);
        reject(new Error('Failed'));
      }
    });
  });
}

testTextPositions().catch(console.error);