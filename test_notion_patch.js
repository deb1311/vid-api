// Test script to verify Notion PATCH functionality
const https = require('https');

async function testNotionPatch() {
    console.log('🧪 Testing Notion PATCH functionality...\n');

    // First, get a record to test with
    console.log('1. Getting Notion records...');
    
    const getOptions = {
        hostname: 'notion-reader.debabratamaitra898.workers.dev',
        path: '/',
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(getOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const records = JSON.parse(data);
                    console.log(`✅ Found ${records.total} records`);
                    
                    if (records.items && records.items.length > 0) {
                        const testRecord = records.items[0];
                        const formulaId = testRecord.properties ? testRecord.properties.ID : testRecord.id;
                        const username = testRecord.properties ? testRecord.properties.Username : 'Unknown';
                        console.log(`📝 Testing with record: ${formulaId} (${username})`);
                        console.log(`📋 Full record properties:`, testRecord.properties);
                        
                        // Now test PATCH
                        testPatchRequest(formulaId);
                    } else {
                        console.log('❌ No records found to test with');
                    }
                } catch (error) {
                    console.error('❌ Error parsing GET response:', error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Error in GET request:', error);
        });
        
        req.end();
    });
}

function testPatchRequest(formulaId) {
    console.log(`\n2. Testing PATCH request for formula_id: ${formulaId}`);
    
    const testPayload = {
        json: {
            test: "This is a test update",
            timestamp: new Date().toISOString()
        },
        status: 'Confirmed'
    };
    
    const postData = JSON.stringify(testPayload);
    
    const patchOptions = {
        hostname: 'notion-reader.debabratamaitra898.workers.dev',
        path: `/?formula_id=${encodeURIComponent(formulaId)}`,
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    console.log(`🔗 PATCH URL: https://${patchOptions.hostname}${patchOptions.path}`);
    console.log(`📦 Payload:`, testPayload);
    
    const req = https.request(patchOptions, (res) => {
        let data = '';
        
        console.log(`📊 Response Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📋 Response Headers:`, res.headers);
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`📥 Response Body:`, data);
            
            try {
                const response = JSON.parse(data);
                if (res.statusCode === 200 && response.success) {
                    console.log('✅ PATCH request successful!');
                } else {
                    console.log('❌ PATCH request failed:', response);
                }
            } catch (error) {
                console.log('❌ Error parsing PATCH response:', error);
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Error in PATCH request:', error);
    });
    
    req.write(postData);
    req.end();
}

// Run the test
testNotionPatch().catch(console.error);