# Cloudflare Pages Deployment Guide

## Audio File Compatibility

### ✅ **What Works on Cloudflare Pages**

1. **External Audio URLs**
   - `https://example.com/audio.mp3`
   - `https://cdn.example.com/music.wav`
   - Any HTTPS audio URL with proper CORS headers

2. **Relative Audio Files**
   - `./audio/music.mp3` (in audio folder)
   - `music.mp3` (in same directory)
   - `/assets/audio.wav` (absolute path from root)

3. **Popular Audio Hosting Services**
   - Google Cloud Storage (public buckets)
   - AWS S3 (with public access)
   - Cloudflare R2 (with public access)
   - GitHub raw files
   - Any CDN with CORS support

### 🚫 **What Doesn't Work**

1. **Local file:// URLs** (only works in development)
2. **URLs without CORS headers** (will be blocked)
3. **HTTP URLs** (mixed content blocked on HTTPS sites)

## Deployment Steps

### 1. **Prepare Audio Files**

**Option A: Upload to Cloudflare Pages**
```
video-editor-app/
├── index.html
├── app.js
├── styles.css
├── audio/
│   ├── background-music.mp3
│   └── instagram-audio.mp3
└── test_files/
    └── test_with_audio.json
```

**Option B: Use External CDN**
- Upload to Google Cloud Storage
- Upload to AWS S3 with public access
- Use any CDN with CORS support

### 2. **Update JSON Test Files**

```json
{
  "audioUrl": "https://your-site.pages.dev/audio/background-music.mp3",
  "clips": [...],
  "captions": [...]
}
```

Or for external CDN:
```json
{
  "audioUrl": "https://storage.googleapis.com/your-bucket/audio.mp3",
  "clips": [...],
  "captions": [...]
}
```

### 3. **Deploy to Cloudflare Pages**

1. Push to GitHub repository
2. Connect to Cloudflare Pages
3. Set build settings:
   - **Build command**: (none needed for static site)
   - **Build output directory**: `/`
4. Deploy!

## Audio URL Examples

### **Working External URLs**
```javascript
// Google Cloud Storage (public)
"audioUrl": "https://storage.googleapis.com/bucket-name/audio.mp3"

// GitHub raw files
"audioUrl": "https://raw.githubusercontent.com/user/repo/main/audio.mp3"

// Cloudflare R2 (public)
"audioUrl": "https://pub-123.r2.dev/audio.mp3"

// Your own Cloudflare Pages site
"audioUrl": "https://your-site.pages.dev/audio/music.mp3"
```

### **Relative Paths (after deployment)**
```javascript
// Same directory as index.html
"audioUrl": "instagram-audio.mp3"

// In audio subfolder
"audioUrl": "audio/background-music.mp3"

// Absolute path from site root
"audioUrl": "/assets/audio/music.wav"
```

## Testing Before Deployment

Use the **"☁️ EXTERNAL AUDIO"** test file to verify external URL support works locally.

## CORS Headers for Your Own Server

If hosting audio on your own server, ensure these headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Range
```

## Performance Tips

1. **Use compressed audio** (MP3 at 128kbps is usually sufficient)
2. **Enable Cloudflare caching** for faster loading
3. **Use CDN** for large audio files
4. **Preload audio** with `preload="auto"` (already implemented)

## Troubleshooting

### Audio Not Loading
1. Check browser console for CORS errors
2. Verify audio URL is accessible in browser
3. Test with the 🔊 audio test button
4. Use `Ctrl+A` to disable audio if needed

### Sync Issues
1. Use `Ctrl+S` to manually sync audio
2. Check console for sync warnings
3. Verify audio file isn't corrupted

The video editor is fully compatible with Cloudflare Pages deployment and will work seamlessly with external audio URLs!