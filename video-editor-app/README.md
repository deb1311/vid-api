# Video Editor Studio

A professional video editing web application built with HTML, CSS, and JavaScript. This app provides a modern, timeline-based interface for creating videos using the Video Editor API, inspired by professional video editing software.

## Features

- **Professional UI**: Modern dark theme inspired by industry-standard video editors
- **JSON Import**: Import test JSON files to quickly load projects with clips and captions
- **Timeline-based editing**: Separate tracks for video, text/captions, and audio
- **Drag & Drop**: Move clips along the timeline by dragging
- **Real-time preview**: 9:16 aspect ratio canvas for Instagram Reels format
- **Properties panel**: Edit clip properties in real-time
- **Timeline zoom**: Zoom in/out for precise editing
- **Auto-save**: Project automatically saves to localStorage
- **Export project**: Download project as JSON file
- **Playback controls**: Play, pause, stop, speed control, and fullscreen
- **Responsive design**: Works on desktop and tablet devices

## Layout

The app follows a professional video editor layout inspired by modern editing software:

- **Top Navigation Bar**: 
  - Logo and navigation tabs (Uploads, Canvas, Videos, Text, Audio, Photos)
  - Undo/Redo buttons
  - Save and Export buttons
- **Left Sidebar**: 
  - Project settings (name, author, watermark)
  - Quick action buttons
  - JSON import button
- **Center Canvas Area**:
  - Video preview (9:16 aspect ratio for Instagram Reels)
  - Playback controls with time display
  - Timeline section with ruler
  - Separate tracks for video, text, and audio
  - Timeline zoom controls
- **Right Sidebar**:
  - Properties panel for selected clips
  - Dynamic form based on clip type

## Usage

### Getting Started

1. Open `index.html` in a web browser
2. Enter your project name, author, and watermark in the left sidebar

### Importing Test JSON Files

1. Click the **Import JSON** button (📥 icon) in the left sidebar header
2. Select one of the test JSON files:
   - `test_vid13_captions.json` - Video with timed captions
   - `test_vid13_with_overlay.json` - Timed captions with radial overlay
   - `test_vid14_mixed_media.json` - Mixed video and image clips
   - `test_vid14_multi_clips.json` - Multiple video clips
   - `test_vid14_pexels.json` - Single video with captions
   - `test_vid14_with_overlay.json` - Pexels video with radial overlay
   - `test_vid15_working.json` - Vid-1.5 without overlay
   - `test_vid15_with_overlay.json` - Vid-1.5 with radial vignette overlay
3. The app will automatically load all clips, captions, and settings

### Manual Editing

1. Click quick action buttons to add video, text, or audio clips
2. Click on clips in the timeline to select and edit them
3. Drag clips left/right to adjust timing
4. Configure clip properties in the right sidebar:
   - **Video clips**: URL, start time, duration, volume (0-200%)
   - **Text clips**: content, font size, color, weight, alignment, timing
   - **Audio clips**: URL (supports Instagram URLs), volume
5. Use timeline zoom controls (+/-) for precise editing
6. Click "Save" to download project as JSON
7. Click "Export" to generate video (shows API request data)

## Clip Properties

### Video Clips
- Label: Display name
- Start Time: When clip starts in timeline
- Duration: How long clip plays
- Video URL: Source URL or file path
- Volume: Audio volume (0-200%)

### Text Clips
- Label: Display name
- Start Time: When text appears
- Duration: How long text is visible
- Text Content: The text to display
- Font Size: Text size in pixels
- Text Color: Color picker

### Audio Clips
- Label: Display name
- Start Time: When audio starts
- Duration: Audio duration
- Audio URL: Direct audio URL or Instagram reel URL
- Volume: Audio volume (0-200%)

## API Integration

The app is designed to work with the Video Editor API endpoints. When you click "Confirm", it builds a request compatible with the `/vid-1.3`, `/vid-1.4`, and `/vid-1.5` endpoints:

```javascript
{
  clips: [
    { videoUrl: "...", start: 0, duration: 5, volume: 100 }
  ],
  captions: [
    { text: "...", start: 0, duration: 3 }
  ],
  audioUrl: "...",
  watermark: "@username",
  author: "Creator Name",
  overlay: true  // NEW: Radial vignette overlay support
}
```

## Backend Connection

The app is ready to connect to your Video Editor API. To enable video generation:

1. Open `app.js` and find the `exportVideo()` method
2. Uncomment the fetch API call (around line 520)
3. Update the endpoint URL if your server is not on `localhost:3000`
4. Start your backend server: `node server-modular.js`
5. Click "Export" in the app to generate videos

Example API call (already in code, just uncomment):
```javascript
const response = await fetch('http://localhost:3000/vid-1.3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiData)
});
const result = await response.json();
if (result.success) {
    this.loadVideoPreview(result.videoUrl);
}
```

### API Request Format

The app generates requests compatible with the `/vid-1.3`, `/vid-1.4`, and `/vid-1.5` endpoints:

```json
{
  "clips": [
    {
      "videoUrl": "https://example.com/video.mp4",
      "start": 0,
      "duration": 5,
      "volume": 100
    }
  ],
  "captions": [
    {
      "text": "Caption text here",
      "start": 0,
      "duration": 3
    }
  ],
  "audioUrl": "temp/audio.mp3",
  "author": "Creator Name",
  "watermark": "@username",
  "overlay": true
}
```

### Radial Overlay Feature

The `overlay` parameter enables a cinematic radial vignette effect:

- **When `overlay: true`**: Applies `assets/overlay.png` as a radial mask
- **Effect**: Creates darker edges with normal center (spotlight effect)
- **Compatibility**: Works with Vid-1.3, Vid-1.4, and Vid-1.5 endpoints
- **Text preservation**: Captions and watermarks remain bright and visible
- **No color shifts**: Uses maskedmerge technique for natural colors

## Technologies Used

- HTML5
- CSS3 (Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- Font Awesome 6.4.0 (icons via CDN)
- LocalStorage API (project persistence)

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Keyboard Shortcuts (Coming Soon)

- `Space` - Play/Pause
- `Delete` - Delete selected clip
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save project

## Test JSON Files

The app can import these test files from your project root:

1. **test_vid13_captions.json**
   - 1 video clip with 3 timed captions
   - Background audio
   - Author and watermark

2. **test_vid13_with_overlay.json** ⭐ NEW
   - Cinematic storytelling with radial vignette overlay
   - Pexels cityscape image
   - 2 timed captions

3. **test_vid14_mixed_media.json**
   - 1 video + 2 images
   - 4 timed captions
   - Mixed aspect ratios

4. **test_vid14_multi_clips.json**
   - 3 video clips from same source
   - Different start times and volumes
   - 4 timed captions

5. **test_vid14_pexels.json**
   - Single video clip
   - 4 timed captions
   - Volume control

6. **test_vid14_with_overlay.json** ⭐ NEW
   - Enhanced storytelling with atmospheric effects
   - Radial overlay applied to Pexels image
   - 2 timed captions

7. **test_vid15_working.json**
   - Vid-1.5 endpoint without overlay
   - Advanced multi-clip features

8. **test_vid15_with_overlay.json** ⭐ NEW
   - Advanced Vid-1.5 features with radial vignette
   - Professional cinematic effects
   - 2 timed captions

## Future Enhancements

- ✅ Drag-and-drop clip positioning
- ✅ Timeline zoom
- ✅ JSON import/export
- 🔄 Clip resize handles (drag to adjust duration)
- 🔄 Timeline scrubbing (click to seek)
- 🔄 File upload support (drag & drop files)
- 🔄 Real-time preview updates
- 🔄 Multiple audio tracks
- 🔄 Transition effects between clips
- 🔄 Video trimming controls
- 🔄 Full undo/redo functionality
- 🔄 Waveform visualization for audio
- 🔄 Snap to grid
- 🔄 Clip splitting

## License

Free to use and modify.
