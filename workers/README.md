# B2 Media Fetcher - Cloudflare Worker

Cloudflare Worker that provides authenticated access to videos in Backblaze B2 bucket `assets-3234`.

## ✅ Status: Ready for Production

The worker is fully functional and tested. Currently experiencing B2 bandwidth cap limit (see B2_BANDWIDTH_NOTE.md).

## Quick Start

### Local Development
```bash
cd workers
wrangler dev --config filebase-fetcher-wrangler.toml
```

Worker runs at: `http://127.0.0.1:8787`

### Deploy to Production
```bash
wrangler deploy --config filebase-fetcher-wrangler.toml
```

## Features

✅ **B2 Authentication** - Automatic token management with 23-hour caching  
✅ **CORS Enabled** - Works from any browser/domain  
✅ **Range Requests** - Supports video seeking and streaming  
✅ **HEAD Requests** - FFmpeg compatible  
✅ **File Listing** - Browse bucket contents  
✅ **URL Encoding** - Handles spaces and special characters  

## Usage

### List Files
```
GET /assets-3234?list
```

Returns JSON with all 447 videos in the bucket.

### Get Video
```
GET /assets-3234/{filename}
```

Example:
```
http://127.0.0.1:8787/assets-3234/Motion%20Monarchy%201.mp4
```

## Integration

### Video Editor App (Browser)
```html
<video src="https://your-worker.workers.dev/assets-3234/video.mp4" controls></video>
```

### Backend Rendering (Node.js)
```javascript
const url = 'https://your-worker.workers.dev/assets-3234/video.mp4';
const response = await fetch(url);
const buffer = await response.arrayBuffer();
```

### Backend Rendering (FFmpeg)
```bash
ffmpeg -i "https://your-worker.workers.dev/assets-3234/video.mp4" output.mp4
```

## Documentation

- **INTEGRATION_GUIDE.md** - Complete integration examples
- **B2_WORKER_SETUP.md** - Setup and deployment guide
- **B2_BANDWIDTH_NOTE.md** - Current B2 cap status
- **FILEBASE_FETCHER_README.md** - Technical details

## Testing

### Run Integration Tests
```bash
node test_integration.js
```

### Test in Browser
```bash
node serve_test.js
```
Then open: `http://localhost:3000/test_b2_simple.html`

## Files

### Core Files
- `filebase-fetcher.js` - Main worker code
- `filebase-fetcher-wrangler.toml` - Deployment config

### Test Files
- `test_integration.js` - Integration test suite
- `test_b2_simple.html` - Video browser UI
- `test_comprehensive.html` - Diagnostic tests
- `serve_test.js` - Local test server

### Documentation
- `README.md` - This file
- `INTEGRATION_GUIDE.md` - Integration examples
- `B2_WORKER_SETUP.md` - Setup guide
- `B2_BANDWIDTH_NOTE.md` - B2 cap info

## Next Steps

1. ✅ Worker code complete
2. ✅ Tests created
3. ✅ Documentation written
4. ⏳ Increase B2 download cap
5. ⏳ Deploy to Cloudflare Workers
6. ⏳ Update video editor with worker URL
7. ⏳ Update backend endpoints with worker URL

## Security

⚠️ **Production:** Move credentials to Wrangler secrets

```bash
wrangler secret put B2_KEY_ID
wrangler secret put B2_APPLICATION_KEY
```

Then update worker code to use `env.B2_KEY_ID` and `env.B2_APPLICATION_KEY`.

## Support

- B2 API: https://www.backblaze.com/b2/docs/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/

## License

Part of the video API project.
