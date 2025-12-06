const axios = require('axios');

// Simulate exactly what the video editor does when clicking "Render Video"
async function testEditorRender() {
  console.log('🎬 Testing Editor Render Button Implementation\n');
  
  // This is the exact format the editor sends
  const currentData = {
    "quote": "POV: My lawyer on the phone telling me its best to leave the country (I already left)",
    "videoUrl": "https://videos.pexels.com/video-files/6184758/6184758-hd_1080_2048_24fps.mp4",
    "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/599_audio.mp3",
    "watermark": "@e2",
    "duration": 6,
    "endpoint": "/vid-1"  // This gets removed by the editor before sending
  };
  
  const endpoint = "vid-1";  // From dropdown or Notion
  const serverUrl = "http://localhost:8080";
  
  // Simulate what the editor does: remove endpoint field from data
  const cleanData = { ...currentData };
  delete cleanData.endpoint;
  
  const payload = {
    endpoint: endpoint,
    data: cleanData
  };
  
  console.log('📦 Payload (exactly as editor sends it):');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n🚀 Sending to /master endpoint...\n');
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${serverUrl}/master`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 180000
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ SUCCESS (${duration}s)`);
    console.log('\n📹 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.url) {
      console.log(`\n🎥 Video URL: ${response.data.url}`);
      console.log('\n✨ This is exactly what the editor would receive!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Editor render button implementation is working correctly!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ FAILED');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testEditorRender();
