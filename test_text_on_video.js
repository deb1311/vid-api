const { spawn } = require('child_process');
const fs = require('fs');

// Test text rendering on actual video file
async function testTextOnVideo() {
  console.log('🔍 Testing text rendering on actual video file...\n');
  
  // First, create a simple test video
  console.log('Creating test video...');
  await createTestVideo('temp/test_source_video.mp4');
  
  // Now test text rendering on it
  console.log('\nTesting text rendering on video...');
  
  const quote = "For others it's a dream, for us it's a mission.";
  const watermark = "@sd1";
  
  // Escape function
  function escapeDrawtext(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:')
      .replace(/,/g, '\\,');
  }
  
  const escapedQuote = escapeDrawtext(quote);
  const escapedWatermark = escapeDrawtext(watermark);
  
  const baseFilter = 'scale=-1:1920:force_original_aspect_ratio=decrease,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black';
  const textFilter = `drawtext=text='${escapedQuote}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=500:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='${escapedWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=940:shadowcolor=black@0.8:shadowx=3:shadowy=3`;
  
  const fullFilter = `${baseFilter},${textFilter}`;
  
  console.log('Full filter length:', fullFilter.length);
  console.log('Filter preview:', fullFilter.substring(0, 200) + '...');
  
  return new Promise((resolve, reject) => {
    const args = [
      '-i', 'temp/test_source_video.mp4',
      '-vf', fullFilter,
      '-t', '3',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', 'temp/test_text_on_video.mp4'
    ];
    
    console.log('\nFFmpeg args:', args.join(' ').substring(0, 300) + '...');
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      console.log('\nFFmpeg exit code:', code);
      
      if (code === 0) {
        if (fs.existsSync('temp/test_text_on_video.mp4')) {
          const stats = fs.statSync('temp/test_text_on_video.mp4');
          console.log(`✅ Success! File size: ${(stats.size / 1024).toFixed(2)} KB`);
          
          // Check for drawtext in output
          if (stderr.includes('drawtext')) {
            console.log('📝 drawtext filter was processed');
          } else {
            console.log('⚠️  drawtext NOT found in FFmpeg output');
          }
        }
        resolve();
      } else {
        console.error('❌ FFmpeg failed');
        // Show relevant error lines
        const errorLines = stderr.split('\n').filter(line => 
          line.includes('Error') || line.includes('error') || line.includes('Invalid') || line.includes('drawtext')
        );
        console.log('Errors:', errorLines.join('\n'));
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
  });
}

function createTestVideo(outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=darkgreen:size=1920x1080:duration=5',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Test video created');
        resolve();
      } else {
        reject(new Error('Failed to create test video'));
      }
    });
  });
}

testTextOnVideo().catch(console.error);