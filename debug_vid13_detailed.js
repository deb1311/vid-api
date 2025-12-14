const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { calculateTextLayout, escapeDrawtext } = require('./endpoints/utils');

// Simulate the exact text filter construction from vid-1.3
async function debugVid13TextFilter() {
  console.log('🔍 Debugging vid-1.3 text filter construction...\n');
  
  // Exact data from ID 78
  const quote = "For others it's a dream, for us it's a mission.";
  const author = null;
  const watermark = "@sd1";
  const captions = null;
  
  console.log('Input data:');
  console.log(`  quote: "${quote}"`);
  console.log(`  author: ${author}`);
  console.log(`  watermark: "${watermark}"`);
  console.log(`  captions: ${captions}`);
  
  // Build text filters using Vid-1.3 positioning logic
  let textFilters = [];

  // Check if captions are provided (they override quote)
  if (captions && captions.length > 0) {
    console.log(`\n📝 Using ${captions.length} timed captions instead of quote`);
  } else if (quote && quote.trim() !== '') {
    console.log('\n📝 Using quote (no captions specified)');
    
    // Calculate text layout for quote
    const textLayout = calculateTextLayout(quote, author);
    
    console.log('\nText layout result:');
    console.log(`  lines: ${JSON.stringify(textLayout.lines)}`);
    console.log(`  fontSize: ${textLayout.fontSize}`);
    console.log(`  lineHeight: ${textLayout.lineHeight}`);
    console.log(`  totalTextHeight: ${textLayout.totalTextHeight}`);
    
    // Use consistent Vid-1.2 positioning logic (matches editor exactly)
    const videoHeight = 800;
    const totalGroupHeight = textLayout.totalTextHeight + videoHeight;
    const groupStartY = (1920 - totalGroupHeight) / 2;
    const textStartY = groupStartY;
    console.log(`\n📐 Text positioning: groupStartY=${groupStartY}, textStartY=${textStartY}`);

    // Add quote lines
    for (let i = 0; i < textLayout.lines.length; i++) {
      const lineY = textStartY + textLayout.topPadding + (i * textLayout.lineHeight);
      const cleanText = escapeDrawtext(textLayout.lines[i]);
      
      console.log(`\nLine ${i + 1}:`);
      console.log(`  original: "${textLayout.lines[i]}"`);
      console.log(`  escaped: "${cleanText}"`);
      console.log(`  lineY: ${lineY}`);
      console.log(`  isEmpty: ${cleanText.trim() === ''}`);
      
      if (cleanText.trim() !== '') { // Only add non-empty lines
        const filter = `drawtext=text='${cleanText}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${textLayout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`;
        textFilters.push(filter);
        console.log(`  filter: ${filter}`);
      }
    }

    // Add author - use editor's positioning (65% down the screen)
    if (author && author.trim() !== '') {
      const authorY = 1920 * 0.65;
      const cleanAuthor = escapeDrawtext(author);
      
      console.log(`\nAuthor:`);
      console.log(`  original: "${author}"`);
      console.log(`  escaped: "${cleanAuthor}"`);
      
      if (cleanAuthor.trim() !== '') {
        const filter = `drawtext=text='${cleanAuthor}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${textLayout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`;
        textFilters.push(filter);
        console.log(`  filter: ${filter}`);
      }
    }
  }

  // Add watermark at bottom (fixed position to prevent overlapping)
  if (watermark && watermark.trim() !== '') {
    const cleanWatermark = escapeDrawtext(watermark);
    console.log(`\nWatermark:`);
    console.log(`  original: "${watermark}"`);
    console.log(`  escaped: "${cleanWatermark}"`);
    
    if (cleanWatermark.trim() !== '') {
      const filter = `drawtext=text='${cleanWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`;
      textFilters.push(filter);
      console.log(`  filter: ${filter}`);
    }
  }

  const textFilter = textFilters.length > 0 ? textFilters.join(',') : null;
  
  console.log(`\n🎯 Total filters: ${textFilters.length}`);
  console.log(`\n📝 Final text filter:`);
  console.log(textFilter || 'NULL - NO TEXT FILTERS!');
  
  // Now test with actual FFmpeg
  if (textFilter) {
    console.log('\n\n🧪 Testing with FFmpeg...');
    
    const baseVideoFilter = `scale=-1:1920:force_original_aspect_ratio=decrease,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;
    const videoFilter = `${baseVideoFilter},${textFilter}`;
    
    console.log('\nFull video filter:');
    console.log(videoFilter);
    
    return new Promise((resolve, reject) => {
      const args = [
        '-f', 'lavfi',
        '-i', 'color=c=darkblue:size=1080x1920:duration=3',
        '-vf', videoFilter,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-y', 'temp/debug_vid13_text.mp4'
      ];
      
      console.log('\nFFmpeg args:', args.join(' '));
      
      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ FFmpeg test successful!');
          if (fs.existsSync('temp/debug_vid13_text.mp4')) {
            const stats = fs.statSync('temp/debug_vid13_text.mp4');
            console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
          }
          resolve();
        } else {
          console.error('\n❌ FFmpeg failed!');
          console.error('stderr:', stderr);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
    });
  }
}

debugVid13TextFilter().catch(console.error);