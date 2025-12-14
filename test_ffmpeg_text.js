const { spawn } = require('child_process');
const fs = require('fs');

async function testFFmpegTextRendering() {
  console.log('🧪 Testing FFmpeg text rendering directly...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  return new Promise((resolve, reject) => {
    // Create a simple test video with text overlay
    const args = [
      '-f', 'lavfi',
      '-i', 'color=black:size=1080x1920:duration=3',
      '-vf', `drawtext=text='TEST TEXT':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', 'temp/test_ffmpeg_text.mp4'
    ];
    
    console.log('FFmpeg command:', 'ffmpeg', args.join(' '));
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ FFmpeg text rendering test successful');
        
        // Check file size
        if (fs.existsSync('temp/test_ffmpeg_text.mp4')) {
          const stats = fs.statSync('temp/test_ffmpeg_text.mp4');
          console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        }
        
        resolve('temp/test_ffmpeg_text.mp4');
      } else {
        console.error('❌ FFmpeg text rendering failed:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

testFFmpegTextRendering().catch(console.error);