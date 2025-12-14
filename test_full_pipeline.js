const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simulate the exact vid-1.3 pipeline step by step
async function testFullPipeline() {
  console.log('🔍 Testing full vid-1.3 pipeline step by step...\n');
  
  // Step 1: Create a test video (simulating concatenated clips)
  console.log('Step 1: Creating test concatenated video...');
  await createTestVideo('temp/pipeline_concat.mp4', 5);
  
  // Step 2: Apply text overlay (exactly like vid-1.3 does)
  console.log('\nStep 2: Applying text overlay...');
  await applyTextOverlay('temp/pipeline_concat.mp4', 'temp/pipeline_with_text.mp4');
  
  // Step 3: Add audio (simulating final step)
  console.log('\nStep 3: Adding audio...');
  await addAudio('temp/pipeline_with_text.mp4', 'assets/test-audio.mp3', 'temp/pipeline_final.mp4');
  
  console.log('\n✅ Pipeline complete!');
  console.log('📊 File sizes:');
  ['pipeline_concat.mp4', 'pipeline_with_text.mp4', 'pipeline_final.mp4'].forEach(file => {
    const filePath = `temp/${file}`;
    if (fs.existsSync(filePath)) {
      console.log(`  ${file}: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);
    }
  });
}

function createTestVideo(outputPath, duration) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi',
      '-i', `color=c=darkgreen:size=1080x1920:duration=${duration}`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('  ✅ Test video created');
        resolve();
      } else {
        reject(new Error('Failed to create test video'));
      }
    });
  });
}

function applyTextOverlay(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const quote = "For others it's a dream, for us it's a mission.";
    const watermark = "@sd1";
    
    // Escape function (same as vid-1.3)
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
    
    // Exact filter from vid-1.3
    const baseVideoFilter = `scale=-1:1920:force_original_aspect_ratio=decrease,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;
    
    const textFilters = [
      `drawtext=text='${escapedQuote}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=508:shadowcolor=black:shadowx=2:shadowy=2`,
      `drawtext=text='${escapedWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=940:shadowcolor=black@0.8:shadowx=3:shadowy=3`
    ];
    
    const videoFilter = `${baseVideoFilter},${textFilters.join(',')}`;
    
    console.log('  Filter length:', videoFilter.length);
    console.log('  Filter preview:', videoFilter.substring(0, 150) + '...');
    
    const args = [
      '-i', inputPath,
      '-vf', videoFilter,
      '-t', '5',
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
        console.log('  ✅ Text overlay applied');
        // Check for drawtext in output
        if (stderr.includes('drawtext') || stderr.includes('Parsed_drawtext')) {
          console.log('  📝 drawtext filter confirmed in FFmpeg output');
        } else {
          console.log('  ⚠️  drawtext NOT found in FFmpeg output');
        }
        resolve();
      } else {
        console.log('  ❌ Failed:', stderr.substring(0, 300));
        reject(new Error('Failed to apply text overlay'));
      }
    });
  });
}

function addAudio(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-map', '0:v',
      '-map', '1:a',
      '-t', '5',
      '-y', outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('  ✅ Audio added');
        resolve();
      } else {
        reject(new Error('Failed to add audio'));
      }
    });
  });
}

testFullPipeline().catch(console.error);