// Critical fixes for the video editor
// This file contains the corrected functions to fix playhead, timeline, and play button issues

// 1. Fixed updatePlayheadPosition function
function updatePlayheadPosition() {
    const playhead = document.getElementById('globalPlayhead');
    if (!playhead) return;
    
    // Get the actual timeline container position
    const timelineArea = document.querySelector('.timeline-area');
    const trackLabel = document.querySelector('.track-label');
    
    let baseOffset = 150; // Default track label width
    
    // Try to get actual track label width
    if (trackLabel) {
        baseOffset = trackLabel.offsetWidth;
    }
    
    // Calculate position relative to timeline start
    const position = baseOffset + (this.currentTime * this.timelineZoom);
    playhead.style.left = `${position}px`;
    
    console.log(`🎯 Playhead positioned at ${position}px (time: ${this.currentTime.toFixed(2)}s)`);
}

// 2. Fixed createTimelineClip function
function createTimelineClip(item, index, type) {
    // Use 'begin' property first, then fallback to 'start'
    const start = item.begin !== undefined ? item.begin : (item.start || 0);
    const duration = item.duration || (type === 'text' ? 3 : 5);

    const clipEl = document.createElement('div');
    clipEl.className = `timeline-clip ${type === 'text' ? 'caption' : ''}`;
    
    // Position based on begin time
    clipEl.style.left = `${start * this.timelineZoom}px`;
    clipEl.style.width = `${duration * this.timelineZoom}px`;
    clipEl.dataset.index = index;
    clipEl.dataset.type = type;

    // Add content based on type
    if (type === 'video') {
        clipEl.innerHTML = `
            <div class="timeline-clip-resize-handle left"></div>
            <i class="fas fa-${item.videourl ? 'video' : 'image'}"></i> 
            <span>Clip ${index + 1} (${duration.toFixed(1)}s)</span>
            <div class="timeline-clip-resize-handle right"></div>
        `;
    } else if (type === 'text') {
        const text = item.text || '';
        clipEl.innerHTML = `
            <div class="timeline-clip-resize-handle left"></div>
            <i class="fas fa-comment"></i> 
            <span>${text.substring(0, 15)}${text.length > 15 ? '...' : ''}</span>
            <div class="timeline-clip-resize-handle right"></div>
        `;
    }

    // Setup interactions
    this.setupClipInteractions(clipEl, item, index, type);
    return clipEl;
}

// 3. Fixed setupClipInteractions function
function setupClipInteractions(clipEl, item, index, type) {
    clipEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('timeline-clip-resize-handle')) return;
        e.stopPropagation();

        // Remove selection from all clips
        document.querySelectorAll('.timeline-clip').forEach(el => el.classList.remove('selected'));
        clipEl.classList.add('selected');

        // Jump playhead to clip start position - use 'begin' first
        const startTime = item.begin !== undefined ? item.begin : (item.start || 0);
        this.currentTime = startTime;
        this.updatePlayheadPosition();
        this.updateTimeDisplay();

        console.log(`🎯 Jumped to ${type} clip at ${this.currentTime}s`);
    });

    clipEl.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('timeline-clip-resize-handle')) return;
        
        // For video clips, open edit modal
        if (type === 'video') {
            this.editVideoClip(index);
        } else {
            // For text clips, jump to start
            const startTime = item.begin !== undefined ? item.begin : (item.start || 0);
            this.currentTime = startTime;
            this.updatePlayheadPosition();
            this.updateTimeDisplay();
        }
    });

    this.makeDraggable(clipEl, item, index, type);
    this.makeResizable(clipEl, item, index, type);
}

// 4. Fixed togglePlayPause function
function togglePlayPause() {
    if (!this.currentData) {
        this.showNotification('No video loaded!', 'error');
        return;
    }

    this.isPlaying = !this.isPlaying;
    
    // Update button icons
    const btn = document.getElementById('playPauseBtn');
    const fullscreenBtn = document.getElementById('fullscreenPlayPauseBtn');

    if (btn && fullscreenBtn) {
        const iconHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        btn.innerHTML = iconHTML;
        fullscreenBtn.innerHTML = iconHTML;
    }

    // Reset to beginning if at end
    if (this.isPlaying && this.currentTime >= this.totalDuration) {
        this.currentTime = 0;
    }

    // Handle audio playback
    try {
        this.handleAudioPlayback();
    } catch (error) {
        console.warn('🎵 Audio playback failed, continuing without audio:', error);
        this.audioElement = null;
    }

    console.log(`🎬 Playback ${this.isPlaying ? 'started' : 'paused'} at ${this.currentTime.toFixed(1)}s`);
}

// 5. Fixed renderTimeline function
function renderTimeline() {
    if (!this.currentData) {
        console.log('⚠️ No data to render timeline');
        return;
    }

    console.log('🎬 Rendering timeline...');
    
    this.renderVideoTimeline();
    this.renderTextTimeline();
    this.renderAudioTimeline();

    // Show and position playhead
    const playhead = document.getElementById('globalPlayhead');
    if (playhead) {
        playhead.style.display = 'block';
        this.updatePlayheadPosition();
    }
    
    console.log('✅ Timeline rendered successfully');
}

// 6. Enhanced startRenderLoop function
function startRenderLoop() {
    console.log('🎬 Starting render loop...');
    
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const render = (currentTime) => {
        if (currentTime - lastFrameTime >= frameInterval) {
            if (this.isPlaying && this.currentTime < this.totalDuration) {
                const deltaTime = (currentTime - lastFrameTime) / 1000;
                this.currentTime += deltaTime;

                if (this.currentTime >= this.totalDuration) {
                    this.currentTime = this.totalDuration;
                    this.isPlaying = false;
                    
                    // Update play button
                    const btn = document.getElementById('playPauseBtn');
                    const fullscreenBtn = document.getElementById('fullscreenPlayPauseBtn');
                    if (btn && fullscreenBtn) {
                        const iconHTML = '<i class="fas fa-play"></i>';
                        btn.innerHTML = iconHTML;
                        fullscreenBtn.innerHTML = iconHTML;
                    }
                }

                this.updateTimeDisplay();
                this.updatePlayheadPosition();
            }

            this.renderFrame();
            lastFrameTime = currentTime;
        }

        requestAnimationFrame(render);
    };
    
    render(0);
}

// Instructions for applying fixes:
console.log(`
🔧 EDITOR FIXES LOADED

To apply these fixes to your VideoEditor class:

1. Replace the updatePlayheadPosition method
2. Replace the createTimelineClip method  
3. Replace the setupClipInteractions method
4. Replace the togglePlayPause method
5. Replace the renderTimeline method
6. Replace the startRenderLoop method

These fixes address:
✅ Playhead positioning issues
✅ Timeline clip placement using 'begin' property
✅ Play button functionality
✅ Click interactions on timeline clips
✅ Proper timeline rendering

Copy and paste each function into your VideoEditor class to fix the issues.
`);