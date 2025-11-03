# Begin Parameter Implementation

## Overview
Added a new `begin` parameter to all video clip endpoints to control which part of the original video clip to start from, separate from the `start` parameter which controls timeline placement.

## Parameter Distinction

### `start` Parameter
- **Purpose**: Controls where the clip is placed on the final video timeline
- **Usage**: Timeline positioning for multi-clip videos
- **Example**: `"start": 5` means this clip appears at 5 seconds in the final video

### `begin` Parameter (NEW)
- **Purpose**: Controls which part of the original source video/clip to begin from
- **Usage**: Seeking within the source media file
- **Example**: `"begin": 10` means start extracting from 10 seconds into the source video
- **Default**: 0 (start from beginning of source)

## Updated Endpoints

### JavaScript Endpoints
- `endpoints/vid-1.2.js` - Multi-clip video creation
- `endpoints/vid-1.3.js` - Smart aspect ratio management
- `endpoints/vid-1.4.js` - Timed captions support
- `endpoints/vid-1.5.js` - Overlay and cinematic effects

### Python Endpoints
- `endpoints/vid-1.5-python.py` - MoviePy implementation

## Implementation Details

### Function Signature Changes
```javascript
// Before
async function extractClipSegment(inputPath, startTime, duration, outputPath, volume = 100)

// After  
async function extractClipSegment(inputPath, beginTime, duration, outputPath, volume = 100)
```

### Usage in Clip Processing
```javascript
// Before
await extractClipSegment(sourceVideoPath, clip.start, clip.duration, clipPath, clip.volume);

// After
await extractClipSegment(sourceVideoPath, clip.begin || 0, clip.duration, clipPath, clip.volume);
```

## Example Usage

### Single Clip with Begin Parameter
```json
{
  "clips": [
    {
      "videourl": "https://example.com/video.mp4",
      "begin": 15,     // Start extracting from 15 seconds into source video
      "duration": 10,  // Extract 10 seconds of content
      "start": 0,      // Place this clip at the beginning of final video
      "volume": 80
    }
  ]
}
```

### Multi-Clip Timeline with Begin Parameters
```json
{
  "clips": [
    {
      "videourl": "https://example.com/video1.mp4",
      "begin": 30,     // Extract from 30s mark of source
      "duration": 5,   // 5 seconds of content
      "start": 0,      // Timeline position: 0-5s
      "volume": 100
    },
    {
      "videourl": "https://example.com/video2.mp4", 
      "begin": 45,     // Extract from 45s mark of source
      "duration": 8,   // 8 seconds of content
      "start": 5,      // Timeline position: 5-13s
      "volume": 90
    }
  ]
}
```

## Backward Compatibility
- The `begin` parameter is optional and defaults to 0
- Existing clips without `begin` parameter will work unchanged
- The `start` parameter retains its original timeline positioning function

## Benefits
1. **Precise Source Control**: Extract specific segments from long source videos
2. **Timeline Flexibility**: Independent control of source extraction and timeline placement
3. **Reusability**: Use different parts of the same source video in multiple clips
4. **Efficiency**: Avoid manual pre-editing of source videos

## Technical Notes
- Uses FFmpeg `-ss` parameter for seeking to the begin position
- Maintains frame accuracy with `-avoid_negative_ts make_zero`
- Compatible with all existing volume, duration, and positioning features
- Works with both local files and remote URLs