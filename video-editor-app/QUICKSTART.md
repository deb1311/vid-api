# Quick Start Guide

## 🚀 Getting Started in 30 Seconds

1. **Open the app**
   ```
   Open video-editor-app/index.html in your browser
   ```

2. **Import a test file**
   - Click the 📥 Import JSON button in the left sidebar
   - Navigate to your project root folder
   - Select `test_vid13_captions.json` (or any other test file)
   - Watch as clips and captions load automatically!

3. **Explore the interface**
   - Click on any clip in the timeline to see its properties
   - Drag clips left/right to adjust timing
   - Edit text, duration, and other properties in the right panel

4. **Export your video**
   - Click the "Export" button in the top right
   - View the API request data that will be sent to the backend
   - (Connect to backend API to actually generate videos)

## 📁 Test Files to Try

### test_vid13_captions.json
Perfect for testing caption timing
- 1 video clip
- 3 sequential captions
- Background audio

### test_vid14_mixed_media.json
Great for testing mixed content
- Video + Images
- 4 captions
- Different aspect ratios

### test_vid14_multi_clips.json
Test multiple video clips
- 3 video segments
- Volume variations
- 4 captions

## 🎨 Key Features to Try

### Timeline Editing
- **Drag clips**: Click and drag any clip to change its start time
- **Zoom**: Use +/- buttons above timeline to zoom in/out
- **Select**: Click any clip to edit its properties

### Properties Panel
- **Video clips**: Change URL, duration, volume (0-200%)
- **Text clips**: Edit content, font size, color, alignment
- **Audio clips**: Set URL (supports Instagram), adjust volume

### Project Settings
- **Author**: Your name or brand
- **Watermark**: Social media handle (e.g., @username)
- **Project Name**: Give your project a name

## 🔌 Connecting to Backend

To generate actual videos:

1. Start your backend server:
   ```bash
   node server-modular.js
   ```

2. Open `app.js` in the video-editor-app folder

3. Find the `exportVideo()` method (around line 520)

4. Uncomment this section:
   ```javascript
   const response = await fetch('http://localhost:3000/vid-1.3', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(apiData)
   });
   ```

5. Click "Export" in the app to generate videos!

## 💡 Tips

- **Auto-save**: Your project saves automatically to localStorage
- **Manual save**: Click "Save" to download a JSON backup
- **Reload projects**: Refresh the page to load your last project
- **Start fresh**: Clear localStorage or import a new JSON file

## 🎯 Common Workflows

### Create a Simple Caption Video
1. Import `test_vid13_captions.json`
2. Click on each caption to edit the text
3. Adjust timing by dragging clips
4. Export when ready

### Mix Videos and Images
1. Import `test_vid14_mixed_media.json`
2. See how videos and images work together
3. Edit captions to match your content
4. Adjust clip durations as needed

### Build from Scratch
1. Click "Add Video Clip" in left sidebar
2. Enter video URL in properties panel
3. Click "Add Text/Caption" for each caption
4. Set start times and durations
5. Add background audio with "Add Audio"
6. Export your creation!

## 🐛 Troubleshooting

**Can't see imported clips?**
- Check browser console for errors
- Make sure JSON file is valid
- Try refreshing the page

**Clips not dragging?**
- Make sure you're clicking on the clip body, not the delete button
- Try clicking once to select, then drag

**Properties not updating?**
- Click the clip again to refresh the panel
- Check that you're editing the selected clip (yellow border)

**Video not generating?**
- Backend API must be running
- Uncomment the fetch code in `exportVideo()`
- Check console for API errors

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check the [API documentation](../endpoints/README.md) for backend details
- Experiment with different clip combinations
- Try creating your own JSON files

Enjoy creating videos! 🎬
