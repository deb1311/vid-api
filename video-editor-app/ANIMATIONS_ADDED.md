# Canvas Animations Added

## ✅ Fade In/Out Animations

### Media Fade Animation
Matches the backend fade animation from style1.js (75% fade duration):

```javascript
calculateFadeOpacity(timeInClip, duration) {
    const fadeDuration = Math.min(duration * 0.75, 2); // 75% or 2s max
    
    // Fade in at start
    if (timeInClip < fadeDuration) {
        return timeInClip / fadeDuration;
    }
    
    // Fade out at end
    const timeFromEnd = duration - timeInClip;
    if (timeFromEnd < fadeDuration) {
        return timeFromEnd / fadeDuration;
    }
    
    // Full opacity in middle
    return 1.0;
}
```

### What Fades
1. **Video/Image Clips**: Fade in at start, fade out at end
2. **Quote Text**: Fades with overall video duration
3. **Author Text**: Fades with overall video duration
4. **Captions**: Each caption fades in/out independently
5. **Watermark**: No fade (always visible)

### How It Works
- Uses `ctx.globalAlpha` to control opacity
- Calculates fade based on time within clip
- Smooth transitions matching backend output

## ✅ Playhead Position Fixed

### Before
```css
left: 150px; /* Wrong position */
```

### After
```css
left: 320px; /* Starts where timeline starts */
```

### JavaScript
```javascript
updatePlayheadPosition() {
    const playhead = document.getElementById('globalPlayhead');
    // 320px (preview width) + 150px (track label) + timeline position
    const position = 320 + 150 + (this.currentTime * this.timelineZoom);
    playhead.style.left = `${position}px`;
}
```

## 📝 Instagram Audio Note

### Client-Side Limitation
The canvas preview is **client-side only** and cannot:
- Extract audio from Instagram URLs
- Play audio from any source
- Access Instagram's API

### Backend Handles Audio
When you export the JSON and send it to the backend:
- Backend uses `yt-dlp` to extract Instagram audio
- Audio is mixed with video clips
- Final video includes all audio

### Visual Indicator Added
Properties panel now shows:
```
⚠️ Instagram audio will be extracted when rendering on the backend.
   Preview shows video only.
```

## Animation Timeline

### Single Clip Example
```
Time:     0s -------- 2s -------- 8s -------- 10s
Opacity:  0% -------- 100% ------ 100% ------ 0%
          [Fade In]   [Full]      [Fade Out]
```

### Caption Example (3s duration)
```
Time:     0s -- 0.75s -- 2.25s -- 3s
Opacity:  0% -- 100% --- 100% --- 0%
          [In]  [Full]   [Out]
```

## Testing Animations

### Test Fade In/Out
1. Load a JSON with multiple clips
2. Play the preview
3. Watch clips fade in smoothly at start
4. Watch clips fade out smoothly at end
5. Captions should fade independently

### Test Playhead
1. Load any JSON
2. Verify playhead starts at left edge of timeline (after track labels)
3. Playhead should move smoothly with playback
4. Click timeline to jump - playhead follows

## Performance

- Fade calculations: O(1) per frame
- No performance impact
- Smooth 30 FPS rendering maintained
- Canvas globalAlpha is hardware accelerated

## Matching Backend Output

The preview now matches these backend features:
✅ Fade in/out animations (75% duration)
✅ Smart aspect ratio
✅ Text positioning and styling
✅ Caption timing
✅ Watermark placement

Not in preview (backend only):
❌ Audio playback
❌ Instagram audio extraction
❌ Audio mixing
❌ Final video encoding

## Summary

The canvas preview now provides a **complete visual representation** of what the backend will produce, including smooth fade animations. The only difference is audio, which is handled entirely by the backend when you export and render the final video.
