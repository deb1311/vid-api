// Test downloading a file from the worker
const WORKER_URL = 'http://127.0.0.1:8787';

async function testDownload() {
  const fileName = 'Motion Monarchy 1.mp4';
  const encodedName = encodeURIComponent(fileName);
  const url = `${WORKER_URL}/assets-3234/${encodedName}`;
  
  console.log('Testing download:', url);
  
  try {
    const response = await fetch(url);
    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('Error response:', text);
    } else {
      console.log('Success! Content-Type:', response.headers.get('content-type'));
      console.log('Content-Length:', response.headers.get('content-length'));
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

testDownload();
