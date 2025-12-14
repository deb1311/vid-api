const { spawn } = require('child_process');
const fs = require('fs');

async function testTextRenderingVerbose() {
  console.log('🧪 Testing text rendering with verbose FFmpeg output...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  return new Promise((resolve, reject) => {
    // Create a test video with text overlay and capture all output
    const textFilter = `drawtext=text='VISIBLE TEST TEXT':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=3:shadowy=3`;
    
    const args = [
      '-v', 'info', // Verbose output
      '-i', 'assets/test-image.jpg',
      '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,${textFilter}`,
      '-t', '3',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', 'temp/test_verbose_text.mp4'
    ];
    
    console.log('FFmpeg command:', 'ffmpeg', args.join(' '));
    console.log('\n📝 FFmpeg Output:');
    console.log('==================');
    
    const ffmpeg = spawn('ffmpeg', args);
    let stdout = '';
    let stderr = '';
    
    ffmpeg.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });
    
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });
    
    ffmpeg.on('close', (code) => {
      console.log('\n==================');
      console.log(`FFmpeg exit code: ${code}`);
      
      if (code === 0) {
        console.log('✅ Verbose text rendering test successful');
        
        // Check file size
        if (fs.existsSync('temp/test_verbose_text.mp4')) {
          const stats = fs.statSync('temp/test_verbose_text.mp4');
          console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          
          // Look for text-related messages in stderr
          const textMessages = stderr.split('\n').filter(line => 
            line.toLowerCase().includes('drawtext') || 
            line.toLowerCase().includes('font') ||
            line.toLowerCase().includes('text')
          );
          
          if (textMessages.length > 0) {
            console.log('\n📝 Text-related FFmpeg messages:');
            textMessages.forEach(msg => console.log(`  ${msg}`));
          } else {
            console.log('\n⚠️  No text-related messages found in FFmpeg output');
          }
        }
        
        resolve('temp/test_verbose_text.mp4');
      } else {
        console.error('❌ Verbose text rendering failed');
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

testTextRenderingVerbose().catch(console.error);