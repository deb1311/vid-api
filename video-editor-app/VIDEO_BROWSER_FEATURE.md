# Video Browser Feature

## Overview
Added a video browser feature that allows users to browse and select videos from the Filebase bucket directly within the editor, eliminating the need to manually copy/paste URLs.

## Features

### 1. Browse Button
- **Location**: Next to each video URL field in the properties panel
- **Icon**: 📁 folder icon
- **Behavior**: Opens a modal with all available videos from Filebase

### 2. Video Browser Modal
- **Grid Layout**: Videos displayed in a responsive grid
- **Search**: Real-time search/filter functionality
- **Lazy Loading**: Videos only load when scrolled into view (memory efficient)
- **Hover Preview**: Videos play on hover for quick preview
- **Metadata**: Shows duration and file size for each video

### 3. Efficient Loading
- **Intersection Observer**: Only loads video thumbnails when visible
- **Preload Metadata**: Loads just enough to show thumbnail
- **On-Demand**: Full video only loads when needed
- **Memory Safe**: Prevents loading all videos at once

## Implementation Details

### Files Modified
1. **index.html**: Added video browser modal structure
2. **app.js**: Added video browser methods and event handlers
3. **styles.css**: Added video browser styling

### Key Methods
- `showVideoBrowser(clipIndex)`: Opens the browser for a specific clip
- `loadVideosFromFilebase()`: Fetches video list from Cloudflare worker
- `renderVideoGrid(videos)`: Renders videos with lazy loading
- `selectVideoFromBrowser(videoUrl)`: Updates clip with selected video

### Cloudflare Worker Integration
- **Worker URL**: `https://filebase-media-fetcher.debabratamaitra898.workers.dev`
- **Bucket**: `stock-clips`
- **Endpoint**: `/{bucket}?list` - Lists all files with metadata
- **Video URL**: `/{bucket}/{filename}` - Streams individual videos
- **Status**: ✅ Deployed and working

## Usage

1. **Load a JSON file** with video clips
2. **Find a video clip** in the properties panel
3. **Click the browse button** (📁) next to the video URL field
4. **Browse videos** in the modal:
   - Use search to filter
   - Hover to preview
   - Click to select
5. **Video URL auto-fills** and clip updates

## Performance Optimizations

### Lazy Loading
- Videos only load when scrolled into view
- Uses Intersection Observer API
- 50px margin for smooth loading

### Memory Management
- Only metadata loaded initially
- Thumbnails generated from frame at 2 seconds
- Videos pause when not hovering
- No unnecessary video elements in memory

### Network Efficiency
- Single API call to list all videos
- Videos stream on-demand
- Cloudflare worker handles caching
- Range requests supported for seeking

## Configuration

### Change Bucket Name
In `app.js`, update the `bucketName` variable:
```javascript
const bucketName = 'your-bucket-name';
```

### Change Worker URL
In `app.js`, update the `workerUrl` variable:
```javascript
const workerUrl = 'https://your-worker.workers.dev';
```

## Testing

Run `test_video_browser.html` to:
1. Test Cloudflare worker connection
2. Verify video listing works
3. Check metadata (duration, size)

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Responsive design

## Future Enhancements
- [ ] Folder/category organization
- [ ] Upload new videos directly
- [ ] Video preview with controls
- [ ] Batch selection
- [ ] Favorites/bookmarks
- [ ] Sort by date/size/duration
- [ ] Thumbnail generation on server
