// Test Range header forwarding
const WORKER_URL = 'http://127.0.0.1:8787';
const BUCKET = 'assets-3234';

async function testRangeRequest() {
    try {
        // Get a file name first
        console.log('Getting file list...');
        const listResponse = await fetch(`${WORKER_URL}/${BUCKET}?list`);

        if (!listResponse.ok) {
            console.log(`List failed: ${listResponse.status} ${listResponse.statusText}`);
            const text = await listResponse.text();
            console.log(`Response: ${text}`);
            return;
        }

        const text = await listResponse.text();
        console.log(`Response start: ${text.substring(0, 500)}`);

        let listData;
        try {
            listData = JSON.parse(text);
        } catch (e) {
            console.log('Failed to parse JSON content');
            return;
        }

        if (!listData.files || listData.files.length === 0) {
            console.log('No files found in bucket');
            return;
        }

        const testFile = listData.files[0];
        const encodedName = encodeURIComponent(testFile.name);
        const fileUrl = `${WORKER_URL}/${BUCKET}/${encodedName}`;

        console.log(`Testing Range Request for: ${testFile.name}`);
        console.log(`URL: ${fileUrl}\n`);

        // Request first 100 bytes
        const response = await fetch(fileUrl, {
            headers: {
                'Range': 'bytes=0-99'
            }
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Content-Range: ${response.headers.get('content-range')}`);
        console.log(`Content-Length: ${response.headers.get('content-length')}`);

        if (response.status === 206 && response.headers.get('content-range')) {
            console.log('\n✅ Range request successful! Worker is forwarding headers correctly.');
        } else {
            console.log('\n❌ Range request failed. Worker might not be forwarding headers.');
        }

    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
}

testRangeRequest();
