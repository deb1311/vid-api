const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function createTestAssets() {
  console.log('🎨 Creating test assets...');

  // Create directories
  ['temp', 'assets', 'output'].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Create a simple test image using FFmpeg
  const testImagePath = path.join('assets', 'test-image.jpg');
  if (!fs.existsSync(testImagePath)) {
    console.log('🖼️  Creating test image...');
    await createTestImage(testImagePath);
  }

  // Create a simple test audio using FFmpeg
  const testAudioPath = path.join('assets', 'test-audio.mp3');
  if (!fs.existsSync(testAudioPath)) {
    console.log('🎵 Creating test audio...');
    await createTestAudio(testAudioPath);
  }

  // Create a simple test video using FFmpeg
  const testVideoPath = path.join('assets', 'test-video.mp4');
  if (!fs.existsSync(testVideoPath)) {
    console.log('📹 Creating test video...');
    await createTestVideo(testVideoPath);
  }

  console.log('✅ Test assets created successfully!');
  console.log(`   Image: ${testImagePath}`);
  console.log(`   Audio: ${testAudioPath}`);
  console.log(`   Video: ${testVideoPath}`);
}

function createTestImage(outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi',
      '-i', 'color=blue:size=1080x1920:duration=1',
      '-vf', 'drawtext=text=TEST IMAGE:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2',
      '-frames:v', '1',
      '-y', outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Test image created');
        resolve();
      } else {
        reject(new Error(`Test image creation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

function createTestAudio(outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:duration=10',
      '-c:a', 'mp3',
      '-y', outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Test audio created');
        resolve();
      } else {
        reject(new Error(`Test audio creation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

function createTestVideo(outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi',
      '-i', 'color=red:size=1920x1080:duration=5',
      '-vf', 'drawtext=text=TEST VIDEO:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2',
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
        reject(new Error(`Test video creation failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

createTestAssets().catch(console.error);