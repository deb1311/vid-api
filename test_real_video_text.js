const { spawn } = require('child_process');
const fs = require('fs');

// Test text rendering on a real downloaded video
async function testRealVideoText() {
  console.log('🔍 Testing text on real video...\n');
  
  // Download a short segment of one of the Pexels videos
  console.log('Downloading video segment...');
  await downloadVideoSegment(
    'https://videos.pexels.com/video-files/8019275/8019275-hd_1080_1920_30fps.mp4',
    'temp/real_video_segment.mp4',
    3
  );
  
  // Apply text overlay
  console.log('\nApplying text overlay...');
  await applyTextToVideo('temp/real_video_segment.mp4', 'temp/real_video_with_text.mp4');
  
  console.log('\n📊 Results:');
  ['real_video_segment.mp4', 'real_video_with_text.mp4'].forEach(file => {
    const filePath = `temp/${file}`;
    if (fs.existsSync(filePath)) {
      console.log(`  ${file}: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);
    }
  });
}

function downloadVideoSegment(url, outputPath, duration) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', url,
      '-t', duration.toString(),
      '-c', 'copy',
      '-y', outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('  ✅ Video downloaded');
        resolve();
      } else {
        console.log('  ❌ Download failed:', stderr.substring(0, 200));
        reject(new Error('Download failed'));
      }
    });
  });
}

function applyTextToVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const quote = "For others it's a dream, for us it's a mission.";
    const watermark = "@sd1";
    
    // Use the textfile approach which we know works
    fs.writeFileSync('temp/real_quote.txt', quote);
    fs.writeFileSync('temp/real_watermark.txt', watermark);
    
    const baseFilter = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black';
    const textFilter = `drawtext=textfile=temp/real_quote.txt:fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=500:shadowcolor=black:shadowx=2:shadowy=2,drawtext=textfile=temp/real_watermark.txt:fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=940:shadowcolor=black@0.8:shadowx=3:shadowy=3`;
    
    const fullFilter = `${baseFilter},${textFilter}`;
    
    console.log('  Filter length:', fullFilter.length);
    
    const args = [
      '-i', inputPath,
      '-vf', fullFilter,
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
        console.log('  ✅ Text applied');
        resolve();
      } else {
        console.log('  ❌ Failed:', stderr.substring(0, 300));
        reject(new Error('Failed'));
      }
    });
  });
}

testRealVideoText().catch(console.error);