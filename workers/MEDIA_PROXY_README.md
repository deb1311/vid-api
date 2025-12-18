# Media Proxy Worker

A Cloudflare Worker that proxies external video/image URLs to bypass CORS restrictions and handle redirects.

## Purpose

Many external media URLs (like Pexels download links) don't work directly in browsers due to:
- CORS restrictions
- Redirect chains that browsers can't follow for media elements
- Missing proper content-type headers

This proxy solves these issues by:
1. Following redirects server-side
2. Adding proper CORS headers
3. Forwarding Range headers for video streaming
4. Caching responses for better performance

## Deployment

```bash
cd workers
npx wrangler deploy --config media-proxy-wrangler.toml
```

## Usage

```
https://media-proxy.debabratamaitra898.workers.dev/?url=ENCODED_URL
```

### Example

```javascript
// Original URL that doesn't work directly
const pexelsUrl = 'https://www.pexels.com/download/video/1093661/';

// Proxied URL that works
const proxyUrl = `https://media-proxy.debabratamaitra898.workers.dev/?url=${encodeURIComponent(pexelsUrl)}`;

// Use in video element
const video = document.createElement('video');
video.src = proxyUrl;
```

## Integration with Video Editor

The video editor app (`video-editor-app/app.js`) automatically uses this proxy as a fallback when:
1. Direct loading fails
2. CORS-enabled loading fails
3. The URL is from an external domain

This happens transparently - users just paste any video/image URL and it will work.

## Supported URL Types

- Pexels video downloads
- Direct video file URLs (.mp4, .webm, .mov, etc.)
- Image URLs (.jpg, .png, .gif, .webp, etc.)
- Any URL that returns media content

## Testing

Open `video-editor-app/test_media_proxy.html` in a browser to test the proxy with various URLs.

## Limitations

- Some sites may block Cloudflare Worker requests
- Very large files may timeout
- Rate limiting may apply for high-traffic usage
