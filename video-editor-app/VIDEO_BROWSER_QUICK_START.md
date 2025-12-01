# Video Browser - Quick Start Guide

## 🚀 Quick Start

### Step 1: Open the Editor
Open `video-editor-app/index.html` in your browser

### Step 2: Load a Video Project
- Click "Load from Notion" or load a JSON file
- Make sure it has video clips

### Step 3: Browse Videos
1. Find a video clip in the properties panel
2. Look for the **📁 Browse** button next to the video URL field
3. Click it to open the video browser

### Step 4: Select a Video
- **Search**: Type to filter videos
- **Hover**: Preview the video
- **Click**: Select and auto-fill the URL

That's it! The video URL is now updated.

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Browse Button** | 📁 icon next to video URL fields |
| **Video Grid** | Responsive grid layout |
| **Search** | Real-time filtering |
| **Lazy Loading** | Only loads visible videos |
| **Hover Preview** | Videos play on hover |
| **Duration Badge** | Shows video length |
| **One-Click Select** | Click to choose |

## 🔧 Technical Info

**Worker URL**: https://filebase-media-fetcher.debabratamaitra898.workers.dev  
**Bucket**: stock-clips  
**Videos Available**: 100+

## 📝 Notes

- Only video clips show the browse button (not image clips)
- Videos load efficiently using lazy loading
- Hover over videos to preview them
- Search is case-insensitive
- Click anywhere outside the modal to close it

## 🧪 Testing

**Quick Test**: Open `test_worker_deployed.html` to verify the worker is working

**Full Test**: 
1. Load `test_vid13_mixed_final.json`
2. Click browse on any video clip
3. Select a video from the grid

## ✅ Success Checklist

- [ ] Worker is deployed and accessible
- [ ] Browse button appears next to video URLs
- [ ] Modal opens when clicking browse
- [ ] Videos load in grid layout
- [ ] Search filters videos
- [ ] Hover shows preview
- [ ] Click selects video and updates URL

## 🐛 Troubleshooting

**Videos not loading?**
- Check browser console for errors
- Verify worker URL is correct
- Test worker with `test_worker_deployed.html`

**Browse button not showing?**
- Make sure you're looking at a video clip (not image)
- Refresh the page
- Check that JSON has clips array

**Modal not opening?**
- Check browser console
- Verify JavaScript is enabled
- Try refreshing the page
