# Video Editor API

Creates Instagram Reels-style videos with different text layouts, animations, and multimedia support.

## 🆕 Recent Updates

### Optional Quote Parameter (Latest)
- **Quote parameter is now optional** for `/create-video` and `/vid-1.2` endpoints
- Create videos without any text overlays when quote is not provided
- Author and watermark parameters still work independently
- Full backward compatibility maintained - existing functionality unchanged
- **Production deployment:** Live at https://video-editor-api-519298355551.us-central1.run.app

## 🚀 Quick Start

### Production API (Live)
The API is deployed and ready to use:
```bash
curl https://video-editor-api-519298355551.us-central1.run.app/health
```

### Local Development
```bash
npm install
npm start
curl http://localhost:8080/health
```

### Video Editor UI
After starting the local server, open your browser to:
```
http://localhost:8080/editor/
```

Or use the live production UI:
```
https://video-editor-api-519298355551.us-central1.run.app/editor/
```

The Video Editor provides a visual interface for:
- Timeline-based editing with drag & drop
- Resizable clips
- Real-time preview
- JSON import/export
- **NEW**: Overlay effect preview and test files
- Browser-based rendering (with FFmpeg.wasm)

See [video-editor-app/README.md](video-editor-app/README.md) for detailed instructions.

> **Note:** Use `server.js` for the main API. Alternative server files (`server-modular.js`, `server-new.js`) are available but may have different endpoint paths or features.

---

## 📋 Available Endpoints

### 1️⃣ Style 1 - Bottom Text with Fade (Two-Step)
**POST** `/create-video-style1`

Creates video with bottom text placement and fade-in animation using a two-step FFmpeg process.

**Use Case:** Simple image-based videos with text at the bottom and smooth fade-in effect.

**Parameters:**
- `quote` (string, optional) - Main text to display at bottom
- `author` (string, optional) - Author name below quote
- `watermark` (string, optional) - Centered watermark with 40% opacity
- `imageUrl` (string) - Background image URL
- `image` (file) - Background image file upload
- `audioUrl` (string) - Direct audio URL
- `instagramUrl` (string) - Instagram reel URL for audio extraction
- `audio` (file) - Audio file upload
- `duration` (number, optional) - Max video duration in seconds

**Processing:**
- Step 1: Generate image with text overlays
- Step 2: Create video with fade animation (75% fade-in duration)

**Example:**
```bash
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/create-video-style1 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Dream big, work hard",
    "author": "Anonymous",
    "watermark": "@motivational",
    "imageUrl": "https://images.unsplash.com/photo-example.jpg",
    "instagramUrl": "https://www.instagram.com/reel/ABC123/"
  }'
```

---

### 2️⃣ Style 2 - Bottom Text with Fade (Single-Step)
**POST** `/create-video-style2`

Creates video with bottom text placement and fade-in animation using a single-step FFmpeg process (more efficient than Style 1).

**Use Case:** Same as Style 1 but with better performance - recommended over Style 1.

**Parameters:**
- Same as Style 1

**Processing:**
- Single FFmpeg command combines image scaling, text overlay, and fade animation

**Example:**
```bash
curl -X POST http://localhost:3000/create-video-style2 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Success is not final, failure is not fatal",
    "author": "Winston Churchill",
    "imageUrl": "https://images.unsplash.com/photo-example.jpg",
    "instagramUrl": "https://www.instagram.com/reel/ABC123/",
    "duration": 15
  }'
```

---

### 3️⃣ Style 3 - Top Text with Fade (Two-Step)
**POST** `/create-video-style3`

Creates video with top text placement and fade-in animation using a two-step FFmpeg process. Text and image are vertically centered as a group.

**Use Case:** Image-based videos with text at the top, ideal for quotes with images below.

**Parameters:**
- Same as Style 1

**Processing:**
- Step 1: Generate image with text overlays (top placement)
- Step 2: Create video with fade animation (75% fade-in duration)
- Smart layout: Text and image centered together as a group

**Example:**
```bash
curl -X POST http://localhost:3000/create-video-style3 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "The only way to do great work is to love what you do",
    "author": "Steve Jobs",
    "watermark": "@techquotes",
    "imageUrl": "https://images.unsplash.com/photo-tech.jpg",
    "audioUrl": "temp/audio.mp3"
  }'
```

---

### 4️⃣ Style 4 - Top Text with Fade (Single-Step)
**POST** `/create-video-style4`

Creates video with top text placement and fade-in animation using a single-step FFmpeg process (more efficient than Style 3).

**Use Case:** Same as Style 3 but with better performance - recommended over Style 3.

**Parameters:**
- Same as Style 1

**Processing:**
- Single FFmpeg command with smart vertical centering of text+image group
- More efficient than Style 3

**Example:**
```bash
curl -X POST http://localhost:3000/create-video-style4 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Innovation distinguishes between a leader and a follower",
    "author": "Steve Jobs",
    "imageUrl": "https://images.unsplash.com/photo-innovation.jpg",
    "instagramUrl": "https://www.instagram.com/reel/XYZ789/"
  }'
```

---

### 5️⃣ Vid-1 - Video Background with Top Text
**POST** `/create-video-vid-1`

Creates video using a video file as background with top text placement. No fade effects.

**Use Case:** Simple video-based content with text overlay, no fade animation.

**Parameters:**
- `quote` (string, required) - Main text to display at top
- `author` (string, optional) - Author name below quote
- `watermark` (string, optional) - Centered watermark with 40% opacity
- `videoUrl` (string) - Background video URL
- `video` (file) - Background video file upload
- `audioUrl` (string) - Direct audio URL
- `instagramUrl` (string) - Instagram reel URL for audio extraction
- `audio` (file) - Audio file upload
- `duration` (number, optional) - Max video duration in seconds

**Processing:**
- Step 1: Generate video with text overlays (top placement)
- Step 2: Combine with audio (no fade effects)
- Smart vertical centering of text+video group

**Example:**
```bash
curl -X POST http://localhost:3000/create-video-vid-1 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Life is what happens when you are busy making other plans",
    "author": "John Lennon",
    "videoUrl": "https://example.com/background-video.mp4",
    "instagramUrl": "https://www.instagram.com/reel/ABC123/"
  }'
```

---

### 6️⃣ Vid-1.2 - Multi-Clip Multimedia Video Creator
**POST** `/create-video-vid-1.2`

Advanced multi-clip video creation with mixed media support (videos + images).

**Use Case:** Complex videos combining multiple video clips and images with custom timing.

**Parameters:**
- `quote` (string, optional) - Main text to display
- `author` (string, optional) - Author name below quote
- `watermark` (string, optional) - Centered watermark with 40% opacity
- `clips` (array, required) - Array of media clips (videos and/or images)
- `audioUrl` (string) - Direct audio URL or local file path
- `instagramUrl` (string) - Instagram reel URL for audio extraction
- `audio` (file) - Audio file upload
- `duration` (number, optional) - Max video duration in seconds

**Clip Format:**
```json
{
  "videoUrl": "URL or local path (video or image)",
  "begin": 0,
  "start": 0,
  "duration": 5
}
```

**Supported Media:**
- Videos: MP4, AVI, MOV, WebM (local or remote)
- Images: JPG, PNG, GIF, BMP, WebP (local or remote)
- Local paths: `temp/file.mp4`, `uploads/image.jpg`
- Remote URLs: Any publicly accessible URL

**Features:**
- ✅ Multiple video clips from different sources
- ✅ Mix images and videos seamlessly
- ✅ Custom start time and duration per clip
- ✅ Auto-normalization to 1080x1920
- ✅ Audio synchronization with duration capping
- ✅ Automatic cleanup of temporary files

**Example:**
```bash
curl -X POST http://localhost:3000/create-video-vid-1.2 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "A journey through mixed media",
    "author": "Content Creator",
    "watermark": "@creator",
    "audioUrl": "temp/audio.mp3",
    "clips": [
      {
        "videoUrl": "https://example.com/intro.mp4",
        "start": 5,
        "duration": 4
      },
      {
        "videoUrl": "https://images.unsplash.com/photo-1234.jpg",
        "start": 0,
        "duration": 3
      },
      {
        "videoUrl": "temp/local-video.mp4",
        "start": 10,
        "duration": 5
      }
    ]
  }'
```

---

### 7️⃣ Vid-1.3 - Smart Aspect Ratio Multi-Clip Video (Advanced)
**POST** `/vid-1.3`

Multi-clip video with intelligent aspect ratio management for optimal 9:16 output. Supports both static quotes and timed captions, plus optional radial overlay effects.

**Use Case:** Professional multi-clip videos with smart scaling for different aspect ratios, optional timed captions, and cinematic overlay effects.

**Parameters:**
- `quote` (string, optional) - Main text to display (ignored if captions provided)
- `author` (string, optional) - Author name below quote
- `watermark` (string, optional) - Centered watermark with 40% opacity
- `captions` (array, optional) - Timed captions that override quote parameter
- `clips` (array, required) - Array of media clips
- `audioUrl` (string, required) - Audio URL or local file path
- `overlay` (boolean, optional, default: false) - Apply radial vignette overlay effect

**Clip Format:**
```json
{
  "videoUrl": "URL or local path",
  "start": 0,
  "duration": 5,
  "volume": 100
}
```

**Caption Format:**
```json
{
  "text": "Caption text",
  "start": 0,
  "duration": 3
}
```

**Smart Features:**
- 🎯 **Tall clips (9:16):** Fill entire screen (1080x1920), text overlaid on top
- 🎯 **Wide clips (16:9):** Centered with black bars, text in available space
- 🎯 **Square clips:** Centered with maximum screen usage
- 🎯 **Auto-duration:** Calculates duration from next clip's start time if not specified
- 🎯 **Volume control:** Adjust clip audio volume (0-200%)
- 🎯 **Timed captions:** Display different text at specific times
- 🎯 **Mixed media:** Videos and images with optimal layout

**Example with Captions:**
```bash
curl -X POST http://localhost:3000/vid-1.3 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/audio.mp3",
    "watermark": "@creator",
    "clips": [
      {
        "videoUrl": "temp/wide-video.mp4",
        "start": 0,
        "duration": 10,
        "volume": 50
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

**Example with Radial Overlay:**
```bash
curl -X POST http://localhost:3000/vid-1.3 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/audio.mp3",
    "watermark": "@cinematic",
    "overlay": true,
    "clips": [
      {
        "videoUrl": "https://images.pexels.com/photos/273886/pexels-photo-273886.jpeg",
        "start": 0,
        "duration": 5,
        "volume": 80
      }
    ],
    "captions": [
      {
        "text": "Cinematic storytelling",
        "start": 0,
        "duration": 3
      },
      {
        "text": "With radial vignette effect",
        "start": 3,
        "duration": 2
      }
    ]
  }'
```

---

### 8️⃣ Vid-1.4 - Timed Captions Multi-Clip Video
**POST** `/vid-1.4`

Multi-clip video with timed captions only (no quote parameter). Similar to Vid-1.3 but focused on caption-based content, with optional radial overlay effects.

**Use Case:** Videos where text changes throughout the video (tutorials, storytelling, dynamic content) with optional cinematic enhancement.

**Parameters:**
- `captions` (array, required) - Timed captions
- `watermark` (string, optional) - Centered watermark with 40% opacity
- `clips` (array, required) - Array of media clips
- `audioUrl` (string, required) - Audio URL or local file path
- `overlay` (boolean, optional, default: false) - Apply radial vignette overlay effect

**Note:** Vid-1.3 can do everything Vid-1.4 does (just provide captions instead of quote), so Vid-1.4 may be redundant.

**Example:**
```bash
curl -X POST http://localhost:3000/vid-1.4 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/audio.mp3",
    "watermark": "@storyteller",
    "clips": [
      {
        "videoUrl": "temp/clip1.mp4",
        "start": 0,
        "duration": 5,
        "volume": 80
      }
    ],
    "captions": [
      {
        "text": "Once upon a time...",
        "start": 0,
        "duration": 2
      },
      {
        "text": "In a land far away...",
        "start": 2,
        "duration": 3
      }
    ]
  }'
```

**Example with Radial Overlay:**
```bash
curl -X POST http://localhost:3000/vid-1.4 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/audio.mp3",
    "watermark": "@cinematic",
    "overlay": true,
    "clips": [
      {
        "videoUrl": "https://images.pexels.com/photos/273886/pexels-photo-273886.jpeg",
        "start": 0,
        "duration": 4,
        "volume": 100
      }
    ],
    "captions": [
      {
        "text": "Enhanced storytelling",
        "start": 0,
        "duration": 2
      },
      {
        "text": "With atmospheric effects",
        "start": 2,
        "duration": 2
      }
    ]
  }'
```

---

### 9️⃣ Vid-1.5 - Advanced Multi-Clip Video with Radial Overlay
**POST** `/vid-1.5`

Multi-clip video with timed captions and advanced radial overlay support. Most feature-complete endpoint with professional cinematic effects.

**Use Case:** Professional videos that need visual enhancement with radial vignette effects while preserving text readability.

**Parameters:**
- `captions` (array, required) - Timed captions
- `watermark` (string, optional) - Centered watermark with 40% opacity
- `clips` (array, required) - Array of media clips
- `audioUrl` (string, required) - Audio URL or local file path
- `overlay` (boolean, optional, default: false) - Apply radial vignette overlay effect

**Radial Overlay Feature:**
- When `overlay: true`, applies `assets/overlay.png` as a radial vignette mask
- Creates cinematic effect with darker edges and normal center
- Uses maskedmerge technique for natural color preservation
- Overlay affects video/image clips but NOT text layers
- Text captions and watermarks remain bright and fully visible
- No color shifts or green tint issues

**Example with overlay:**
```bash
curl -X POST http://localhost:3000/vid-1.5 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/audio.mp3",
    "watermark": "@enhanced",
    "overlay": true,
    "clips": [
      {
        "videoUrl": "temp/clip1.mp4",
        "start": 0,
        "duration": 5,
        "volume": 80
      }
    ],
    "captions": [
      {
        "text": "Enhanced with overlay",
        "start": 0,
        "duration": 3
      }
    ]
  }'
```

**Example without overlay:**
```bash
curl -X POST http://localhost:3000/vid-1.5 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/audio.mp3",
    "watermark": "@clean",
    "overlay": false,
    "clips": [
      {
        "videoUrl": "temp/clip1.mp4",
        "start": 0,
        "duration": 5
      }
    ],
    "captions": [
      {
        "text": "Clean video output",
        "start": 0,
        "duration": 3
      }
    ]
  }'
```

---

### 🔟 Health Check
**GET** `/health`

Returns API status and confirms the server is running.

**Response:**
```json
{
  "status": "OK",
  "message": "Modular Video Editor API is running"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

## 🆕 Optional Quote Parameter Examples

### Main Endpoint Without Quote
```bash
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/create-video \
  -H "Content-Type: application/json" \
  -d '{
    "author": "John Doe",
    "watermark": "@mybrand",
    "imageUrl": "https://images.unsplash.com/photo-example.jpg",
    "audioUrl": "https://example.com/audio.mp3"
  }'
```

### Vid-1.2 Without Quote
```bash
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/vid-1.2 \
  -H "Content-Type: application/json" \
  -d '{
    "author": "Content Creator",
    "watermark": "@creator",
    "audioUrl": "https://example.com/audio.mp3",
    "clips": [
      {
        "imageurl": "https://images.unsplash.com/photo-1.jpg",
        "start": 0,
        "duration": 5
      },
      {
        "videoUrl": "https://example.com/video.mp4",
        "start": 5,
        "duration": 4
      }
    ]
  }'
```

### Benefits of Optional Quote
- ✅ **Clean visuals** - Create videos without text overlays when not needed
- ✅ **Flexible branding** - Use only author/watermark for brand presence
- ✅ **Mixed content** - Some clips with text, others without
- ✅ **Backward compatible** - Existing API calls work unchanged

---

## 📝 Common Parameters Reference

### Text Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quote` | string | Optional* | Main text to display on video |
| `author` | string | No | Author name displayed below quote |
| `watermark` | string | No | Watermark text (e.g. "@username") centered with 40% opacity |
| `captions` | array | No | Timed captions (Vid-1.3, Vid-1.4 only) - overrides quote |

*Quote parameter is now **OPTIONAL** for `/create-video` and `/vid-1.2` endpoints. Videos can be created without any text overlays. For Vid-1.3, either quote OR captions must be provided. Vid-1.4 and Vid-1.5 use captions only.

### 📋 Description Parameters (NEW)
All media URLs now support optional `description` parameters for better documentation:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audioDescription` | string | No | Description of audio content (e.g. "Upbeat electronic music") |
| `imageDescription` | string | No | Description of image content (e.g. "Sunset landscape photo") |
| `videoDescription` | string | No | Description of video content (e.g. "3D logo animation") |
| `instagramDescription` | string | No | Description of Instagram content (e.g. "Popular motivational reel") |
| `clips[].description` | string | No | Description of clip content (e.g. "Product showcase video") |

**Benefits:**
- ✅ **Better Organization** - Easily identify media content in complex projects
- ✅ **Self-Documenting** - JSON files explain themselves
- ✅ **Team Collaboration** - Clear communication about media choices
- ✅ **Optional** - Completely backward compatible, no impact on processing

### Media Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imageUrl` | string | Yes* | Background image URL (Styles 1-4) |
| `videoUrl` | string | Yes* | Background video URL (Vid-1) |
| `clips` | array | Yes* | Array of media clips (Vid-1.2, Vid-1.3, Vid-1.4) |
| `image` | file | Yes* | Background image file upload (Styles 1-4) |
| `video` | file | Yes* | Background video file upload (Vid-1) |

*One media source required per endpoint type

### Audio Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audioUrl` | string | Yes* | Direct audio URL or local file path |
| `instagramUrl` | string | Yes* | Instagram reel URL for audio extraction |
| `audio` | file | Yes* | Audio file upload |

*One audio source required

### Other Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `duration` | number | No | Max video duration in seconds (capped by audio duration) |
| `overlay` | boolean | No | Apply radial vignette overlay effect (Vid-1.3, Vid-1.4, Vid-1.5 only) |

---

## 🎬 Clip Format Reference

### Basic Clip (Vid-1.2)
```json
{
  "videoUrl": "URL or local path",
  "begin": 0,
  "start": 0,
  "duration": 5
}
```

### Advanced Clip (Vid-1.3, Vid-1.4, Vid-1.5)
```json
{
  "videoUrl": "URL or local path",
  "begin": 0,
  "start": 0,
  "duration": 5,
  "volume": 100
}
```

**Clip Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `videoUrl` | string | Yes | Video/image URL or local file path |
| `begin` | number | No | **NEW**: Which part of source video to start from (seconds, default: 0) |
| `start` | number | No | Timeline position where clip appears in final video (seconds, default: 0) |
| `duration` | number | No | Duration in seconds (auto-calculated if omitted) |
| `volume` | number | No | Clip audio volume 0-200% (Vid-1.3/1.4/1.5 only, default: 100) |

---

## 🎯 NEW: Begin Parameter for Precise Video Control

### Overview
The `begin` parameter provides precise control over which part of the source video to extract, separate from timeline positioning. This enables advanced video editing workflows with frame-accurate control.

### Parameter Distinction

#### `begin` Parameter (NEW)
- **Purpose**: Controls which part of the **source video** to start extracting from
- **Usage**: Seeking within the original media file
- **Example**: `"begin": 15` means start extracting from 15 seconds into the source video
- **Default**: 0 (start from beginning of source if not specified)
- **Applies to**: Video clips only (ignored for images)

#### `start` Parameter (Existing)
- **Purpose**: Controls where the clip is placed on the **final video timeline**
- **Usage**: Timeline positioning for multi-clip videos
- **Example**: `"start": 5` means this clip appears at 5 seconds in the final video
- **Default**: 0 (appears at beginning of timeline)
- **Applies to**: All clips (videos and images)

### Practical Examples

#### Example 1: Extract Different Parts of Same Video
```json
{
  "clips": [
    {
      "videoUrl": "https://example.com/long-video.mp4",
      "begin": 30,
      "duration": 5,
      "start": 0
    },
    {
      "videoUrl": "https://example.com/long-video.mp4", 
      "begin": 60,
      "duration": 5,
      "start": 5
    }
  ]
}
```
**Result**: First 5 seconds of final video shows seconds 30-35 of source, next 5 seconds shows seconds 60-65 of source.

#### Example 2: Skip Intro/Outro
```json
{
  "clips": [
    {
      "videoUrl": "https://example.com/video-with-intro.mp4",
      "begin": 10,
      "duration": 20,
      "start": 0
    }
  ]
}
```
**Result**: Skips first 10 seconds of source video, uses seconds 10-30 for the final video.

#### Example 3: Highlight Reel
```json
{
  "clips": [
    {
      "videoUrl": "https://example.com/sports-game.mp4",
      "begin": 120,
      "duration": 3,
      "start": 0
    },
    {
      "videoUrl": "https://example.com/sports-game.mp4",
      "begin": 480,
      "duration": 4,
      "start": 3
    },
    {
      "videoUrl": "https://example.com/sports-game.mp4",
      "begin": 720,
      "duration": 3,
      "start": 7
    }
  ]
}
```
**Result**: Creates a 10-second highlight reel from 3 different moments in a long sports video.

### Supported Endpoints
- ✅ **Vid-1.2**: Multi-clip video creation
- ✅ **Vid-1.3**: Smart aspect ratio management
- ✅ **Vid-1.4**: Timed captions support
- ✅ **Vid-1.5**: Advanced overlay effects
- ✅ **Vid-1.5-Python**: MoviePy implementation

### Backward Compatibility
- **Fully backward compatible**: Existing clips without `begin` parameter work unchanged
- **Default behavior**: `begin` defaults to 0 when not specified
- **No breaking changes**: All existing functionality preserved

### Benefits
1. **Precise Source Control**: Extract specific segments from long source videos
2. **Timeline Flexibility**: Independent control of source extraction and timeline placement
3. **Reusability**: Use different parts of the same source video in multiple clips
4. **Efficiency**: Avoid manual pre-editing of source videos
5. **Professional Editing**: Frame-accurate control for professional workflows

---

## 📝 Caption Format Reference (Vid-1.3, Vid-1.4)

```json
{
  "text": "Caption text to display",
  "start": 0,
  "duration": 3
}
```

**Caption Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Caption text to display |
| `start` | number | Yes | Start time in seconds when caption appears |
| `duration` | number | No | How long caption is visible (auto-calculated if omitted) |

---

## 🖼️ Supported Media Types

### Videos
- **Local files:** `temp/video.mp4`, `uploads/video.mov`
- **Remote URLs:** `https://example.com/video.mp4`
- **Formats:** MP4, AVI, MOV, WebM

### Images
- **Local files:** `temp/image.jpg`, `uploads/photo.png`
- **Remote URLs:** `https://images.unsplash.com/photo.jpg`
- **Formats:** JPG, JPEG, PNG, GIF, BMP, WebP

### Audio
- **Local files:** `temp/audio.mp3`, `uploads/song.wav`
- **Remote URLs:** Direct audio file URLs
- **Instagram:** Instagram reel URLs (audio extracted automatically)
- **Formats:** MP3, WAV, AAC, M4A

## 📤 Response Format
```json
{
  "success": true,
  "videoUrl": "/video/[session-id]-video.mp4",
  "message": "Vid-1.2 video created successfully with transitions",
  "sessionId": "[session-id]"
}
```

## 💡 Complete Usage Examples

### Example 1: Simple Image Video with Bottom Text (Style 2)
```bash
curl -X POST http://localhost:3000/create-video-style2 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "The best time to plant a tree was 20 years ago. The second best time is now.",
    "author": "Chinese Proverb",
    "watermark": "@wisdomquotes",
    "imageUrl": "https://images.unsplash.com/photo-example.jpg",
    "instagramUrl": "https://www.instagram.com/reel/ABC123/",
    "duration": 15
  }'
```

### Example 2: Image Video with Top Text (Style 4)
```bash
curl -X POST http://localhost:3000/create-video-style4 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Innovation distinguishes between a leader and a follower",
    "author": "Steve Jobs",
    "watermark": "@techinspiration",
    "imageUrl": "https://images.unsplash.com/photo-tech.jpg",
    "audioUrl": "temp/background-music.mp3"
  }'
```

### Example 3: Video Background with Text (Vid-1)
```bash
curl -X POST http://localhost:3000/create-video-vid-1 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Life is what happens when you are busy making other plans",
    "author": "John Lennon",
    "videoUrl": "https://example.com/nature-video.mp4",
    "instagramUrl": "https://www.instagram.com/reel/XYZ789/"
  }'
```

### Example 4: Multi-Clip Mixed Media (Vid-1.2)
```bash
curl -X POST http://localhost:3000/create-video-vid-1.2 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "A journey through mixed media storytelling",
    "author": "Content Creator",
    "watermark": "@creator",
    "audioUrl": "temp/audio.mp3",
    "audioDescription": "Upbeat background music for storytelling content",
    "clips": [
      {
        "videoUrl": "https://example.com/intro-video.mp4",
        "description": "3D animated logo reveal with particle effects",
        "begin": 5,
        "start": 0,
        "duration": 4
      },
      {
        "videoUrl": "https://images.unsplash.com/photo-1234.jpg",
        "description": "High-resolution landscape photography with mountains",
        "start": 4,
        "duration": 3
      },
      {
        "videoUrl": "temp/local-video.mp4",
        "description": "Behind-the-scenes footage of content creation process",
        "begin": 10,
        "start": 7,
        "duration": 5
      },
      {
        "videoUrl": "https://images.unsplash.com/photo-5678.jpg",
        "description": "Portrait-oriented nature photography with trees",
        "start": 12,
        "duration": 2
      }
    ]
  }'
```

### Example 5: Smart Aspect Ratio with Auto-Duration (Vid-1.3)
```bash
curl -X POST http://localhost:3000/vid-1.3 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Exploring different aspect ratios seamlessly",
    "author": "Video Editor",
    "watermark": "@videomagic",
    "audioUrl": "temp/audio.mp3",
    "clips": [
      {
        "videoUrl": "temp/tall-video-9-16.mp4",
        "begin": 0,
        "start": 0
      },
      {
        "videoUrl": "temp/wide-video-16-9.mp4",
        "begin": 15,
        "start": 5
      },
      {
        "videoUrl": "https://images.unsplash.com/photo-square.jpg",
        "start": 10,
        "duration": 3
      }
    ]
  }'
```

### Example 6: Timed Captions with Volume Control (Vid-1.3)
```bash
curl -X POST http://localhost:3000/vid-1.3 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "temp/background-music.mp3",
    "watermark": "@storyteller",
    "clips": [
      {
        "videoUrl": "temp/clip1.mp4",
        "begin": 10,
        "start": 0,
        "duration": 5,
        "volume": 50
      },
      {
        "videoUrl": "temp/clip2.mp4",
        "begin": 25,
        "start": 5,
        "duration": 5,
        "volume": 80
      }
    ],
    "captions": [
      {
        "text": "Welcome to our story",
        "start": 0,
        "duration": 2
      },
      {
        "text": "Chapter 1: The Beginning",
        "start": 2,
        "duration": 3
      },
      {
        "text": "Chapter 2: The Journey",
        "start": 5,
        "duration": 3
      },
      {
        "text": "To be continued...",
        "start": 8,
        "duration": 2
      }
    ]
  }'
```

### Example 7: File Upload (Multipart Form Data)
```bash
curl -X POST http://localhost:3000/create-video-style2 \
  -F "quote=Your quote here" \
  -F "author=Author Name" \
  -F "watermark=@username" \
  -F "image=@/path/to/image.jpg" \
  -F "audio=@/path/to/audio.mp3"
```

### Example 8: Real-World Nature Documentary (Vid-1.2)
```json
{
  "quote": "Explore the beauty of nature through mixed media",
  "author": "Nature Photographer",
  "watermark": "@naturepics",
  "audioUrl": "https://www.instagram.com/reel/EXAMPLE/",
  "audioDescription": "Calming nature sounds with soft instrumental background",
  "clips": [
    {
      "videoUrl": "https://sample-videos.com/video.mp4",
      "description": "Time-lapse of clouds moving over mountain peaks",
      "begin": 30,
      "start": 0,
      "duration": 3
    },
    {
      "videoUrl": "https://images.unsplash.com/photo-mountains.jpg",
      "description": "Panoramic view of snow-capped mountains at golden hour",
      "start": 3,
      "duration": 4
    },
    {
      "videoUrl": "temp/drone-footage.mp4",
      "description": "Aerial drone footage of pristine forest canopy",
      "begin": 15,
      "start": 7,
      "duration": 5
    },
    {
      "videoUrl": "https://images.unsplash.com/photo-forest.jpg",
      "description": "Close-up of ancient tree trunk with moss and sunlight",
      "start": 12,
      "duration": 3
    }
  ]
}
```

### Example 9: Enhanced Documentation with New Parameters (Vid-1.4)
```json
{
  "audioUrl": "temp/tech-music.mp3",
  "audioDescription": "Modern electronic music with building energy, perfect for tech presentations",
  "watermark": "@techstartup",
  "clips": [
    {
      "videourl": "https://example.com/office-video.mp4",
      "description": "Modern startup office with developers working on laptops",
      "begin": 5,
      "start": 0,
      "duration": 4,
      "volume": 80
    },
    {
      "imageurl": "https://images.unsplash.com/photo-app-mockup.jpg",
      "description": "Smartphone mockup displaying mobile app interface design",
      "start": 4,
      "duration": 3
    },
    {
      "videourl": "temp/product-demo.mp4",
      "description": "Screen recording of app features and user interactions",
      "begin": 10,
      "start": 7,
      "duration": 5,
      "volume": 60
    }
  ],
  "captions": [
    {
      "text": "Building the future of technology",
      "start": 0,
      "duration": 3
    },
    {
      "text": "Innovative mobile solutions",
      "start": 3,
      "duration": 3
    },
    {
      "text": "Experience the difference",
      "start": 6,
      "duration": 3
    }
  ]
}
```

## 📊 Output Specifications

### Video Output
- **Resolution:** 1080x1920 (9:16 aspect ratio - Instagram Reels format)
- **Format:** MP4 container
- **Video Codec:** H.264 (libx264)
- **Audio Codec:** AAC
- **Audio Bitrate:** 128-192 kbps
- **Pixel Format:** yuv420p (maximum compatibility)
- **Frame Rate:** Matches source video or 30fps for images

### Text Styling
- **Quote Font:** Impact (bold, high contrast)
- **Author Font:** Impact (smaller size)
- **Watermark Font:** Arial (40% opacity)
- **Font Sizes:** 44-56px for quotes, 32-40px for authors
- **Text Effects:** Black drop shadows for readability
- **Text Position:** Smart positioning based on endpoint type

### Duration & Timing
- **Duration Logic:** Video duration ≤ audio duration (automatically capped)
- **Fade Duration:** 75% of total duration for fade-in effects (Styles 1-4)
- **Auto-Duration:** Clips without duration use next clip's start time (Vid-1.2, Vid-1.3, Vid-1.4)
- **Default Durations:** 4s for images, 5s for videos (when not specified)

### Quality & Optimization
- **Encoding:** High-quality H.264 encoding
- **Optimization:** Optimized for social media platforms
- **Compatibility:** Works on all major platforms (Instagram, TikTok, YouTube, Facebook)
- **File Size:** Balanced for quality and upload speed

---

## 📤 Response Format

### Success Response
```json
{
  "success": true,
  "videoUrl": "/video/abc123-video.mp4",
  "message": "Style 2 video created successfully",
  "style": "Style 2",
  "sessionId": "abc123"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful requests |
| `videoUrl` | string | Relative URL to download the generated video |
| `message` | string | Human-readable success message |
| `style` | string | Endpoint style identifier |
| `sessionId` | string | Unique session ID for this video |

### Error Response
```json
{
  "error": "Quote is required",
  "details": "Additional error information"
}
```

**Error Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `error` | string | Main error message |
| `details` | string | Additional error details (optional) |

### HTTP Status Codes
| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Video created successfully |
| 400 | Bad Request | Missing or invalid parameters |
| 500 | Server Error | Processing error (FFmpeg, download, etc.) |

---

## ⚠️ Error Handling

### Common Errors

**1. Missing Required Parameters**
```json
{
  "error": "Quote is required"
}
```
**Solution:** Ensure all required parameters are provided

**2. Invalid Clip Format**
```json
{
  "error": "Clip 2 must have numeric 'start' and 'duration' properties"
}
```
**Solution:** Validate clip array format before sending

**3. Media Download Failed**
```json
{
  "error": "Failed to download video",
  "details": "HTTP 404: Not Found"
}
```
**Solution:** Verify URLs are accessible and valid

**4. FFmpeg Processing Error**
```json
{
  "error": "Video creation failed with code 1",
  "details": "FFmpeg stderr output..."
}
```
**Solution:** Check media file formats and FFmpeg installation

**5. Audio Extraction Failed**
```json
{
  "error": "Failed to extract Instagram audio",
  "details": "yt-dlp error..."
}
```
**Solution:** Verify Instagram URL is valid and accessible

### Best Practices for Error Handling

1. **Validate Input:** Check parameters before sending requests
2. **Handle Timeouts:** Large videos may take time to process
3. **Retry Logic:** Implement retry for network-related errors
4. **Check URLs:** Verify media URLs are accessible before sending
5. **Monitor Logs:** Check server logs for detailed error information

---

## 🎯 Advanced Features

### Vid-1.2/1.3/1.4 Capabilities

#### 🎬 Media Processing
- **Multi-source support** - Combine content from different URLs and local files
- **Mixed media** - Videos and images in the same project
- **Auto-normalization** - All media normalized to 1080x1920 with consistent formatting
- **Smart detection** - Automatically detects images vs videos by file extension
- **Format conversion** - Images converted to video segments automatically

#### ⏱️ Timing Control
- **Custom durations** - Each clip/image can have different display time
- **Audio synchronization** - Total video duration capped by audio length
- **Begin parameter (NEW)** - Extract specific segments from source videos with frame accuracy
- **Timeline positioning** - Control where clips appear in final video with `start` parameter
- **Auto-duration calculation** - Smart duration based on next clip's timing
- **Timeline-based editing** - Precise control over clip timing and source extraction

#### 🎨 Professional Output
- **Text overlays** - Quote, author, and watermark with proper positioning
- **Clean concatenation** - Seamless joining of different media types
- **Automatic cleanup** - All temporary files managed automatically
- **Error handling** - Comprehensive error reporting and recovery
- **Progress tracking** - Console logs for monitoring processing

#### 🌐 Content Sources
- **Remote videos** - Any publicly accessible video URL
- **Remote images** - Stock photos from Unsplash, Pexels, etc.
- **Local files** - Videos and images from temp/ or uploads/ folders
- **Mixed projects** - Combine local and remote content seamlessly
- **Instagram audio** - Extract audio directly from Instagram reels

#### 🎯 Smart Aspect Ratio (Vid-1.3/1.4)
- **9:16 clips** - Fill entire screen (1080x1920) with text overlay
- **16:9 clips** - Centered with black bars, text in available space
- **Square clips** - Centered with maximum screen usage
- **Adaptive scaling** - Maintains aspect ratio while maximizing screen usage
- **Intelligent text positioning** - Text adapts based on video dimensions

#### 🎤 Volume Control (Vid-1.3/1.4)
- **Per-clip volume** - Control audio volume for each video clip (0-200%)
- **Background music** - Instagram audio plays as background
- **Audio mixing** - Clip audio mixed with background music
- **Volume range** - 0% (mute) to 200% (boost)
- **Independent control** - Each clip can have different volume level

## 🎯 Endpoint Comparison & Selection Guide

| Feature | Style 1 | Style 2 | Style 3 | Style 4 | Vid-1 | Vid-1.2 | Vid-1.3 | Vid-1.4 | Vid-1.5 |
|---------|---------|---------|---------|---------|-------|---------|---------|---------|---------|
| **Background** | Image | Image | Image | Image | Video | Multi-clip | Multi-clip | Multi-clip | Multi-clip |
| **Text Position** | Bottom | Bottom | Top | Top | Top | Top | Top | Top | Top |
| **Fade Effect** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Processing** | 2-step | 1-step | 2-step | 1-step | 2-step | Multi-step | Multi-step | Multi-step | Multi-step |
| **Performance** | Slower | Faster | Slower | Faster | Medium | Medium | Medium | Medium | Medium |
| **Multiple Clips** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Mixed Media** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Smart Aspect Ratio** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Timed Captions** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Volume Control** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Begin Parameter** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Auto-Duration** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Overlay Support** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Best For** | Simple | Simple | Simple | Simple | Simple | Complex | Advanced | Captions | Enhanced |

### 📌 Recommendations

**For Simple Image Videos:**
- Use **Style 2** (bottom text) or **Style 4** (top text) - they're faster than Style 1/3

**For Simple Video Background:**
- Use **Vid-1** for basic video with text overlay

**For Multi-Clip Projects:**
- Use **Vid-1.2** for basic multi-clip videos
- Use **Vid-1.3** for advanced projects with smart aspect ratio handling
- Use **Vid-1.4** if you only need timed captions (no static quote)
- Use **Vid-1.5** for enhanced videos with overlay effects and timed captions

**Redundant Endpoints (Can Be Removed):**
- **Style 1** → Use Style 2 instead (same result, better performance)
- **Style 3** → Use Style 4 instead (same result, better performance)
- **Vid-1** → Use Vid-1.2 with single clip instead
- **Vid-1.2** → Use Vid-1.3 instead (more features)
- **Vid-1.4** → Use Vid-1.3 instead (supports both quotes and captions)

---

## 🚀 Use Cases

### Social Media Content
- **Instagram Reels** - All endpoints support 9:16 format
- **TikTok Videos** - Perfect vertical video output
- **YouTube Shorts** - Optimized for mobile viewing
- **Facebook Stories** - Professional-looking stories

### Marketing & Business
- **Product Showcases** - Mix product photos and demo videos (Vid-1.2, Vid-1.3)
- **Brand Content** - Professional videos with watermarks
- **Testimonials** - Quote-based videos with customer photos (Style 2, Style 4)
- **Announcements** - Eye-catching videos with fade effects

### Educational Content
- **Tutorials** - Step-by-step with timed captions (Vid-1.3, Vid-1.4)
- **Explainer Videos** - Mix diagrams and video clips
- **Course Previews** - Engaging promotional content
- **Tips & Tricks** - Quick educational snippets

### Creative Projects
- **Storytelling** - Narrative content with timed captions (Vid-1.3)
- **Photo Slideshows** - Dynamic presentations with music
- **Travel Videos** - Mix photos and video clips from trips
- **Event Highlights** - Combine best moments with music

### Motivational & Inspirational
- **Quote Videos** - Beautiful quote overlays on images (Style 2, Style 4)
- **Daily Affirmations** - Positive messages with calming backgrounds
- **Success Stories** - Inspirational content with fade effects
- **Wisdom Sharing** - Philosophical quotes with nature backgrounds


---

## 🔧 Technical Requirements

### System Requirements
- **Node.js:** v14.0.0 or higher
- **FFmpeg:** Latest version (must be in system PATH)
- **FFprobe:** Included with FFmpeg
- **yt-dlp:** For Instagram audio extraction (optional)
- **Operating System:** Windows, macOS, or Linux

### Node.js Dependencies
```json
{
  "express": "^4.18.0",
  "multer": "^1.4.5-lts.1",
  "uuid": "^9.0.0"
}
```

### Installation

1. **Install Node.js dependencies:**
```bash
npm install
```

2. **Install FFmpeg:**
- **Windows:** Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt-get install ffmpeg`

3. **Install yt-dlp (for Instagram audio):**
- **Windows:** Download from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- **macOS:** `brew install yt-dlp`
- **Linux:** `sudo apt-get install yt-dlp`

4. **Verify installation:**
```bash
ffmpeg -version
ffprobe -version
yt-dlp --version
```

### Directory Structure
```
project/
├── endpoints/          # Endpoint implementation files
│   ├── style1.js
│   ├── style2.js
│   ├── style3.js
│   ├── style4.js
│   ├── vid-1.js
│   ├── vid-1.2.js
│   ├── vid-1.3.js
│   ├── vid-1.4.js
│   ├── vid-1.5.js
│   └── utils.js
├── uploads/           # Uploaded files (auto-created)
├── temp/              # Temporary processing files (auto-created)
├── output/            # Generated videos (auto-created)
├── public/            # Static files
├── server-modular.js  # Main server file
├── package.json
└── README.md
```

---

## 🐛 Troubleshooting

### Issue: "FFmpeg not found"
**Cause:** FFmpeg is not installed or not in system PATH

**Solution:**
1. Install FFmpeg using instructions above
2. Verify installation: `ffmpeg -version`
3. Restart terminal/server after installation

### Issue: "Failed to extract Instagram audio"
**Cause:** yt-dlp not installed or Instagram URL invalid

**Solution:**
1. Install yt-dlp: `npm install -g yt-dlp` or use system package manager
2. Verify Instagram URL is accessible
3. Check yt-dlp version: `yt-dlp --version`
4. Update yt-dlp: `yt-dlp -U`

### Issue: "Video creation failed with code 1"
**Cause:** FFmpeg processing error (invalid media, codec issues, etc.)

**Solution:**
1. Check server logs for detailed FFmpeg error output
2. Verify media files are valid and not corrupted
3. Ensure media formats are supported (MP4, JPG, PNG, etc.)
4. Try with different media files to isolate the issue

### Issue: "Request timeout"
**Cause:** Large video files or slow network

**Solution:**
1. Increase request timeout in your HTTP client
2. Use smaller video files or shorter durations
3. Download media locally first, then use local paths
4. Check network connection for remote URLs

### Issue: "Out of memory"
**Cause:** Processing very large videos or many clips

**Solution:**
1. Reduce video resolution before uploading
2. Use fewer clips in multi-clip projects
3. Increase Node.js memory limit: `node --max-old-space-size=4096 server-modular.js`
4. Process videos in smaller batches

### Issue: "Text not displaying correctly"
**Cause:** Font not found or special characters

**Solution:**
1. Verify Impact and Arial fonts are installed on system
2. Avoid special characters that may not render properly
3. Use ASCII characters or test with simple text first
4. Check font paths in endpoint files (Windows: `C:\\Windows\\Fonts\\`)

### Issue: "Audio and video out of sync"
**Cause:** Different frame rates or codec issues

**Solution:**
1. Use consistent audio formats (MP3, AAC)
2. Ensure video clips have valid timestamps
3. Check that audio file is not corrupted
4. Try re-encoding audio to MP3 format

---

## 📚 API Testing

### Using cURL
```bash
# Test health endpoint (Production)
curl https://video-editor-api-519298355551.us-central1.run.app/health

# Test health endpoint (Local)
curl http://localhost:8080/health

# Create simple video (Production)
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/create-video-style2 \
  -H "Content-Type: application/json" \
  -d @test-request.json

# Create video without quote (NEW - Production)
curl -X POST https://video-editor-api-519298355551.us-central1.run.app/create-video \
  -H "Content-Type: application/json" \
  -d '{
    "author": "Test Author",
    "imageUrl": "https://images.unsplash.com/photo-example.jpg",
    "audioUrl": "https://example.com/audio.mp3"
  }'

# Download generated video
curl https://video-editor-api-519298355551.us-central1.run.app/video/abc123-video.mp4 -o output.mp4
```

### Using Postman
1. Import collection with all endpoints
2. Set base URL: 
   - **Production:** `https://video-editor-api-519298355551.us-central1.run.app`
   - **Local:** `http://localhost:8080`
3. Use JSON body for parameters
4. Use form-data for file uploads

### Using JavaScript/Node.js
```javascript
const axios = require('axios');

// Production API
const API_BASE = 'https://video-editor-api-519298355551.us-central1.run.app';

async function createVideo() {
  try {
    const response = await axios.post(`${API_BASE}/create-video-style2`, {
      quote: 'Your quote here',
      author: 'Author Name',
      imageUrl: 'https://example.com/image.jpg',
      audioUrl: 'temp/audio.mp3'
    });
    
    console.log('Video created:', response.data.videoUrl);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// NEW: Create video without quote
async function createVideoNoQuote() {
  try {
    const response = await axios.post(`${API_BASE}/create-video`, {
      author: 'Author Name',
      watermark: '@mybrand',
      imageUrl: 'https://example.com/image.jpg',
      audioUrl: 'https://example.com/audio.mp3'
    });
    
    console.log('Video created without quote:', response.data.videoUrl);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

createVideo();
createVideoNoQuote();
```

### Using Python
```python
import requests

# Production API
API_BASE = 'https://video-editor-api-519298355551.us-central1.run.app'

def create_video():
    url = f'{API_BASE}/create-video-style2'
    data = {
        'quote': 'Your quote here',
        'author': 'Author Name',
        'imageUrl': 'https://example.com/image.jpg',
        'audioUrl': 'temp/audio.mp3'
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        print('Video created:', response.json()['videoUrl'])
    else:
        print('Error:', response.json())

# NEW: Create video without quote
def create_video_no_quote():
    url = f'{API_BASE}/create-video'
    data = {
        'author': 'Author Name',
        'watermark': '@mybrand',
        'imageUrl': 'https://example.com/image.jpg',
        'audioUrl': 'https://example.com/audio.mp3'
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        print('Video created without quote:', response.json()['videoUrl'])
    else:
        print('Error:', response.json())

create_video()
create_video_no_quote()
```

---

## 🔒 Security Considerations

### File Upload Security
- **File size limits:** 50MB per file (configurable in multer)
- **File type validation:** Only allow specific media types
- **Sanitize filenames:** Remove special characters and path traversal attempts
- **Temporary storage:** Files stored in isolated temp/ directory

### URL Validation
- **Validate URLs:** Check URL format before downloading
- **Timeout limits:** Set timeouts for external requests
- **HTTPS preferred:** Use HTTPS URLs when possible
- **Rate limiting:** Implement rate limiting for production use

### Production Recommendations
1. **Add authentication:** Implement API key or OAuth
2. **Rate limiting:** Prevent abuse with request limits
3. **Input validation:** Validate all parameters thoroughly
4. **Error sanitization:** Don't expose internal paths in errors
5. **HTTPS only:** Use HTTPS in production
6. **File cleanup:** Regularly clean temp/ and output/ directories
7. **Monitoring:** Log all requests and errors
8. **Resource limits:** Set memory and CPU limits

---

## 📈 Performance Optimization

### Server-Side
- **Use Style 2/4:** Single-step processing is faster than two-step
- **Local files:** Use local files instead of downloading from URLs
- **Parallel processing:** Process multiple requests with worker threads
- **Caching:** Cache downloaded media files
- **Cleanup:** Regularly delete old temp files

### Client-Side
- **Compress media:** Reduce file sizes before uploading
- **Optimize images:** Use appropriate resolution (1920x1080 max)
- **Short videos:** Keep clips under 30 seconds when possible
- **Batch requests:** Group multiple video creations efficiently

### Resource Management
- **Memory:** Monitor Node.js memory usage
- **Disk space:** Ensure adequate space for temp files
- **CPU:** FFmpeg is CPU-intensive, consider dedicated server
- **Network:** Fast internet for downloading remote media

---

## 🚀 Deployment

### Production Deployment
The API is currently deployed on **Google Cloud Run**:

- **URL:** https://video-editor-api-519298355551.us-central1.run.app
- **Status:** ✅ LIVE
- **Region:** us-central1
- **Resources:** 4Gi memory, 2 CPU cores
- **Timeout:** 900 seconds
- **Max Instances:** 10

### Deployment Features
- ✅ **Auto-scaling** - Scales to zero when not in use
- ✅ **High availability** - Managed by Google Cloud
- ✅ **HTTPS** - Secure connections by default
- ✅ **Global CDN** - Fast response times worldwide
- ✅ **Container-based** - Consistent environment

### Local Deployment
```bash
# Clone repository
git clone <repository-url>
cd video-editor-api

# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:8080
```

### Docker Deployment
```bash
# Build image
docker build -t video-editor-api .

# Run container
docker run -p 8080:8080 video-editor-api
```

### Environment Variables
- `NODE_ENV=production` - Production mode
- `PORT=8080` - Server port (default: 8080)

---

## 📞 Support & Contributing

### Getting Help
- **Issues:** Report bugs on GitHub Issues
- **Documentation:** Refer to this README and endpoint docs
- **Logs:** Check server console for detailed error messages
- **Community:** Join discussions for tips and best practices

### Contributing
Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request with clear description

### License
This project is licensed under the MIT License.

---

## 🎉 Quick Reference Card

### Most Common Endpoints

**Simple Image Video (Bottom Text):**
```bash
POST /create-video-style2
{ "quote": "...", "imageUrl": "...", "audioUrl": "..." }
```

**Simple Image Video (Top Text):**
```bash
POST /create-video-style4
{ "quote": "...", "imageUrl": "...", "audioUrl": "..." }
```

**Multi-Clip Video:**
```bash
POST /create-video-vid-1.2
{ "quote": "...", "clips": [...], "audioUrl": "..." }
```

**NEW: Video Without Quote:**
```bash
POST /create-video
{ "author": "...", "watermark": "...", "imageUrl": "...", "audioUrl": "..." }
```

**NEW: Multi-Clip Without Quote:**
```bash
POST /vid-1.2
{ "author": "...", "clips": [...], "audioUrl": "..." }
```

**Advanced Multi-Clip with Captions:**
```bash
POST /vid-1.3
{ "captions": [...], "clips": [...], "audioUrl": "..." }
```

### Key Parameters
- `quote` - Main text (**optional** for `/create-video` and `/vid-1.2`)
- `author` - Author name (optional)
- `watermark` - Watermark text (optional)
- `imageUrl` / `videoUrl` - Media source
- `audioUrl` / `instagramUrl` - Audio source
- `clips` - Array of media clips (multi-clip endpoints)
- `captions` - Timed captions (Vid-1.3, Vid-1.4)

### Output
- **Format:** MP4 (1080x1920)
- **Location:** `/video/{sessionId}-video.mp4`
- **Duration:** Capped by audio length

---

**Made with ❤️ for content creators**
