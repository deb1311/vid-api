# Clip Timeline Feature - Visual Draggable Timeline

## Overview
Added a professional visual timeline with draggable handles to the Video Edit Modal, allowing users to visually adjust the `begin` and `duration` parameters for each clip by dragging handles on a timeline.

## Visual Design

```
Source Video Timeline
┌─────────────────────────────────────────────────────────┐
│ 0s        5s        10s       15s       20s       25s   │ ← Time Ruler
├─────────────────────────────────────────────────────────┤
│ ░░░░░░░░░░[████████████████]░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Timeline Track
│           ↑                 ↑                            │
│         begin          begin+duration                    │
│           └─────────────────┘                            │
│           10.0s - 18.0s                                  │
└─────────────────────────────────────────────────────────┘
```

## Features

### 1. **Visual Timeline Track**
- Shows the entire source video duration
- Dark background with time ruler showing markers every 5-15 seconds
- Blue selection block represents the extracted portion

### 2. **Three Drag Modes**

#### Left Handle (White)
- **Function**: Adjusts the `begin` parameter
- **Behavior**: Changes where to start extracting from source video
- **Effect**: Moves the start point, automatically adjusts duration to maintain end point
- **Visual**: White handle on the left side of the blue block

#### Right Handle (White)
- **Function**: Adjusts the `duration` parameter
- **Behavior**: Changes how long the extracted clip lasts
- **Effect**: Extends or shortens the clip from the end
- **Visual**: White handle on the right side of the blue block

#### Middle Block (Blue)
- **Function**: Slides the entire selection
- **Behavior**: Moves the extraction window along the source video
- **Effect**: Changes `begin` value, keeps `duration` constant
- **Visual**: Blue gradient block between the handles

### 3. **Real-Time Preview**
- Video player automatically seeks to the new `begin` position as you drag
- Instant visual feedback of the selected portion
- Form inputs (Begin, Duration) update automatically

### 4. **Smart Constraints**
- Cannot drag beyond video boundaries (0s to video duration)
- Minimum duration of 0.1 seconds enforced
- Handles snap to valid positions
- Prevents invalid selections

## Implementation Details

### HTML Structure
```html
<div class="clip-visual-timeline">
    <div class="timeline-ruler" id="timelineRuler">
        <!-- Time markers generated dynamically -->
    </div>
    <div class="timeline-track" id="timelineTrack">
        <div class="timeline-selection" id="timelineSelection">
            <div class="timeline-handle timeline-handle-left"></div>
            <div class="timeline-selection-body">
                <span class="timeline-time-label">10.0s - 18.0s</span>
            </div>
            <div class="timeline-handle timeline-handle-right"></div>
        </div>
    </div>
</div>
```

### Key Functions

#### `initializeClipTimeline(video, clip)`
- Initializes the timeline when video edit modal opens
- Waits for video metadata to load
- Generates time ruler and sets initial position

#### `generateTimelineRuler(videoDuration)`
- Creates time markers based on video duration
- Adaptive intervals (5s, 10s, or 15s based on total duration)

#### `updateTimelinePosition(begin, duration, videoDuration)`
- Updates the visual position of the selection block
- Calculates pixel positions based on time values
- Updates the time label and form inputs

#### `setupTimelineDragHandlers(video, videoDuration)`
- Sets up mouse event handlers for dragging
- Handles three drag modes (left, right, body)
- Updates video preview in real-time

#### `cleanupTimelineListeners()`
- Removes event listeners when modal closes
- Prevents memory leaks

### CSS Styling

**Timeline Container:**
- Dark theme (#2a2a2a background)
- Rounded corners and subtle borders
- Padding for comfortable interaction

**Selection Block:**
- Blue gradient (linear-gradient from #4a90e2 to #357abd)
- Hover effect with glow shadow
- Smooth transitions

**Handles:**
- White color for high contrast
- Hover effect changes to gold (#ffd700)
- Resize cursor (ew-resize)
- Visual indicator line in the center

**Time Label:**
- White text with shadow for readability
- Shows current selection range
- Updates in real-time during drag

## User Experience

### Workflow
1. User opens video edit modal for a clip
2. Timeline initializes showing source video duration
3. Blue block shows current begin/duration selection
4. User drags handles or middle block to adjust
5. Video player seeks to new position in real-time
6. Form inputs update automatically
7. User clicks "Apply Changes" to save

### Visual Feedback
- **Hover**: Handles turn gold, selection block glows
- **Drag**: Smooth movement with real-time updates
- **Constraints**: Cannot drag beyond valid ranges
- **Time Display**: Always shows current selection range

## Benefits

1. **Intuitive**: Visual representation is easier to understand than numeric inputs
2. **Precise**: Fine-grained control with pixel-level accuracy
3. **Fast**: Drag to adjust instead of typing numbers
4. **Visual Feedback**: See exactly what portion you're extracting
5. **Real-Time Preview**: Video updates as you drag
6. **Professional**: Matches industry-standard video editing tools

## Technical Notes

### Scale Calculation
```javascript
const trackWidth = timelineTrack.offsetWidth;
const pixelsPerSecond = trackWidth / videoDuration;
const left = begin * pixelsPerSecond;
const width = duration * pixelsPerSecond;
```

### Drag Logic
- **Left Handle**: `newBegin = currentTime`, `newDuration = (oldBegin + oldDuration) - newBegin`
- **Right Handle**: `newDuration = currentTime - begin`
- **Body**: `newBegin = oldBegin + delta`, `duration stays same`

### Real-Time Sync
```javascript
// Update video preview during drag
if (video.readyState >= 2) {
    video.currentTime = newBegin;
}
```

## Testing

Use the test file to verify functionality:
```
video-editor-app/test_clip_timeline.html
```

### Test Scenarios
1. **Load test clip** - Timeline appears with correct initial position
2. **Drag left handle** - Begin changes, duration adjusts
3. **Drag right handle** - Duration changes, begin stays same
4. **Drag middle block** - Both begin and end move together
5. **Video preview** - Player seeks to new begin position
6. **Form sync** - Input fields update automatically
7. **Constraints** - Cannot drag beyond video boundaries

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

Requires:
- CSS Grid/Flexbox support
- Mouse events (mousedown, mousemove, mouseup)
- HTML5 Video API

## Future Enhancements

Possible improvements:
- Touch support for mobile/tablet
- Zoom in/out on timeline
- Snap to keyframes
- Waveform visualization
- Multiple selection ranges
- Keyboard shortcuts (arrow keys)
- Undo/redo for timeline changes

## Related Files

- `video-editor-app/index.html` - Timeline HTML structure
- `video-editor-app/app.js` - Timeline JavaScript logic
- `video-editor-app/styles.css` - Timeline CSS styling
- `video-editor-app/test_clip_timeline.html` - Test file
