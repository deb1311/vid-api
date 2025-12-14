const { spawn } = require('child_process');
const fs = require('fs');

async function testActualFilter() {
  console.log('🧪 Testing actual text filter with real video...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  return new Promise((resolve, reject) => {
    // Use the exact filter from vid-1.3 debug output
    const textFilter = `drawtext=text='This is a test quote to verify text':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=466:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='rendering':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=527.6:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='Test Author':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=32:fontcolor=white:x=(w-text_w)/2:y=1248:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='Test Watermark':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=940:shadowcolor=black@0.8:shadowx=3:shadowy=3`;
    
    const baseVideoFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;
    const videoFilter = `${baseVideoFilter},${textFilter}`;
    
    const args = [
      '-i', 'assets/test-image.jpg',
      '-vf', videoFilter,
      '-t', '3',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', 'temp/test_actual_filter.mp4'
    ];
    
    console.log('FFmpeg command:', 'ffmpeg', args.join(' '));
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Actual filter test successful');
        
        // Check file size
        if (fs.existsSync('temp/test_actual_filter.mp4')) {
          const stats = fs.statSync('temp/test_actual_filter.mp4');
          console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        }
        
        resolve('temp/test_actual_filter.mp4');
      } else {
        console.error('❌ Actual filter test failed:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

testActualFilter().catch(console.error);