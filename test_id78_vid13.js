const { createVideoVid13 } = require('./endpoints/vid-1.3');
const fs = require('fs');
const path = require('path');

async function testId78WithVid13() {
  console.log('🧪 Testing ID 78 data with vid-1.3 endpoint...');
  
  // Ensure temp directory exists
  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
  }
  
  // Exact JSON data from ID 78
  const id78Data = {
    "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/711_audio.mp3",
    "original": "https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=17879553129419539&signature=AYcehNcZip_enO1BmkIPcTnp1Jns44hXJU9KfBRAMgonJN0fai5jjkQuLVZQK1_EQ_6xESq-Gnit-DcK3JCk6-f_iyW1xJMOxJdzTlikcoaMEpr50L-YcjOGHYdE9uHwEzcBQqCIPRCjPXoOiqnhNKnfxUQz-pEwODa65xbF9sx3f9tRyF2fdZUT_WI-etEmT9a0P6ooGj7dg79E1UgOhY6-JjtJDJBs",
    "quote": "For others it's a dream, for us it's a mission.",
    "watermark": "@sd1",
    "clips": [
      {
        "start": 0,
        "duration": 1.8,
        "volume": 0,
        "begin": 0,
        "description": "A leisurely sunbather lounging on a sleek yacht cruising the open water.",
        "videourl": "https://videos.pexels.com/video-files/8019275/8019275-hd_1080_1920_30fps.mp4"
      },
      {
        "start": 1.8,
        "duration": 1.6,
        "volume": 0,
        "begin": 1.8,
        "description": "Opulent suite with floor‑to‑ceiling windows framing a bustling marina.",
        "videourl": "https://videos.pexels.com/video-files/4576157/4576157-hd_1920_1080_30fps.mp4"
      },
      {
        "start": 3.4,
        "duration": 1.7,
        "volume": 0,
        "begin": 3.4,
        "description": "High‑end sports car with its front trunk packed with stylish shopping bags.",
        "videourl": "https://videos.pexels.com/video-files/35112998/14875987_1080_1920_30fps.mp4"
      },
      {
        "start": 5.1,
        "duration": 2.3,
        "volume": 0,
        "begin": 5.1,
        "description": "Someone unwinding beside a modern indoor pool, gazing out at the skyline.",
        "videourl": "https://videos.pexels.com/video-files/8045182/8045182-hd_1920_1080_25fps.mp4"
      },
      {
        "start": 7.4,
        "duration": 2.655645999999999,
        "volume": 0,
        "begin": 7.4,
        "description": "A relaxed patron sipping coffee at a palm‑lined outdoor café.",
        "videourl": "https://videos.pexels.com/video-files/3986257/3986257-hd_1080_1920_30fps.mp4"
      }
    ],
    "alt": "",
    "duration": 10.055646
  };
  
  try {
    console.log('📊 Testing with real production data:');
    console.log(`   Quote: "${id78Data.quote}"`);
    console.log(`   Watermark: ${id78Data.watermark}`);
    console.log(`   Audio: ${path.basename(id78Data.audioUrl)}`);
    console.log(`   Clips: ${id78Data.clips.length} video clips`);
    console.log(`   Duration: ${id78Data.duration}s`);
    
    // Download audio file first (since it's remote)
    const audioPath = 'temp/id78_audio.mp3';
    console.log('\n📥 Downloading audio file...');
    
    const audioResponse = await fetch(id78Data.audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
    console.log(`✅ Audio downloaded: ${(audioBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    
    // Test with vid-1.3 endpoint
    await createVideoVid13(
      audioPath,           // audioPath
      id78Data.quote,      // quote
      null,                // author (not specified in data)
      id78Data.watermark,  // watermark
      id78Data.clips,      // clips
      null,                // captions (not used, using quote instead)
      'temp/test_id78_vid13.mp4', // outputPath
      false                // overlay
    );
    
    console.log('\n✅ ID 78 test completed successfully!');
    console.log('📁 Output file: temp/test_id78_vid13.mp4');
    
    // Check file size
    if (fs.existsSync('temp/test_id78_vid13.mp4')) {
      const stats = fs.statSync('temp/test_id78_vid13.mp4');
      console.log(`📊 Video file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Cleanup audio file
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log('🗑️  Cleaned up downloaded audio file');
    }
    
  } catch (error) {
    console.error('❌ ID 78 test failed:', error.message);
    throw error;
  }
}

testId78WithVid13().catch(console.error);