# Master Endpoint Guide

The master endpoint (`/master`) is a wrapper that allows you to call any of the video creation endpoints through a single unified interface.

## Usage

**Endpoint:** `POST /master`

**Parameters:**
- `endpoint` (required): The name of the endpoint to call
- `data` (required): JSON object containing the parameters for the target endpoint

**Response Format:**
- Success: `{ "status": "success", "url": "/video/[filename].mp4" }`
- Error: `{ "status": "error", "error": "Error description" }`

## Available Endpoints

| Endpoint Name | Description |
|---------------|-------------|
| `style1` | Two-step approach with bottom text placement |
| `style2` | Single-step approach with bottom text placement |
| `style3` | Two-step approach with top text placement |
| `style4` | Single-step approach with top text placement |
| `vid-1` | Video input with top text placement, no fade |
| `vid-1.2` | Multi-clip approach with multiple video sources |
| `vid-1.3` | (Available but not yet implemented in master) |
| `vid-1.4` | (Available but not yet implemented in master) |
| `vid-1.5` | (Available but not yet implemented in master) |

## Example Usage

### Style 1 Example
```javascript
const response = await fetch('/master', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'style1',
    data: {
      quote: 'Your inspirational quote here',
      author: 'Author Name',
      watermark: 'Your Watermark',
      imageUrl: 'https://example.com/image.jpg',
      audioUrl: 'https://example.com/audio.mp3',
      duration: 30
    }
  })
});

const result = await response.json();
// Success: { "status": "success", "url": "/video/abc123-video.mp4" }
// Error: { "status": "error", "error": "Quote is required" }
```

### Vid-1.2 Multi-clip Example
```javascript
const response = await fetch('/master', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'vid-1.2',
    data: {
      quote: 'Your quote here',
      author: 'Author Name',
      audioUrl: 'https://example.com/audio.mp3',
      clips: [
        {
          videourl: 'https://example.com/video1.mp4',
          start: 0,
          duration: 5
        },
        {
          imageurl: 'https://example.com/image1.jpg',
          start: 5,
          duration: 3
        }
      ]
    }
  })
});
```

## Error Handling

The master endpoint wraps all errors with context about which endpoint failed:

- **Master-level errors:** Missing endpoint/data parameters, invalid endpoint names
- **Endpoint-level errors:** Wrapped with context like "Master endpoint error (style1): Quote is required"

## File Uploads

The master endpoint supports file uploads through multipart/form-data, just like the individual endpoints. The files will be passed through to the target endpoint.

## Testing

Run the test suite:
```bash
node test_master_endpoint.js
```

Make sure the server is running first:
```bash
node server-modular.js
```