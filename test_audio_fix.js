// Test the audio rendering fix
const axios = require('axios');
const fs = require('fs');

const SERVER_URL = 'http://localhost:8080';

async function testAudioRendering() {
  console.log('🧪 Testing Audio Rendering Fix...\n');

  // Test case: vid-1.3 with multiple clips and background audio
  const testPayload = {
    endpoint: 'vid-1.3',
    data: {
      quote: 'Testing Audio Fix',
      author: 'Kiro AI',
      watermark: '@test',
      audioUrl: 'test_instagram_audio.mp3',
      overlay: false,
      clips: [
        {
          videourl: 'https://www.pexels.com/download/video/3195394/',
          description: 'First clip - person working',
          begin: 0,
          start: 0,
          duration: 3,
          volume: 100
        },
        {
          videourl: 'https://www.pexels.com/download/video/3195394/',
          description: 'Second clip - same video',
          begin: 3,
          start: 3,
          duration: 3,
          volume: 100
        }
      ],
      captions: [
        {
          text: 'Testing audio rendering',
          start: 0,
          duration: 3
        },
        {
          text: 'Should have background audio',
          start: 3,
          duration: 3
        }
      ]
    }
  };

  try {
    console.log('📤 Sending render request to /master endpoint...');
    console.log(`   Endpoint: ${testPayload.endpoint}`);
    console.log(`   Clips: ${testPayload.data.clips.length}`);
    console.log(`   Total duration: ${testPayload.data.clips.reduce((sum, c) => sum + c.duration, 0)}s`);
    console.log(`   Background audio: ${testPayload.data.audioUrl.split('/').pop()}\n`);

    const startTime = Date.now();
    
    const response = await axios.post(`${SERVER_URL}/master`, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minute timeout
    });

    const renderTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if (response.data.status === 'success') {
      console.log('✅ Render successful!');
      console.log(`   Time: ${renderTime}s`);
      console.log(`   Video URL: ${response.data.url}`);
      console.log('\n📋 Next steps:');
      console.log('   1. Open the video URL in your browser');
      console.log('   2. Verify the video has audio');
      console.log('   3. Check that background audio is present throughout');
      console.log('   4. If clips had audio, verify it\'s mixed with background audio\n');
      
      // Save result to file
      const result = {
        success: true,
        renderTime: `${renderTime}s`,
        videoUrl: response.data.url,
        timestamp: new Date().toISOString(),
        testCase: 'vid-1.3 with multiple clips and background audio'
      };
      
      fs.writeFileSync('test_audio_fix_result.json', JSON.stringify(result, null, 2));
      console.log('💾 Result saved to test_audio_fix_result.json\n');
      
    } else {
      console.error('❌ Render failed:', response.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Server response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testAudioRendering();
