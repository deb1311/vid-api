# Backblaze B2 Media Fetcher Worker

Cloudflare Worker that fetches images and videos from Backblaze B2 with proper authentication and CORS support.

## Features

- Backblaze B2 API authentication with token caching
- CORS enabled for browser access
- Caching headers for optimal performance
- Error handling

## Deployment

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Deploy the Worker
```bash
cd workers
wrangler deploy --config filebase-fetcher-wrangler.toml
```

### 4. Get Your Worker URL
After deployment, you'll receive a URL like:
```
https://b2-media-fetcher.your-subdomain.workers.dev
```

## Usage

### Fetch a file from B2
```
GET https://b2-media-fetcher.your-subdomain.workers.dev/{bucket}/{path/to/file}
```

### Example
```javascript
// Fetch an image
const imageUrl = 'https://b2-media-fetcher.your-subdomain.workers.dev/my-bucket/images/photo.jpg';

// Fetch a video
const videoUrl = 'https://b2-media-fetcher.your-subdomain.workers.dev/my-bucket/videos/clip.mp4';

// Use in HTML
<img src="https://b2-media-fetcher.your-subdomain.workers.dev/my-bucket/images/photo.jpg" />
<video src="https://b2-media-fetcher.your-subdomain.workers.dev/my-bucket/videos/clip.mp4" />
```

## Security Notes

⚠️ **Important**: The credentials are currently hardcoded in the worker. For production:

1. Use Wrangler secrets:
```bash
wrangler secret put B2_KEY_ID
wrangler secret put B2_APPLICATION_KEY
```

2. Update the worker code to use environment variables:
```javascript
const B2_KEY_ID = env.B2_KEY_ID;
const B2_APPLICATION_KEY = env.B2_APPLICATION_KEY;
```

## Custom Domain (Optional)

To use a custom domain:

1. Add a route in `filebase-fetcher-wrangler.toml`:
```toml
routes = [
  { pattern = "media.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

2. Redeploy:
```bash
wrangler deploy --config filebase-fetcher-wrangler.toml
```

## Testing Locally

```bash
wrangler dev --config filebase-fetcher-wrangler.toml
```

Then access: `http://localhost:8787/{bucket}/{path}`

## How It Works

1. Worker receives request with bucket and file path
2. Authenticates with Backblaze B2 API (caches token for 23 hours)
3. Fetches file from B2 using download URL
4. Returns file with CORS headers for browser access

The B2 authorization token is cached to avoid repeated API calls, improving performance.
