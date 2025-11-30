# Filebase S3 Media Fetcher Worker

Cloudflare Worker that fetches images and videos from Filebase S3 with proper authentication and CORS support.

## Features

- AWS Signature V4 authentication for Filebase S3
- CORS enabled for browser access
- Range request support for video streaming
- File listing endpoint
- Caching headers for optimal performance

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
https://filebase-media-fetcher.your-subdomain.workers.dev
```

## Usage

### List files in a bucket
```
GET https://filebase-media-fetcher.your-subdomain.workers.dev/{bucket}?list
GET https://filebase-media-fetcher.your-subdomain.workers.dev/{bucket}?list&prefix=videos/
```

Returns JSON:
```json
{
  "bucket": "my-bucket",
  "fileCount": 10,
  "files": [
    {
      "name": "video.mp4",
      "size": 1810000,
      "sizeFormatted": "1.73 MB",
      "lastModified": "2024-01-01T00:00:00.000Z",
      "url": "https://s3.filebase.com/my-bucket/video.mp4"
    }
  ]
}
```

### Fetch a file
```
GET https://filebase-media-fetcher.your-subdomain.workers.dev/{bucket}/{path/to/file}
```

### Example
```javascript
// List files
const response = await fetch('https://filebase-media-fetcher.your-subdomain.workers.dev/my-bucket?list');
const data = await response.json();

// Fetch a video
const videoUrl = 'https://filebase-media-fetcher.your-subdomain.workers.dev/my-bucket/videos/clip.mp4';

// Use in HTML
<video src="https://filebase-media-fetcher.your-subdomain.workers.dev/my-bucket/videos/clip.mp4" controls></video>
```

## Credentials

Current credentials (hardcoded):
- Access Key: E234F4F851C48943BE64
- Secret Key: PNrYfAS81syqS4gO0GBXq2gje3OJYG2khzHGMTq1
- Endpoint: https://s3.filebase.com

### Security Best Practice

For production, use Wrangler secrets:
```bash
wrangler secret put S3_ACCESS_KEY
wrangler secret put S3_SECRET_KEY
```

Then update the worker code:
```javascript
const S3_ACCESS_KEY = env.S3_ACCESS_KEY;
const S3_SECRET_KEY = env.S3_SECRET_KEY;
```

## Testing Locally

```bash
wrangler dev --config filebase-fetcher-wrangler.toml
```

Then access: `http://localhost:8787/{bucket}/{path}`

## How It Works

1. Worker receives request with bucket and file path
2. Creates AWS Signature V4 authentication headers
3. Fetches file from Filebase S3
4. Returns file with CORS headers for browser access

The worker implements AWS Signature V4 signing process:
- Creates canonical request
- Generates string to sign
- Calculates HMAC-SHA256 signature
- Adds Authorization header

## Differences from B2 Worker

- Uses S3-compatible API instead of B2 API
- Implements AWS Signature V4 instead of Basic Auth
- No token caching needed (signature generated per request)
- XML response parsing for list operations
