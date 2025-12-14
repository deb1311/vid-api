// Using built-in fetch (Node.js 18+)

async function testVid1Quick() {
    console.log('🎬 Quick Vid-1 Test with Local Assets\n');
    
    const payload = {
        endpoint: 'vid-1',
        data: {
            quote: "Testing the new full-screen fix with proper text positioning",
            videoUrl: "http://localhost:8080/assets/test-video.mp4",
            audioUrl: "http://localhost:8080/assets/test-audio.mp3",
            watermark: "@test",
            duration: 5
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
            console.log('\n✨ Test completed successfully!');
            console.log('\n🔍 Check the video to verify:');
            console.log('   - Full-screen coverage (no black bars)');
            console.log('   - Text positioned correctly (not at very top)');
            console.log('   - Watermark centered');
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

testVid1Quick();