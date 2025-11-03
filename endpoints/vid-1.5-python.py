#!/usr/bin/env python3
"""
Vid-1.5 Python Implementation using MoviePy
Handles multi-clip video creation with timed captions and radial overlay support
"""

import sys
import json
import os
import requests

try:
    from moviepy.editor import VideoFileClip, ImageClip, TextClip, CompositeVideoClip, AudioFileClip, CompositeAudioClip, concatenate_videoclips
    import numpy as np
    print("MoviePy imported successfully")
except ImportError as e:
    print(f"Failed to import MoviePy: {e}")
    sys.exit(1)

def download_file(url, filepath):
    """Download a file from URL"""
    print(f"📥 Downloading: {url}")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(filepath, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    print(f"✅ Downloaded: {os.path.basename(filepath)}")

def is_image_url(url):
    """Check if URL is an image"""
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    return any(url.lower().endswith(ext) for ext in image_extensions)

def process_clip(clip_data, session_id, clip_index, temp_dir):
    """Process a single clip (video or image)"""
    clip_url = clip_data['videoUrl']
    begin_time = clip_data.get('begin', 0)  # New begin parameter for clip start position
    duration = clip_data['duration']
    volume = clip_data.get('volume', 100) / 100.0
    
    print(f"📹 Processing clip {clip_index + 1}: begin={begin_time}s, duration={duration}s")
    
    # Download or copy file
    if clip_url.startswith(('temp/', 'uploads/')):
        # Local file
        if os.path.exists(clip_url):
            source_path = clip_url
        else:
            raise FileNotFoundError(f"Local file not found: {clip_url}")
    else:
        # Remote file - download
        ext = '.jpg' if is_image_url(clip_url) else '.mp4'
        source_path = os.path.join(temp_dir, f"{session_id}-source-{clip_index}{ext}")
        download_file(clip_url, source_path)
    
    # Create video clip
    if is_image_url(clip_url) or source_path.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')):
        # Image - create video from image
        clip = ImageClip(source_path, duration=duration)
    else:
        # Video - extract segment using begin parameter
        clip = VideoFileClip(source_path).subclip(begin_time, begin_time + duration)
        
        # Adjust volume if needed
        if hasattr(clip, 'audio') and clip.audio and volume != 1.0:
            clip = clip.set_audio(clip.audio.volumex(volume))
    
    # Resize to 1080x1920 (9:16) with proper scaling
    target_size = (1080, 1920)
    
    # Calculate scaling to fit within target while maintaining aspect ratio
    clip_w, clip_h = clip.size
    target_w, target_h = target_size
    
    # Scale to fit within target dimensions
    scale_w = target_w / clip_w
    scale_h = target_h / clip_h
    scale = min(scale_w, scale_h)
    
    new_w = int(clip_w * scale)
    new_h = int(clip_h * scale)
    
    # Resize and center with black padding
    clip = clip.resize((new_w, new_h))
    clip = clip.on_color(size=target_size, color=(0, 0, 0), pos='center')
    
    return clip

def create_text_clip(text, start_time, duration, fontsize=80, color='white', position='center'):
    """Create a text clip with timing"""
    return TextClip(text, 
                   fontsize=fontsize, 
                   color=color, 
                   font='Arial-Bold',
                   stroke_color='black',
                   stroke_width=3).set_position(position).set_start(start_time).set_duration(duration)

def apply_radial_overlay(video_clip, overlay_path):
    """Apply radial overlay using multiply blend mode"""
    if not os.path.exists(overlay_path):
        print("⚠️  Overlay file not found, skipping overlay")
        return video_clip
    
    print("🎨 Applying radial overlay with multiply blend...")
    
    # Load overlay image and resize to match video
    overlay_img = ImageClip(overlay_path, duration=video_clip.duration)
    overlay_img = overlay_img.resize((1080, 1920))
    
    # Create multiply blend effect
    def multiply_blend(get_frame, t):
        video_frame = get_frame(t)
        overlay_frame = overlay_img.get_frame(t)
        
        # Convert to float for calculations
        video_float = video_frame.astype(float) / 255.0
        overlay_float = overlay_frame.astype(float) / 255.0
        
        # Apply multiply blend mode
        result = video_float * overlay_float
        
        # Convert back to uint8
        return (result * 255).astype(np.uint8)
    
    # Apply the blend effect
    blended_clip = video_clip.fl(lambda gf, t: multiply_blend(gf, t))
    
    return blended_clip

def create_video_vid15(config):
    """Main function to create vid-1.5 video"""
    print("🚀 Starting Vid-1.5 Python implementation...")
    
    # Parse configuration
    audio_path = config['audioPath']
    captions = config.get('captions', [])
    watermark = config.get('watermark', '')
    clips = config['clips']
    output_path = config['outputPath']
    overlay = config.get('overlay', False)
    session_id = config['sessionId']
    
    temp_dir = 'temp'
    os.makedirs(temp_dir, exist_ok=True)
    
    print(f"📊 Processing {len(clips)} clips, {len(captions)} captions, Overlay: {overlay}")
    
    try:
        # Process all clips
        video_clips = []
        for i, clip_data in enumerate(clips):
            processed_clip = process_clip(clip_data, session_id, i, temp_dir)
            video_clips.append(processed_clip)
        
        # Concatenate clips
        print("🔗 Concatenating clips...")
        if len(video_clips) == 1:
            final_video = video_clips[0]
        else:
            final_video = concatenate_videoclips(video_clips)
        
        # Apply radial overlay if requested
        if overlay:
            overlay_path = os.path.join('assets', 'overlay.png')
            final_video = apply_radial_overlay(final_video, overlay_path)
        
        # Add captions
        text_clips = []
        if captions:
            print(f"📝 Adding {len(captions)} captions...")
            for caption in captions:
                text = caption['text']
                start_time = caption.get('start', 0)
                duration = caption.get('duration', 3)
                
                text_clip = create_text_clip(text, start_time, duration)
                text_clips.append(text_clip)
        
        # Add watermark
        if watermark:
            print("📝 Adding watermark...")
            watermark_clip = create_text_clip(
                watermark, 
                0, 
                final_video.duration, 
                fontsize=40, 
                color='white',
                position=('center', 'bottom')
            ).set_opacity(0.4)
            text_clips.append(watermark_clip)
        
        # Composite video with text
        if text_clips:
            final_video = CompositeVideoClip([final_video] + text_clips)
        
        # Add audio
        if os.path.exists(audio_path):
            print("🎵 Adding audio...")
            audio_clip = AudioFileClip(audio_path)
            
            # Trim to match video duration
            audio_duration = min(audio_clip.duration, final_video.duration)
            final_video = final_video.set_duration(audio_duration)
            audio_clip = audio_clip.set_duration(audio_duration)
            
            # Mix audio if video has audio
            if final_video.audio:
                mixed_audio = CompositeAudioClip([final_video.audio, audio_clip])
                final_video = final_video.set_audio(mixed_audio)
            else:
                final_video = final_video.set_audio(audio_clip)
        
        # Export final video
        print("🎬 Exporting final video...")
        final_video.write_videofile(
            output_path,
            fps=24,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True
        )
        
        # Cleanup
        final_video.close()
        for clip in video_clips:
            clip.close()
        
        print("🎉 Vid-1.5 video created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating video: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python vid-1.5-python.py <config_json>")
        sys.exit(1)
    
    config_json = sys.argv[1]
    config = json.loads(config_json)
    
    success = create_video_vid15(config)
    sys.exit(0 if success else 1)