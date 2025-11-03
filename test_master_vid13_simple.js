const axios = require('axios');

const testData = {
    "endpoint": "vid-1.3",
    "data": {
        "quote": "Simple Test",
        "author": "Test Author",
        "watermark": "@Test",
        "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/relaxing-guitar-loop-v5-245859.mp3",
        "clips": [
            {
                "start": 0,
                "duration": 3,
                "description": "Test image",
                "imageurl": "https://images.pexels.com/photos/3036363/pexels-photo-3036363.jpeg"
            },
            {
                "start": 3,
                "duration": 2,
                "description": "Another test image",
                "imageurl": "https://images.pexels.com/photos/13943357/pexels-photo-13943357.jpeg"
            }
        ],
        "overlay": false
    }
};

async function testMasterVid13Simple() {
    console.log('Testing master endpoint with simple vid-1.3 request...');
    console.log('Payload:', JSON.stringify(testData, null, 2));
    
    try {
        const startTime = Date.now();
        
        const response = await axios.post('https://video-editor-api-519298355551.us-central1.run.app/master', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 180000 // 3 minutes timeout
        });
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log('\n✅ SUCCESS!');
        console.log(`Processing time: ${duration}s`);
        console.log('Response status:', response.status);
        
        if (response.data.url) {
            console.log('Generated video URL:', response.data.url);
        }
        
        console.log('Full response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error('Error message:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status text:', error.response.statusText);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            console.error('No response received');
        }
    }
}

testMasterVid13Simple();