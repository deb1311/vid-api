const { spawn } = require('child_process');
const fs = require('fs');

// Test FFmpeg text rendering directly with the exact quote from ID 78
async function debugTextRendering() {
  console.log('🔍 Debugging text rendering issue...');
  
  const quote = "For others it's a dream, for us it's a mission.";
  const watermark = "@sd1";
  
  // Test escaping
  function escapeDrawtext(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')   // Backslash (must be first)
      .replace(/'/g, "\\'")      // Single quote
      .replace(/:/g, '\\:')      // Colon (parameter separator)
      .replace(/\[/g, '\\[')     // Left bracket
      .replace(/\]/g, '\\]')     // Right bracket
      .replace(/,/g, '\\,')      // Comma (filter separator)
      .replace(/;/g, '\\;');     // Semicolon (filter chain separator)
  }
  
  const escapedQuote = escapeDrawtext(quote);
  const escapedWatermark = escapeDrawtext(watermark);
  
  console.log('Original quote:', quote);
  console.log('Escaped quote:', escapedQuote);
  console.log('Original watermark:', watermark);
  console.log('Escaped watermark:', escapedWatermark);
  
  // Test with simple FFmpeg command
  return new Promise((resolve, reject) => {
    const textFilter = `drawtext=text='${escapedQuote}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=500:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='${escapedWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=940:shadowcolor=black@0.8:shadowx=3:shadowy=3`;
    
    console.log('\nText filter:', textFilter);
    
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=blue:size=1080x1920:duration=3',
      '-vf', textFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', 'temp/debug_text_test.mp4'
    ];
    
    console.log('\nFFmpeg command:', 'ffmpeg', args.join(' '));
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Direct FFmpeg text test successful');
        if (fs.existsSync('temp/debug_text_test.mp4')) {
          const stats = fs.statSync('temp/debug_text_test.mp4');
          console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
        resolve();
      } else {
        console.error('\n❌ FFmpeg failed:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
  });
}

debugTextRendering().catch(console.error);