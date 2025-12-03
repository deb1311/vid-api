# Audio Rendering Fix

## Problem
Videos were sometimes rendering without audio even though the preview showed audio correctly. This was happening specifically with the vid-1, vid-1.2, and vid-1.3 endpoints.

## Root Cause
The issue was in the `addAudioToVideo` functions in these endpoints:

1. **Re-encoding video unnecessarily**: Using `-c:v libx264` forces FFmpeg to re-encode the entire video stream, which can cause audio sync issues or audio being dropped
2. **Missing audio stream mapping**: When the concatenated video clips had no audio, the background audio wasn't being properly mapped to the output
3. **No audio stream detection**: The code didn't check if the video already had audio from the clips, potentially causing conflicts

## Solution
Updated the audio handling in three endpoints to match the working implementation in vid-1.4 and vid-1.5:

### Files Modified
- `endpoints/vid-1.js` - Fixed `createVideoWithoutFade` function
- `endpoints/vid-1.2.js` - Fixed `addAudioToVideo` function  
- `endpoints/vid-1.3.js` - Fixed `addAudioToVideo` function

### Key Changes

1. **Check for existing audio**: Use ffprobe to detect if the video already has an audio stream
2. **Mix audio streams when needed**: If video has audio, use `amix` filter to mix video audio with background audio
3. **Copy video stream**: Use `-c:v copy` instead of re-encoding to preserve video quality and avoid sync issues
4. **Explicit stream mapping**: Use `-map 0:v -map 1:a` to explicitly map video and audio streams when video has no audio

### Before (Broken)
```javascript
const args = [
  '-i', videoPath,
  '-i', audioPath,
  '-c:v', 'libx264',  // ❌ Re-encodes video
  '-c:a', 'aac',
  '-b:a', '128k',
  '-t', duration.toString(),
  '-pix_fmt', 'yuv420p',
  '-y', outputPath
];
```

### After (Fixed)
```javascript
// Check if video has audio first
const ffprobe = spawn('ffprobe', [
  '-v', 'quiet',
  '-select_streams', 'a',
  '-show_entries', 'stream=codec_type',
  '-of', 'csv=p=0',
  videoPath
]);

// Then choose appropriate command
if (hasAudio) {
  // Mix both audio streams
  args = [
    '-i', videoPath,
    '-i', audioPath,
    '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2',
    '-c:v', 'copy',  // ✅ Copy video stream
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', duration.toString(),
    '-y', outputPath
  ];
} else {
  // Just add background audio
  args = [
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',  // ✅ Copy video stream
    '-c:a', 'aac',
    '-b:a', '192k',
    '-map', '0:v',   // ✅ Explicit mapping
    '-map', '1:a',
    '-t', duration.toString(),
    '-y', outputPath
  ];
}
```

## Benefits

1. **Reliable audio**: Audio is now consistently included in rendered videos
2. **Faster rendering**: No unnecessary video re-encoding
3. **Better quality**: Original video quality is preserved
4. **Proper audio mixing**: When clips have audio, it's mixed with background audio instead of being replaced

## Testing
Test with videos that:
- Have audio in the clips (should mix with background audio)
- Have no audio in the clips (should add background audio)
- Use different video codecs and formats
- Have varying durations

The preview and rendered output should now match perfectly in terms of audio.
