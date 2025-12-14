// Using built-in fetch (Node.js 18+)

async function testVid1Debug() {
    console.log('🎬 Debug Vid-1 Text Issue\n');
    
    const payload = {
        endpoint: 'vid-1',
        data: {
            quote: "Test quote for debugging",
            videoUrl: "https://videos.pexels.com/video-files/6184758/6184758-hd_1080_2048_24fps.mp4",
            audioUrl: "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/599_audio.mp3",
            watermark: "@test",
            duration: 3
        }
    };

    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    console.log('\n🚀 Sending to /master endpoint...\n');

    try {
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:8080/master', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            console.log(`✅ SUCCESS (${duration}s)\n`);
            console.log('📹 Response:', JSON.stringify(result, null, 2));
            console.log(`\n🎥 Video URL: ${result.url}`);
            console.log('\n🔍 Check if text appears in the video!');
        } else {
            console.log(`❌ FAILED (${duration}s)`);
            console.log('Status:', response.status);
            console.log('Data:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ NETWORK ERROR');
        console.log('Error:', error.message);
    }
}

testVid1Debug();