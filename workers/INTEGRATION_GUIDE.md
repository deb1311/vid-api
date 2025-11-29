# B2 Worker Integration Guide

## Overview
The B2 worker provides authenticated access to videos in the `assets-3234` bucket through simple HTTP URLs that work everywhere.

## Worker URL Format

### Local Development
```
http://127.0.0.1:8787/assets-3234/{filename}
```

### Production (after deployment)
```
https://b2-media-fetcher.your-subdomain.workers.dev/assets-3234/{filename}
```

## Usage Examples

### 1. Video Editor App (Browser)

The worker URLs work directly in HTML video elements:

```html
<video controls>
  <source src="https://your-worker.workers.dev/assets-3234/Motion%20Monarchy%201.mp4" type="video/mp4">
</video>
```

Or in JavaScript:
```javascript
const videoUrl = 'https://your-worker.workers.dev/assets-3234/' + encodeURIComponent(fileName);
videoElement.src = videoUrl;
```

### 2. Backend Rendering (Node.js/FFmpeg)

The worker URLs work with any HTTP client:

```javascript
// Node.js fetch
const response = await fetch('https://your-worker.workers.dev/assets-3234/video.mp4');
const buffer = await response.arrayBuffer();

// Or download to file
const fs = require('fs');
const https = require('https');

const file = fs.createWriteStream('video.mp4');
https.get('https://your-worker.workers.dev/assets-3234/video.mp4', (response) => {
  response.pipe(file);
});
```

```bash
# FFmpeg can use the URL directly
ffmpeg -i "https://your-worker.workers.dev/assets-3234/video.mp4" output.mp4

# wget/curl
wget "https://your-worker.workers.dev/assets-3234/video.mp4"
curl -O "https://your-worker.workers.dev/assets-3234/video.mp4"
```

### 3. List Available Files

Get all files in the bucket:
```javascript
const response = await fetch('https://your-worker.workers.dev/assets-3234?list');
const data = await response.json();

// Returns:
{
  "bucket": "assets-3234",
  "fileCount": 447,
  "files": [
    {
      "name": "Motion Monarchy 1.mp4",
      "size": 1900647,
      "sizeFormatted": "1.81 MB",
      "contentType": "video/mp4",
      "uploadTimestamp": 1234567890,
      "url": "https://f005.backblazeb2.com/file/assets-3234/Motion%20Monarchy%201.mp4"
    }
  ]
}
```

## Features

✅ **CORS Enabled** - Works from any browser/domain
✅ **Range Requests** - Supports video seeking and streaming
✅ **Authentication** - Handles B2 auth automatically
✅ **Caching** - Auth tokens cached for 23 hours
✅ **URL Encoding** - Handles spaces and special characters

## Integration with Your Apps

### Video Editor App

Update your video editor to use worker URLs:

```javascript
// In video-editor-app/app.js
const WORKER_URL = 'https://your-worker.workers.dev';
const BUCKET = 'assets-3234';

function getVideoUrl(fileName) {
  return `${WORKER_URL}/${BUCKET}/${encodeURIComponent(fileName)}`;
}

// Use in video element
videoElement.src = getVideoUrl('Motion Monarchy 1.mp4');
```

### Backend Rendering Endpoints

Update your rendering endpoints to fetch from worker:

```javascript
// In server.js or rendering endpoint
const WORKER_URL = 'https://your-worker.workers.dev';

async function downloadVideo(fileName) {
  const url = `${WORKER_URL}/assets-3234/${encodeURIComponent(fileName)}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.statusText}`);
  }
  
  return response.body; // Stream or buffer
}

// Use with FFmpeg
const videoUrl = `${WORKER_URL}/assets-3234/${encodeURIComponent(fileName)}`;
// FFmpeg can use this URL directly as input
```

## Deployment

### 1. Deploy Worker to Cloudflare
```bash
cd workers
wrangler deploy --config filebase-fetcher-wrangler.toml
```

You'll get a production URL like:
```
https://b2-media-fetcher.your-subdomain.workers.dev
```

### 2. Update Your Apps

Replace the worker URL in your applications:

**Video Editor:**
```javascript
// video-editor-app/app.js
const WORKER_URL = 'https://b2-media-fetcher.your-subdomain.workers.dev';
```

**Backend Server:**
```javascript
// server.js
const B2_WORKER_URL = 'https://b2-media-fetcher.your-subdomain.workers.dev';
```

### 3. Test Integration

Test that both apps can access videos:

```bash
# Test from browser (video editor)
# Open: https://your-editor.com and load a video

# Test from backend (curl)
curl -I "https://b2-media-fetcher.your-subdomain.workers.dev/assets-3234/Motion%20Monarchy%201.mp4"
```

## Security Notes

⚠️ **Current Setup:** B2 credentials are in the worker code

**For Production:**
1. Use Wrangler secrets:
```bash
wrangler secret put B2_KEY_ID
wrangler secret put B2_APPLICATION_KEY
```

2. Update worker code:
```javascript
const B2_KEY_ID = env.B2_KEY_ID;
const B2_APPLICATION_KEY = env.B2_APPLICATION_KEY;
```

## Custom Domain (Optional)

To use a custom domain like `media.yourdomain.com`:

1. Add route in `filebase-fetcher-wrangler.toml`:
```toml
routes = [
  { pattern = "media.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

2. Redeploy:
```bash
wrangler deploy --config filebase-fetcher-wrangler.toml
```

3. Update your apps to use `https://media.yourdomain.com`

## Troubleshooting

### Videos not loading in browser
- Check CORS headers are present
- Verify Range request support (status 206)
- Check browser console for errors

### Backend can't fetch videos
- Verify worker URL is accessible
- Check authentication is working
- Test with curl first

### Performance issues
- Worker caches auth tokens for 23 hours
- Consider adding CDN in front of worker
- B2 has bandwidth limits, monitor usage

## Example: Complete Integration

```javascript
// config.js - Shared configuration
export const MEDIA_CONFIG = {
  workerUrl: 'https://b2-media-fetcher.your-subdomain.workers.dev',
  bucket: 'assets-3234'
};

export function getMediaUrl(fileName) {
  return `${MEDIA_CONFIG.workerUrl}/${MEDIA_CONFIG.bucket}/${encodeURIComponent(fileName)}`;
}

// video-editor-app/app.js
import { getMediaUrl } from './config.js';

function loadVideo(fileName) {
  videoElement.src = getMediaUrl(fileName);
}

// server.js (backend)
import { getMediaUrl } from './config.js';

async function renderVideo(fileName) {
  const videoUrl = getMediaUrl(fileName);
  // Use with FFmpeg or download
  const response = await fetch(videoUrl);
  return response.body;
}
```

## Next Steps

1. ✅ Worker is deployed and working locally
2. Deploy to Cloudflare Workers
3. Update video editor app with worker URL
4. Update backend rendering endpoints with worker URL
5. Test end-to-end video loading and rendering
6. (Optional) Set up custom domain
7. (Optional) Move credentials to secrets
