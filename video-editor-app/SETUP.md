# Setup Guide

## 📋 Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- No installation required - runs directly in browser
- Optional: Backend API server for video generation

## 🚀 Quick Setup (30 seconds)

### Option 1: Direct Launch
1. Navigate to the `video-editor-app` folder
2. Double-click `index.html` or `demo.html`
3. Your default browser will open the app
4. Start editing!

### Option 2: Local Server (Recommended)
If you have Python installed:

```bash
# Navigate to video-editor-app folder
cd video-editor-app

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: `http://localhost:8000`

### Option 3: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

## 📁 File Structure

```
video-editor-app/
├── index.html          # Main application (OPEN THIS)
├── demo.html           # Landing page with info
├── styles.css          # All styling
├── app.js              # Application logic
├── README.md           # Full documentation
├── QUICKSTART.md       # Quick start guide
├── FEATURES.md         # Complete feature list
├── CHANGELOG.md        # Version history
└── SETUP.md            # This file
```

## 🎬 First Time Setup

### 1. Open the Application
- Open `index.html` in your browser
- You should see the Video Editor Studio interface

### 2. Test with Sample Data
- Click the 📥 Import JSON button (left sidebar header)
- Navigate to your project root folder
- Select `test_vid13_captions.json`
- Clips and captions will load automatically

### 3. Explore the Interface
- **Left Sidebar**: Project settings and quick actions
- **Center**: Video preview and timeline
- **Right Sidebar**: Properties panel
- **Top Bar**: Save, export, and navigation

### 4. Edit Your First Project
- Click on any clip in the timeline
- Edit properties in the right panel
- Drag clips to adjust timing
- Add new clips with quick action buttons

## 🔌 Backend API Setup (Optional)

To generate actual videos, connect to the backend API:

### 1. Start the Backend Server

```bash
# In your project root (not video-editor-app folder)
node server-modular.js
```

You should see:
```
Server running on http://localhost:3000
```

### 2. Enable API Connection

Open `video-editor-app/app.js` in a text editor:

1. Find the `exportVideo()` method (around line 520)
2. Look for this commented section:
```javascript
// TODO: Implement actual API call
// Uncomment when backend is ready:
/*
try {
    const response = await fetch('http://localhost:3000/vid-1.3', {
```

3. Remove the `/*` and `*/` to uncomment the code
4. Save the file

### 3. Test Video Generation

1. Refresh the app in your browser
2. Import a test JSON file or create clips
3. Click "Export" button
4. Video will be generated and displayed in preview

## 🐛 Troubleshooting

### App Won't Load
**Problem**: Blank page or errors
**Solution**: 
- Check browser console (F12) for errors
- Make sure all files are in the same folder
- Try a different browser
- Use a local server instead of file://

### Can't Import JSON
**Problem**: Import button doesn't work
**Solution**:
- Make sure you're clicking the 📥 icon in left sidebar
- Check that JSON file is valid
- Try a different test file
- Check browser console for errors

### Clips Not Appearing
**Problem**: Imported clips don't show on timeline
**Solution**:
- Check browser console for errors
- Verify JSON file format matches examples
- Try refreshing the page
- Clear localStorage and try again

### Can't Drag Clips
**Problem**: Clips won't move when dragging
**Solution**:
- Click on the clip body, not the delete button
- Make sure clip is selected (yellow border)
- Try clicking once to select, then drag
- Refresh the page if issue persists

### Properties Not Updating
**Problem**: Changes don't apply
**Solution**:
- Make sure clip is selected
- Check that you're editing the right clip
- Try clicking the clip again
- Refresh and try again

### Video Won't Generate
**Problem**: Export doesn't create video
**Solution**:
- Make sure backend server is running
- Check that API code is uncommented
- Verify server URL is correct (localhost:3000)
- Check browser console for network errors
- Test backend with curl first

### LocalStorage Full
**Problem**: Can't save project
**Solution**:
- Clear browser cache/localStorage
- Export project as JSON first
- Use a different browser
- Reduce number of clips

## 🔧 Advanced Configuration

### Change API Endpoint
Edit `app.js`, find:
```javascript
const response = await fetch('http://localhost:3000/vid-1.3', {
```

Change to your server URL:
```javascript
const response = await fetch('https://your-server.com/vid-1.3', {
```

### Customize Colors
Edit `styles.css`, find `:root` section:
```css
:root {
    --accent-primary: #6366f1;  /* Change this */
    --track-video: #8b5cf6;     /* And these */
    --track-text: #ec4899;
    --track-audio: #06b6d4;
}
```

### Adjust Timeline Zoom
Edit `app.js`, find constructor:
```javascript
this.pixelsPerSecond = 100;  // Change default zoom
```

### Change Default Duration
Edit `app.js`, find constructor:
```javascript
this.totalDuration = 30;  // Change default timeline length
```

## 📱 Mobile/Tablet Support

The app is responsive but works best on desktop:

- **Desktop**: Full features (recommended)
- **Tablet**: Most features work
- **Mobile**: Limited (view only recommended)

For best experience, use a device with:
- Screen width: 1024px or larger
- Mouse or trackpad for dragging
- Keyboard for text input

## 🌐 Browser Compatibility

### Fully Supported
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Partially Supported
- ⚠️ Chrome 80-89 (some CSS features may not work)
- ⚠️ Firefox 78-87 (some CSS features may not work)
- ⚠️ Safari 13 (some features limited)

### Not Supported
- ❌ Internet Explorer (any version)
- ❌ Chrome < 80
- ❌ Firefox < 78

## 💾 Data Storage

### LocalStorage
- Projects auto-save to browser localStorage
- Limit: ~5-10MB depending on browser
- Cleared when: Browser cache cleared
- Backup: Export as JSON regularly

### Exported JSON
- No size limit
- Stored on your computer
- Can be shared with others
- Can be version controlled (Git)

## 🔒 Privacy & Security

- **No Server Required**: Runs entirely in browser
- **No Data Sent**: Unless you connect to backend API
- **Local Storage Only**: Data stays on your device
- **No Tracking**: No analytics or tracking code
- **Open Source**: All code is visible and auditable

## 📚 Next Steps

1. ✅ Complete this setup
2. 📖 Read [QUICKSTART.md](QUICKSTART.md)
3. 🎬 Import a test JSON file
4. ✏️ Edit clips and properties
5. 💾 Save your project
6. 🔌 Connect to backend (optional)
7. 🎥 Generate your first video!

## 🆘 Getting Help

### Documentation
- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [FEATURES.md](FEATURES.md) - Complete feature list
- [CHANGELOG.md](CHANGELOG.md) - Version history

### Debugging
- Open browser console (F12)
- Check for error messages
- Verify file paths are correct
- Test with provided JSON files first

### Common Issues
- Most issues are browser-related
- Try a different browser
- Clear cache and reload
- Use a local server instead of file://

## ✅ Setup Checklist

- [ ] Files extracted to folder
- [ ] Opened index.html in browser
- [ ] Interface loads correctly
- [ ] Imported test JSON file
- [ ] Clips appear on timeline
- [ ] Can select and edit clips
- [ ] Can drag clips on timeline
- [ ] Properties panel updates
- [ ] Can save project
- [ ] (Optional) Backend server running
- [ ] (Optional) API connection enabled
- [ ] (Optional) Video generation works

---

**Setup Complete!** 🎉

You're ready to start creating videos. Check out [QUICKSTART.md](QUICKSTART.md) for your first project.
