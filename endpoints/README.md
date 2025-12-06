# Video Editor API

Creates Instagram Reels-style videos with different text layouts and animations.

## Quick Start

```bash
npm install
node server-modular.js
curl http://localhost:3000/health
```

## ✨ Recent Updates

### Text Escaping Fix (Latest)
All endpoints now properly handle special characters in text fields (quotes, author names, watermarks):
- ✅ **Colons** (`:`) - e.g., "POV: My story"
- ✅ **Parentheses** (`()`) - e.g., "Text (with notes)"
- ✅ **Commas** (`,`) - e.g., "Hello, world"
- ✅ **Brackets** (`[]`) - e.g., "Text [optional]"
- ✅ **Semicolons** (`;`) - e.g., "First; Second"

**Technical Details:**
- Implemented `escapeDrawtext()` function in `utils.js`
- Applied across all 10 endpoints (Style 1-4, Vid-1, Vid-1.2, Vid-1.3, Vid-1.4, Vid-1.5)
- Special characters are escaped for FFmpeg's drawtext filter
- Original text is preserved and displayed correctly in videos

## Endpoints

### Style 1 - Bottom Text with Fade (Two-Step)
**POST** `/create-video-style1` - Creates video with bottom text placement and fade-in animation using two-step process

### Style 2 - Bottom Text with Fade (Single-Step)  
**POST** `/create-video-style2` - Creates video with bottom text placement and fade-in animation using single-step process

### Style 3 - Top Text with Fade (Two-Step)
**POST** `/create-video-style3` - Creates video with top text placement and fade-in animation using two-step process

### Style 4 - Top Text with Fade (Single-Step)
**POST** `/create-video-style4` - Creates video with top text placement and fade-in animation using single-step process

### Vid-1 - Video Background with Top Text
**POST** `/create-video-vid-1` - Creates video using video file as background with top text placement (no fade)

### Vid-1.2 - Multi-Clip Video with Top Text
**POST** `/create-video-vid-1.2` - Creates video by combining multiple clips from different video sources and images with top text placement (no fade)

### Vid-1.3 - Smart Aspect Ratio Multi-Clip Video
**POST** `/vid-1.3` - Creates video with intelligent aspect ratio management for 9:16 output

**🎯 Smart Aspect Ratio Features:**
- **Tall clips (9:16)**: Take full vertical space (1080x1920) with text overlay
- **Wide clips**: Centered with maximum width/height, text in available space
- **Smart scaling**: Entire clip always visible with maximum screen usage
- **Mixed media**: Supports both videos and images with optimal layout
- **Intelligent text positioning**: Adapts based on available space
- **Timeline-based durations**: Automatic duration calculation from next clip timing

**📐 Layout Logic:**
- **9:16 clips**: Fill entire screen, text overlaid on top
- **16:9 clips**: Centered horizontally, text above/below in black areas
- **Square clips**: Centered with text in remaining space
- **All ratios**: Maintains aspect ratio while maximizing screen usage

### Health Check
**GET** `/health` - Returns API status

## Parameters

### Required
- `quote` (string) - Main text to display
- `instagramUrl` (string) - Instagram reel URL for audio extraction

### Optional
- `author` (string) - Author name displayed below quote
- `watermark` (string) - Watermark text (e.g. "@username") centered with 40% opacity
- `duration` (number) - Max video duration in seconds (uses audio duration if longer)
- `imageUrl` (string) - Background image URL (Styles 1-4)
- `videoUrl` (string) - Background video URL (Vid-1)
- `audioUrl` (string) - Direct audio URL (alternative to Instagram)
- `clips` (array) - Array of video clips and images (Vid-1.2 and Vid-1.3)

### Vid-1.2 Clip Format
Each clip in the `clips` array supports both videos and images:
- `videoUrl` (string) - URL of the video/image source or local file path

### Vid-1.3 Clip Format (Smart Aspect Ratio)
Same as Vid-1.2 but with intelligent aspect ratio management:
- `videoUrl` (string) - URL of the video/image source or local file path
- `start` (number) - Start time in seconds (optional, defaults to 0)
- `duration` (number) - Duration in seconds (optional, auto-calculated from next clip timing)
- `volume` (number) - Volume percentage for this clip's original audio (optional, defaults to 100, range: 0-200)
  - Controls the audio that comes with the video clip itself
  - Does not affect the background Instagram music
  - 0 = mute clip audio, 100 = normal clip audio, 200 = boost clip audio

### Vid-1.3 Captions Format (NEW!)
Timed captions that override the quote parameter:
- `text` (string) - Caption text to display
- `start` (number) - Start time in seconds when caption appears
- `duration` (number) - How long caption is visible (in seconds)

**Smart Features:**
- **Auto-duration**: If not specified, calculated from next clip's start time
- **Smart scaling**: Clips automatically scaled for optimal 9:16 display
- **Aspect ratio detection**: Automatically detects and handles different aspect ratios
- **Timed captions**: Display different text at specific times
- **Caption override**: When captions are provided, quote parameter is ignored
- `start` (number) - Start time in seconds (ignored for images)
- `duration` (number) - Duration in seconds (how long to display)

### File Uploads
- `image` (file) - Background image file (Styles 1-4)
- `video` (file) - Background video file (Vid-1)
- `audio` (file) - Audio file

## Response Format
```json
{
  "success": true,
  "videoUrl": "/video/[session-id]-video.mp4",
  "message": "Style X video created successfully",
  "style": "Style X"
}
```

## Example Usage

### Basic Video Creation (Styles 1-4, Vid-1)
```bash
curl -X POST http://localhost:3000/create-video-style1 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Your quote here",
    "watermark": "@username",
    "duration": 30,
    "imageUrl": "https://example.com/image.jpg",
    "instagramUrl": "https://www.instagram.com/reel/ABC123/"
  }'
```

### Multi-Clip Video Creation (Vid-1.2)
```bash
curl -X POST http://localhost:3000/create-video-vid-1.2 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Amazing compilation from multiple sources",
    "author": "Creator Name",
    "watermark": "@username",
    "instagramUrl": "https://www.instagram.com/reel/ABC123/",
    "clips": [
      {
        "videoUrl": "https://example.com/video1.mp4",
        "start": 10,
        "duration": 5
      },
      {
        "videoUrl": "https://images.unsplash.com/photo-example.jpg",
        "start": 0,
        "duration": 3
      },
      {
        "videoUrl": "temp/local-video.mp4",
        "start": 15,
        "duration": 4
      }
    ]
  }'
```

### Smart Aspect Ratio Video with Captions (Vid-1.3)
```bash
curl -X POST http://localhost:3000/vid-1.3 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/audio.mp3",
    "author": "Creator Name",
    "watermark": "@username",
    "clips": [
      {
        "videoUrl": "temp/wide-video.mp4",
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
        "text": "Second caption shows up now",
        "start": 3,
        "duration": 4
      },
      {
        "text": "Final caption at the end",
        "start": 7,
        "duration": 3
      }
    ]
  }'
```

## Mixed Media Support (Vid-1.2 & Vid-1.3)
Vid-1.2 supports combining both videos and images in a single project:

**Supported Media Types:**
- **Videos:** MP4, AVI, MOV, WebM (local files or URLs)
- **Images:** JPG, JPEG, PNG, GIF, BMP, WebP (local files or URLs)
- **Sources:** Remote URLs, local temp/ files, local uploads/ files

**Processing:**
- Images are automatically converted to video segments with specified duration
- Videos are trimmed to specified start time and duration
- All media is normalized to 1080x1920 resolution
- Seamless concatenation with proper aspect ratio handling

## Output Specs
- **Resolution:** 1080x1920 (Instagram Reels format)
- **Format:** MP4, H.264 codec, AAC audio
- **Text:** Impact font for quotes, Arial 40px for centered watermarks with dark shadow
- **Duration:** Uses minimum of specified duration or audio duration