// Test script to verify MIME types are correct
const https = require('https');

const testUrls = [
    'https://video-editor-api-519298355551.us-central1.run.app/editor/styles.css',
    'https://video-editor-api-519298355551.us-central1.run.app/editor/app.js',
    'https://video-editor-api-519298355551.us-central1.run.app/editor/'
];

const expectedMimeTypes = {
    'styles.css': 'text/css',
    'app.js': 'application/javascript',
    '/': 'text/html'
};

async function testMimeType(url) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, { method: 'HEAD' }, (res) => {
            const contentType = res.headers['content-type'];
            const filename = url.split('/').pop() || '/';
            const expected = expectedMimeTypes[filename];
            
            console.log(`${filename}: ${contentType} (expected: ${expected})`);
            
            if (contentType && contentType.includes(expected)) {
                console.log(`✅ ${filename} - MIME type correct`);
                resolve(true);
            } else {
                console.log(`❌ ${filename} - MIME type incorrect`);
                resolve(false);
            }
        });
        
        req.on('error', (err) => {
            console.error(`❌ Error testing ${url}:`, err.message);
            resolve(false);
        });
        
        req.end();
    });
}

async function runTests() {
    console.log('Testing MIME types...\n');
    
    const results = await Promise.all(testUrls.map(testMimeType));
    const allPassed = results.every(result => result);
    
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('✅ All MIME type tests passed!');
    } else {
        console.log('❌ Some MIME type tests failed. Redeploy needed.');
    }
}

runTests().catch(console.error);