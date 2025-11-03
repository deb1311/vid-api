const axios = require('axios');

const testData = {
    "endpoint": "vid-1.3",
    "data": {
        "quote": "GFGEG",
        "author": "",
        "watermark": "@TheSuccessFormula",
        "audioUrl": "https://vllxucytucjyflsenjmz.supabase.co/storage/v1/object/public/assets/relaxing-guitar-loop-v5-245859.mp3",
        "duration": 10,
        "clips": [
            {
                "start": 0,
                "duration": 1,
                "description": "dhdghgh",
                "begin": 8.6,
                "volume": 100,
                "videourl": "https://www.pexels.com/download/video/30763731/"
            },
            {
                "start": 1,
                "duration": 1,
                "description": "",
                "videourl": "https://www.pexels.com/download/video/13765936/"
            },
            {
                "start": 2,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/13943357/pexels-photo-13943357.jpeg"
            },
            {
                "start": 3,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/18673852/pexels-photo-18673852.jpeg"
            },
            {
                "start": 4,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/13125315/pexels-photo-13125315.jpeg"
            },
            {
                "start": 5,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/18858931/pexels-photo-18858931.jpeg"
            },
            {
                "start": 6,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/3036363/pexels-photo-3036363.jpeg"
            },
            {
                "start": 7,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/14508041/pexels-photo-14508041.jpeg"
            },
            {
                "start": 8,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/9614840/pexels-photo-9614840.jpeg"
            },
            {
                "start": 9,
                "duration": 1,
                "description": "",
                "imageurl": "https://images.pexels.com/photos/7478696/pexels-photo-7478696.jpeg"
            }
        ],
        "overlay": true
    }
};

async function testMasterEndpoint() {
    console.log('Testing master endpoint on Google Cloud Run...');
    console.log('Payload:', JSON.stringify(testData, null, 2));
    
    try {
        const startTime = Date.now();
        
        const response = await axios.post('https://video-editor-api-519298355551.us-central1.run.app/master', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 300000 // 5 minutes timeout
        });
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log('\n✅ SUCCESS!');
        console.log(`Processing time: ${duration}s`);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.data.videoUrl) {
            console.log('Generated video URL:', response.data.videoUrl);
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
            console.error('Request details:', error.request);
        }
    }
}

testMasterEndpoint();