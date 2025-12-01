// Test the exact URL format that's failing
const https = require('https');

const testUrl = 'https://filebase-media-fetcher.debabratamaitra898.workers.dev/stock-clips/Motion%20Monarchy%20119931064_6305904932807780_8651220583749886590_n.mp4';

console.log('Testing URL:', testUrl);

https.get(testUrl, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    
    if (res.statusCode === 200) {
        console.log('✅ URL is accessible');
    } else {
        console.log('❌ URL returned error:', res.statusCode);
    }
    
    res.on('data', () => {}); // Consume data
    res.on('end', () => {
        console.log('Request complete');
    });
}).on('error', (err) => {
    console.error('❌ Request failed:', err.message);
});
