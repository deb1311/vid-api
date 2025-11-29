# Backblaze B2 Media Fetcher - Setup Complete ✅

## Overview
Cloudflare Worker that fetches videos and images from Backblaze B2 bucket `assets-3234` with authentication and CORS support.

## Status
✅ **Working** - Successfully connected to B2, listing 447 files, and serving video content for playback

## Features
- ✅ B2 API authentication with token caching
- ✅ File listing endpoint
- ✅ File download with CORS headers
- ✅ Automatic content-type detection
- ✅ Cache headers for performance

## Endpoints

### List Files
```
GET http://127.0.0.1:8787/assets-3234?list
GET http://127.0.0.1:8787/assets-3234?list&prefix=videos/
```

Returns JSON with all files in bucket:
```json
{
  "bucket": "assets-3234",
  "fileCount": 447,
  "files": [
    {
      "name": "Motion Monarchy 1.mp4",
      "size": 1810000,
      "sizeFormatted": "1.73 MB",
      "contentType": "video/mp4",
      "uploadTimestamp": 1234567890,
      "url": "https://f005.backblazeb2.com/file/assets-3234/Motion Monarchy 1.mp4"
    }
  ]
}
```

### Fetch File
```
GET http://127.0.0.1:8787/assets-3234/[filename]
```

Example:
```
http://127.0.0.1:8787/assets-3234/Motion Monarchy 1.mp4
```

Returns the actual file with CORS headers enabled.

## Local Testing

### Start Worker
```bash
cd workers
wrangler dev --config filebase-fetcher-wrangler.toml
```

Worker runs at: `http://127.0.0.1:8787`

### Test Files
```bash
# List all files
node list_files.js

# Open test page
start test_b2_worker.html
```

## Deployment

### Deploy to Cloudflare
```bash
cd workers
wrangler deploy --config filebase-fetcher-wrangler.toml
```

You'll get a production URL like:
```
https://b2-media-fetcher.your-subdomain.workers.dev
```

### Use in Production
```javascript
// List files
const response = await fetch('https://your-worker.workers.dev/assets-3234?list');
const data = await response.json();

// Fetch a video
const videoUrl = 'https://your-worker.workers.dev/assets-3234/Motion Monarchy 1.mp4';

// Use in HTML
<video src="https://your-worker.workers.dev/assets-3234/Motion Monarchy 1.mp4" controls></video>
```

## Current Bucket Contents
- **Bucket:** assets-3234
- **Total Files:** 447
- **File Types:** Mostly video/mp4 files
- **Naming Pattern:** "Motion Monarchy [name].mp4"

## Security Notes

⚠️ **Credentials are currently hardcoded**

For production, use Wrangler secrets:
```bash
wrangler secret put B2_KEY_ID
wrangler secret put B2_APPLICATION_KEY
```

Then update worker code:
```javascript
const B2_KEY_ID = env.B2_KEY_ID;
const B2_APPLICATION_KEY = env.B2_APPLICATION_KEY;
```

## Files
- `filebase-fetcher.js` - Main worker code
- `filebase-fetcher-wrangler.toml` - Deployment config
- `test_b2_worker.html` - Interactive test page
- `test_b2_worker.js` - Node.js test script
- `list_files.js` - Quick file listing script

## Next Steps
1. ✅ Worker is running locally
2. Deploy to Cloudflare Workers
3. Update your video editor to use the worker URLs
4. (Optional) Set up custom domain
5. (Optional) Move credentials to secrets
