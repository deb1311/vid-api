# Master Endpoint Documentation

The Master Endpoint is a unified wrapper that provides access to all video creation endpoints through a single interface. It simplifies API usage by offering consistent request/response formats and centralized error handling.

## 🚀 Quick Start

**Endpoint:** `POST /master`

**Basic Request:**
```json
{
  "endpoint": "style1",
  "data": {
    "quote": "Your inspirational quote here",
    "author": "Author Name",
    "imageUrl": "path/to/image.jpg",
    "audioUrl": "path/to/audio.mp3"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "url": "/video/abc123-video.mp4"
}
```

## 📋 Available Endpoints

| Endpoint | Description | Required Parameters |
|----------|-------------|-------------------|
| `style1` | Two-step approach with bottom text and fade | `quote`, `imageUrl`, `audioUrl` |
| `style2` | Single-step approach with bottom text | `quote`, `imageUrl`, `audioUrl` |
| `style3` | Two-step approach with top text and fade | `quote`, `imageUrl`, `audioUrl` |
| `style4` | Single-step approach with top text | `quote`, `imageUrl`, `audioUrl` |
| `vid-1` | Video input with top text, no fade | `quote`, `videoUrl`, `audioUrl` |
| `vid-1.2` | Multi-clip with mixed media support | `quote`, `audioUrl`, `clips` |
| `vid-1.3` | Smart aspect ratio with overlay support | `audioUrl`, `clips` |
| `vid-1.4` | Timed captions with overlay support | `audioUrl`, `clips`, `captions` |
| `vid-1.5` | Cinematic overlay with timed captions | `audioUrl`, `clips`, `captions` |

## 🎯 Endpoint Examples

### Style Endpoints (Image + Audio → Video)

#### Style 1 - Bottom Text with Fade
```json
{
  "endpoint": "style1",
  "data": {
    "quote": "Success is not final, failure is not fatal",
    "author": "Winston Churchill",
    "watermark": "MyBrand",
    "imageUrl": "assets/background.jpg",
    "audioUrl": "assets/narration.mp3",
    "duration": 30
  }
}
```

#### Style 3 - Top Text with Fade
```json
{
  "endpoint": "style3",
  "data": {
    "quote": "The only way to do great work is to love what you do",
    "author": "Steve Jobs",
    "imageUrl": "https://example.com/image.jpg",
    "audioUrl": "https://example.com/audio.mp3"
  }
}
```

### Vid Endpoints (Video + Audio → Enhanced Video)

#### Vid-1 - Single Video with Text
```json
{
  "endpoint": "vid-1",
  "data": {
    "quote": "Innovation distinguishes between a leader and a follower",
    "author": "Steve Jobs",
    "videoUrl": "assets/background-video.mp4",
    "audioUrl": "assets/voiceover.mp3",
    "duration": 45
  }
}
```

#### Vid-1.2 - Multi-Clip Video
```json
{
  "endpoint": "vid-1.2",
  "data": {
    "quote": "The future belongs to those who believe in the beauty of their dreams",
    "author": "Eleanor Roosevelt",
    "audioUrl": "assets/background-music.mp3",
    "clips": [
      {
        "videourl": "assets/clip1.mp4",
        "start": 0,
        "duration": 5
      },
      {
        "imageurl": "assets/image1.jpg",
        "start": 5,
        "duration": 3
      },
      {
        "videourl": "assets/clip2.mp4",
        "start": 8,
        "duration": 4,
        "volume": 50
      }
    ]
  }
}
```

#### Vid-1.4 - Timed Captions
```json
{
  "endpoint": "vid-1.4",
  "data": {
    "audioUrl": "assets/narration.mp3",
    "watermark": "MyChannel",
    "overlay": true,
    "clips": [
      {
        "videourl": "assets/main-video.mp4",
        "start": 0,
        "duration": 10
      }
    ],
    "captions": [
      {
        "text": "Welcome to our presentation",
        "start": 0,
        "duration": 3
      },
      {
        "text": "Let's explore the possibilities",
        "start": 3,
        "duration": 4
      }
    ]
  }
}
```

## 📁 File Handling

The master endpoint supports both local files and remote URLs:

### Local Files
```json
{
  "imageUrl": "assets/my-image.jpg",
  "audioUrl": "C:/Users/username/audio.mp3",
  "videoUrl": "./videos/clip.mp4"
}
```

### Remote URLs
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "audioUrl": "https://cdn.example.com/audio.mp3",
  "videoUrl": "https://storage.example.com/video.mp4"
}
```

### File Uploads (Multipart)
You can also upload files directly using multipart/form-data:

```javascript
const formData = new FormData();
formData.append('endpoint', 'style1');
formData.append('data', JSON.stringify({
  quote: 'Your quote here',
  author: 'Author Name'
}));
formData.append('image', imageFile);
formData.append('audio', audioFile);

fetch('/master', {
  method: 'POST',
  body: formData
});
```

## 🔧 Parameters Reference

### Common Parameters (All Endpoints)
- `quote` (string, optional*): Text to display on video
- `author` (string, optional): Author attribution
- `watermark` (string, optional): Watermark text
- `duration` (number, optional): Maximum video duration in seconds

*Required for style1-4 and vid-1, optional for vid-1.3+

### Media Parameters
- `imageUrl` (string): Path or URL to image file
- `audioUrl` (string): Path or URL to audio file  
- `videoUrl` (string): Path or URL to video file
- `instagramUrl` (string): Instagram URL for audio extraction

### Advanced Parameters (Vid-1.2+)
- `clips` (array): Array of video/image clips with timing
- `captions` (array): Array of timed text captions
- `overlay` (boolean): Enable cinematic overlay effect

### Clips Array Format
```json
{
  "videourl": "path/to/video.mp4",  // Video source
  "imageurl": "path/to/image.jpg",  // Image source (alternative to videourl)
  "start": 0,                       // Start time in timeline
  "duration": 5,                    // Clip duration in seconds
  "begin": 0,                       // Start time within source video (optional)
  "volume": 100                     // Volume percentage (optional, default: 100)
}
```

### Captions Array Format
```json
{
  "text": "Caption text to display",
  "start": 0,                       // Start time in seconds
  "duration": 3                     // Display duration in seconds
}
```

## 📤 Response Format

### Success Response
```json
{
  "status": "success",
  "url": "/video/unique-id-video.mp4"
}
```

### Error Response
```json
{
  "status": "error",
  "error": "Master endpoint error (style1): Quote is required"
}
```

## ⚠️ Error Handling

The master endpoint provides contextual error messages:

### Parameter Validation Errors
```json
{
  "status": "error",
  "error": "Master endpoint error: \"endpoint\" parameter is required"
}
```

### Endpoint-Specific Errors
```json
{
  "status": "error", 
  "error": "Master endpoint error (vid-1.4): Captions array is required for Vid-1.4"
}
```

### File Handling Errors
```json
{
  "status": "error",
  "error": "Master endpoint error (style1): Image file not found: /path/to/image.jpg"
}
```

## 🎛️ Alternative Endpoint Names

The master endpoint supports multiple naming conventions:

```json
// These are all equivalent:
{"endpoint": "style1"}
{"endpoint": "STYLE1"}  
{"endpoint": "create-video-style1"}
{"endpoint": "vid-1.2"}
{"endpoint": "VID-1.2"}
{"endpoint": "create-video-vid-1.2"}
```

## 🧪 Testing

### Test with cURL

#### Production API (Google Cloud Run)
```bash
# Style 1 - Simple Image + Audio Video
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "style1",
    "data": {
      "quote": "Success is not final, failure is not fatal",
      "author": "Winston Churchill",
      "watermark": "MyBrand",
      "imageUrl": "https://picsum.photos/1080/1920",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      "duration": 30
    }
  }'

# Style 2 - Single-step Processing
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "style2",
    "data": {
      "quote": "The only way to do great work is to love what you do",
      "author": "Steve Jobs",
      "imageUrl": "https://picsum.photos/1080/1920",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    }
  }'

# Vid-1 - Video Input with Text Overlay
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "vid-1",
    "data": {
      "quote": "Innovation distinguishes between a leader and a follower",
      "author": "Steve Jobs",
      "videoUrl": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      "duration": 10
    }
  }'

# Vid-1.2 - Multi-Clip Video
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "vid-1.2",
    "data": {
      "quote": "The future belongs to those who believe in the beauty of their dreams",
      "author": "Eleanor Roosevelt",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      "clips": [
        {
          "imageurl": "https://picsum.photos/1920/1080",
          "start": 0,
          "duration": 3
        },
        {
          "imageurl": "https://picsum.photos/1080/1920",
          "start": 3,
          "duration": 2
        }
      ]
    }
  }'

# Vid-1.4 - Timed Captions
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "vid-1.4",
    "data": {
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      "watermark": "MyChannel",
      "overlay": true,
      "clips": [
        {
          "imageurl": "https://picsum.photos/1080/1920",
          "start": 0,
          "duration": 8
        }
      ],
      "captions": [
        {
          "text": "Welcome to our presentation",
          "start": 0,
          "duration": 3
        },
        {
          "text": "Let us explore the possibilities",
          "start": 3,
          "duration": 4
        }
      ]
    }
  }'

# Vid-1.5 - Cinematic Overlay with Captions
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "vid-1.5",
    "data": {
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      "watermark": "CinematicBrand",
      "overlay": true,
      "clips": [
        {
          "videourl": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
          "start": 0,
          "duration": 10
        }
      ],
      "captions": [
        {
          "text": "Cinematic storytelling at its finest",
          "start": 0,
          "duration": 5
        },
        {
          "text": "Experience the difference",
          "start": 5,
          "duration": 4
        }
      ]
    }
  }'
```

#### Local Development
```bash
# Test locally (replace localhost:3000 with your local server)
curl -X POST http://localhost:3000/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "style1",
    "data": {
      "quote": "Local development test",
      "imageUrl": "assets/test-image.jpg",
      "audioUrl": "assets/test-audio.mp3"
    }
  }'
```

#### Expected Response
```json
{
  "status": "success",
  "url": "https://video-editor-api-519298355551.us-central1.run.app/video/unique-id-video.mp4"
}
```

#### Error Response Example
```bash
# Missing required parameter
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "style1",
    "data": {
      "author": "Test Author"
    }
  }'

# Response:
# {
#   "status": "error",
#   "error": "Master endpoint error (style1): Quote is required"
# }
```

### Test with JavaScript
```javascript
const response = await fetch('/master', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    endpoint: 'vid-1.2',
    data: {
      quote: 'Amazing results await',
      audioUrl: 'assets/music.mp3',
      clips: [
        {
          videourl: 'assets/clip1.mp4',
          start: 0,
          duration: 5
        }
      ]
    }
  })
});

const result = await response.json();
console.log(result); // {status: "success", url: "/video/..."}
```

## 🔍 Debugging

### Enable Verbose Logging
Check server console for detailed processing logs:
```
🚀 Starting Vid-1.2 video creation...
📊 Input: 2 clips (videos/images), Audio: music.mp3
📐 Calculating automatic durations...
📹 Processing 2 clips...
✅ All 2 clips processed successfully
🔗 Concatenating 2 clips...
📝 Adding text overlays...
🎵 Adding audio to video...
🎉 Vid-1.2 video created successfully!
```

### Common Issues

1. **File Not Found**: Ensure file paths are correct and files exist
2. **Invalid JSON**: Check clips/captions array formatting
3. **Missing Parameters**: Verify all required parameters are provided
4. **Timeout**: Large files may take longer to process

## 🚀 Performance Tips

1. **Use Local Files**: Local files process faster than remote URLs
2. **Optimize Media**: Use compressed images/videos for faster processing
3. **Limit Duration**: Shorter videos process more quickly
4. **Batch Processing**: Process multiple videos sequentially rather than simultaneously

## 🔒 Security Notes

- File paths are validated to prevent directory traversal
- Remote URLs are downloaded to temporary locations
- Temporary files are automatically cleaned up after processing
- File size limits are enforced (50MB default)

## 🌐 cURL Command Reference

### Quick Test Commands

#### Health Check
```bash
curl -X GET https://video-editor-api-519298355551.us-central1.run.app/health
```

#### Basic Style Video
```bash
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "style1",
    "data": {
      "quote": "Your inspirational quote here",
      "author": "Author Name",
      "imageUrl": "https://picsum.photos/1080/1920",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    }
  }'
```

#### Multi-Clip Video (Mixed Media)
```bash
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "vid-1.2",
    "data": {
      "quote": "Amazing results with multiple clips",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      "clips": [
        {
          "videourl": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
          "start": 0,
          "duration": 5
        },
        {
          "imageurl": "https://picsum.photos/1920/1080",
          "start": 5,
          "duration": 3
        }
      ]
    }
  }'
```

#### Advanced Captions Video
```bash
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "vid-1.4",
    "data": {
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      "watermark": "MyBrand",
      "overlay": true,
      "clips": [
        {
          "imageurl": "https://picsum.photos/1080/1920",
          "start": 0,
          "duration": 10
        }
      ],
      "captions": [
        {
          "text": "First caption appears here",
          "start": 0,
          "duration": 3
        },
        {
          "text": "Second caption follows",
          "start": 3,
          "duration": 4
        },
        {
          "text": "Final message to viewers",
          "start": 7,
          "duration": 3
        }
      ]
    }
  }'
```

### cURL Tips & Best Practices

#### Timeout Settings
```bash
# Add timeout for longer processing (recommended for vid-1.2+)
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  --max-time 600 \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"vid-1.2","data":{...}}'
```

#### Save Response to File
```bash
# Save response to file for processing
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"style1","data":{...}}' \
  -o response.json

# Extract video URL from response
cat response.json | jq -r '.url'
```

#### Download Created Video
```bash
# Create video and download it in one command
VIDEO_URL=$(curl -s -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "style1",
    "data": {
      "quote": "Download test",
      "imageUrl": "https://picsum.photos/1080/1920",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    }
  }' | jq -r '.url')

# Download the video
curl -o my-video.mp4 "$VIDEO_URL"
```

#### Error Handling in Scripts
```bash
#!/bin/bash
# Script with error handling

RESPONSE=$(curl -s -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "style1",
    "data": {
      "quote": "Script test",
      "imageUrl": "https://picsum.photos/1080/1920",
      "audioUrl": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    }
  }')

STATUS=$(echo "$RESPONSE" | jq -r '.status')

if [ "$STATUS" = "success" ]; then
    VIDEO_URL=$(echo "$RESPONSE" | jq -r '.url')
    echo "✅ Video created successfully: $VIDEO_URL"
    # Download the video
    curl -o "output-$(date +%s).mp4" "$VIDEO_URL"
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo "❌ Error: $ERROR"
    exit 1
fi
```

### File Upload with cURL

#### Upload Local Files
```bash
# Upload image and audio files directly
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -F 'endpoint=style1' \
  -F 'data={"quote":"Uploaded files test","author":"Local User"}' \
  -F 'image=@/path/to/your/image.jpg' \
  -F 'audio=@/path/to/your/audio.mp3'
```

#### Mixed Upload (Files + URLs)
```bash
# Upload image file but use URL for audio
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/master \
  -F 'endpoint=style2' \
  -F 'data={"quote":"Mixed upload test","audioUrl":"https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"}' \
  -F 'image=@/path/to/your/image.jpg'
```

## 📚 Integration Examples

### Node.js/Express Integration
```javascript
app.post('/create-video', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:3000/master', {
      endpoint: 'style1',
      data: req.body
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data?.error || 'Video creation failed'
    });
  }
});
```

### Python Integration
```python
import requests

def create_video(endpoint, data):
    response = requests.post('http://localhost:3000/master', json={
        'endpoint': endpoint,
        'data': data
    })
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Video creation failed: {response.json()['error']}")

# Usage
result = create_video('vid-1.4', {
    'audioUrl': 'audio.mp3',
    'clips': [{'videourl': 'video.mp4', 'start': 0, 'duration': 10}],
    'captions': [{'text': 'Hello World', 'start': 0, 'duration': 3}]
})
```

---

## 📞 Support

For issues or questions about the master endpoint:
1. Check the error message for specific guidance
2. Verify your request format matches the examples
3. Ensure all required parameters are provided
4. Test with the provided test files first

The master endpoint provides a powerful, unified interface for all video creation needs while maintaining the flexibility and features of individual endpoints.