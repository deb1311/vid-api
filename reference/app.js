// Global state
let currentData = null;
let currentFileName = '';
let timelineZoom = 100; // pixels per second
let isPlaying = false;
let currentTime = 0;
let animationFrameId = null;
let totalDuration = 0;

// Timeline interaction state
let draggedClip = null;
let resizingClip = null;
let resizeDirection = null;
let dragStartX = 0;
let dragStartTime = 0;

// Test JSON files available
const testFiles = [
    {
        name: 'style1-bottom-text-fade.json',
        description: 'Style 1 - Bottom text with fade (two-step)',
        endpoint: '/create-video-style1'
    },
    {
        name: 'style2-bottom-text-single-step.json',
        description: 'Style 2 - Bottom text with fade (single-step) - Recommended',
        endpoint: '/create-video-style2'
    },
    {
        name: 'style3-top-text-fade.json',
        description: 'Style 3 - Top text with fade (two-step)',
        endpoint: '/create-video-style3'
    },
    {
        name: 'style4-top-text-single-step.json',
        description: 'Style 4 - Top text with fade (single-step) - Recommended',
        endpoint: '/create-video-style4'
    },
    {
        name: 'vid-1-video-background.json',
        description: 'Vid-1 - Video background with top text',
        endpoint: '/create-video-vid-1'
    },
    {
        name: 'vid-1.2-multi-clip-mixed-media.json',
        description: 'Vid-1.2 - Multi-clip mixed media',
        endpoint: '/create-video-vid-1.2'
    },
    {
        name: 'vid-1.3-smart-aspect-ratio.json',
        description: 'Vid-1.3 - Smart aspect ratio with static quote',
        endpoint: '/vid-1.3'
    },
    {
        name: 'vid-1.3-timed-captions.json',
        description: 'Vid-1.3 - Timed captions with volume control',
        endpoint: '/vid-1.3'
    },
    {
        name: 'vid-1.4-captions-only.json',
        description: 'Vid-1.4 - Captions only',
        endpoint: '/vid-1.4'
    },
    {
        name: 'minimal-simple-video.json',
        description: 'Minimal - Simple video with required fields only',
        endpoint: '/create-video-style2'
    },
    {
        name: 'nature-documentary-example.json',
        description: 'Real-world - Nature documentary example',
        endpoint: '/create-video-vid-1.2'
    }
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    populateJsonModal();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('loadBtn').addEventListener('click', showJsonModal);
    document.getElementById('saveBtn').addEventListener('click', saveJson);
    document.getElementById('confirmBtn').addEventListener('click', confirmData);
    document.getElementById('closeModal').addEventListener('click', hideJsonModal);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // Preview controls
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('muteBtn').addEventListener('click', toggleMute);
    document.getElementById('previewSeeker').addEventListener('input', seekPreview);
    
    // Timeline controls
    document.getElementById('zoomIn').addEventListener('click', () => adjustZoom(1.2));
    document.getElementById('zoomOut').addEventListener('click', () => adjustZoom(0.8));
    
    // Close modal on outside click
    document.getElementById('jsonModal').addEventListener('click', (e) => {
        if (e.target.id === 'jsonModal') {
            hideJsonModal();
        }
    });
    
    // Timeline mouse events
    setupTimelineInteractions();
}

// Populate JSON modal with test files
function populateJsonModal() {
    const listContainer = document.getElementById('jsonFileList');
    listContainer.innerHTML = testFiles.map(file => `
        <div class="json-file-item" onclick="loadTestFile('${file.name}')">
            <h4><i class="fas fa-file-code"></i> ${file.name}</h4>
            <p>${file.description}</p>
            <small style="color: #3a9fd5; font-weight: 600;">${file.endpoint}</small>
        </div>
    `).join('');
    
    // Add custom file upload option
    listContainer.innerHTML += `
        <div class="json-file-item" onclick="document.getElementById('fileInput').click()" style="border: 2px dashed #3a9fd5;">
            <h4><i class="fas fa-upload"></i> Upload Custom JSON</h4>
            <p>Load your own JSON file from your computer</p>
        </div>
    `;
}

// Show/hide modal
function showJsonModal() {
    document.getElementById('jsonModal').classList.add('active');
}

function hideJsonModal() {
    document.getElementById('jsonModal').classList.remove('active');
}

// Load test file
async function loadTestFile(fileName) {
    try {
        const response = await fetch(`../test-data/${fileName}`);
        if (!response.ok) throw new Error('File not found');
        
        const data = await response.json();
        currentData = data;
        currentFileName = fileName;
        
        document.getElementById('videoTitle').value = fileName.replace('.json', '');
        renderProperties(data);
        renderTimeline(data);
        updatePreview();
        hideJsonModal();
        
        // Reset playback
        currentTime = 0;
        isPlaying = false;
        updatePlayheadPosition();
        
        showNotification('File loaded successfully!', 'success');
    } catch (error) {
        console.error('Error loading file:', error);
        showNotification('Error loading file. Make sure the test-data folder is accessible.', 'error');
    }
}

// Handle custom file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            currentData = data;
            currentFileName = file.name;
            
            document.getElementById('videoTitle').value = file.name.replace('.json', '');
            renderProperties(data);
            renderTimeline(data);
            updatePreview();
            hideJsonModal();
            
            // Reset playback
            currentTime = 0;
            isPlaying = false;
            updatePlayheadPosition();
            
            showNotification('File uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error parsing JSON:', error);
            showNotification('Invalid JSON file!', 'error');
        }
    };
    reader.readAsText(file);
}

// Render properties panel
function renderProperties(data) {
    const container = document.getElementById('propertiesContent');
    let html = '';
    
    // Text properties
    if (data.quote !== undefined) {
        html += createFormGroup('quote', 'Quote', data.quote, 'textarea', 'Main text to display on video');
    }
    
    if (data.author !== undefined) {
        html += createFormGroup('author', 'Author', data.author, 'text', 'Author name (optional)');
    }
    
    if (data.watermark !== undefined) {
        html += createFormGroup('watermark', 'Watermark', data.watermark, 'text', 'Watermark text (e.g., @username)');
    }
    
    // Media properties
    if (data.imageUrl !== undefined) {
        html += createFormGroup('imageUrl', 'Image URL', data.imageUrl, 'url', 'Background image URL');
    }
    
    if (data.videoUrl !== undefined) {
        html += createFormGroup('videoUrl', 'Video URL', data.videoUrl, 'url', 'Background video URL');
    }
    
    // Audio properties
    if (data.audioUrl !== undefined) {
        html += createFormGroup('audioUrl', 'Audio URL', data.audioUrl, 'text', 'Audio file URL or local path');
    }
    
    if (data.instagramUrl !== undefined) {
        html += createFormGroup('instagramUrl', 'Instagram URL', data.instagramUrl, 'url', 'Instagram reel URL for audio extraction');
    }
    
    // Duration
    if (data.duration !== undefined) {
        html += createFormGroup('duration', 'Duration (seconds)', data.duration, 'number', 'Max video duration in seconds');
    }
    
    // Clips
    if (data.clips && Array.isArray(data.clips)) {
        html += renderClipsSection(data.clips);
    }
    
    // Captions
    if (data.captions && Array.isArray(data.captions)) {
        html += renderCaptionsSection(data.captions);
    }
    
    container.innerHTML = html || '<div class="empty-state"><p>No properties to display</p></div>';
    
    // Attach event listeners
    attachPropertyListeners();
}

// Create form group
function createFormGroup(id, label, value, type = 'text', helpText = '') {
    const inputElement = type === 'textarea' 
        ? `<textarea id="${id}" rows="3">${value || ''}</textarea>`
        : `<input type="${type}" id="${id}" value="${value || ''}" ${type === 'number' ? 'min="0" step="0.1"' : ''}>`;
    
    return `
        <div class="form-group">
            <label for="${id}">${label}</label>
            ${inputElement}
            ${helpText ? `<small>${helpText}</small>` : ''}
        </div>
    `;
}

// Render clips section
function renderClipsSection(clips) {
    let html = `
        <div class="clips-section">
            <div class="clips-header">
                <h3><i class="fas fa-film"></i> Clips (${clips.length})</h3>
                <button class="btn-small" onclick="addClip()">
                    <i class="fas fa-plus"></i> Add Clip
                </button>
            </div>
            <div id="clipsContainer">
    `;
    
    clips.forEach((clip, index) => {
        html += `
            <div class="clip-item" data-index="${index}">
                <div class="clip-item-header">
                    <span><i class="fas fa-video"></i> Clip ${index + 1}</span>
                    <div class="clip-item-actions">
                        <button class="btn-icon" onclick="moveClip(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="btn-icon" onclick="moveClip(${index}, 1)" ${index === clips.length - 1 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteClip(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="clip-field">
                    <label>Video/Image URL</label>
                    <input type="text" value="${clip.videoUrl || ''}" onchange="updateClip(${index}, 'videoUrl', this.value)">
                </div>
                <div class="clip-field">
                    <label>Start Time (seconds)</label>
                    <input type="number" value="${clip.start || 0}" min="0" step="0.1" onchange="updateClip(${index}, 'start', parseFloat(this.value))">
                </div>
                <div class="clip-field">
                    <label>Duration (seconds)</label>
                    <input type="number" value="${clip.duration || ''}" min="0" step="0.1" onchange="updateClip(${index}, 'duration', parseFloat(this.value) || undefined)">
                </div>
                ${clip.volume !== undefined ? `
                <div class="clip-field">
                    <label>Volume (%)</label>
                    <input type="number" value="${clip.volume}" min="0" max="200" onchange="updateClip(${index}, 'volume', parseInt(this.value))">
                </div>
                ` : ''}
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Render captions section
function renderCaptionsSection(captions) {
    let html = `
        <div class="captions-section">
            <div class="clips-header">
                <h3><i class="fas fa-closed-captioning"></i> Captions (${captions.length})</h3>
                <button class="btn-small" onclick="addCaption()" style="background: #ff9800;">
                    <i class="fas fa-plus"></i> Add Caption
                </button>
            </div>
            <div id="captionsContainer">
    `;
    
    captions.forEach((caption, index) => {
        html += `
            <div class="caption-item" data-index="${index}">
                <div class="clip-item-header">
                    <span><i class="fas fa-comment"></i> Caption ${index + 1}</span>
                    <div class="clip-item-actions">
                        <button class="btn-icon" onclick="moveCaption(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="btn-icon" onclick="moveCaption(${index}, 1)" ${index === captions.length - 1 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteCaption(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="clip-field">
                    <label>Caption Text</label>
                    <input type="text" value="${caption.text || ''}" onchange="updateCaption(${index}, 'text', this.value)">
                </div>
                <div class="clip-field">
                    <label>Start Time (seconds)</label>
                    <input type="number" value="${caption.start || 0}" min="0" step="0.1" onchange="updateCaption(${index}, 'start', parseFloat(this.value))">
                </div>
                <div class="clip-field">
                    <label>Duration (seconds)</label>
                    <input type="number" value="${caption.duration || ''}" min="0" step="0.1" onchange="updateCaption(${index}, 'duration', parseFloat(this.value) || undefined)">
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Render timeline
function renderTimeline(data) {
    const videoTimeline = document.getElementById('videoTimeline');
    const textTimeline = document.getElementById('textTimeline');
    const audioTimeline = document.getElementById('audioTimeline');
    
    // Clear timelines
    videoTimeline.innerHTML = '';
    textTimeline.innerHTML = '';
    audioTimeline.innerHTML = '';
    
    // Calculate total duration
    totalDuration = 0;
    
    // Render video clips
    if (data.clips && Array.isArray(data.clips)) {
        data.clips.forEach((clip, index) => {
            const start = clip.start || 0;
            const duration = clip.duration || 5;
            const end = start + duration;
            totalDuration = Math.max(totalDuration, end);
            
            const clipEl = createTimelineClipElement(clip, index, 'clip', start, duration);
            videoTimeline.appendChild(clipEl);
        });
    } else if (data.imageUrl || data.videoUrl) {
        const duration = data.duration || 10;
        totalDuration = Math.max(totalDuration, duration);
        
        const clipEl = document.createElement('div');
        clipEl.className = 'timeline-clip';
        clipEl.style.left = '0px';
        clipEl.style.width = `${duration * timelineZoom}px`;
        clipEl.innerHTML = `<i class="fas fa-${data.imageUrl ? 'image' : 'video'}"></i> Media (${duration}s)`;
        videoTimeline.appendChild(clipEl);
    }
    
    // Render captions on separate track
    if (data.captions && Array.isArray(data.captions)) {
        data.captions.forEach((caption, index) => {
            const start = caption.start || 0;
            const duration = caption.duration || 3;
            const end = start + duration;
            totalDuration = Math.max(totalDuration, end);
            
            const clipEl = createTimelineClipElement(caption, index, 'caption', start, duration);
            textTimeline.appendChild(clipEl);
        });
    }
    
    // Render audio
    if (data.audioUrl || data.instagramUrl) {
        const duration = data.duration || 15;
        totalDuration = Math.max(totalDuration, duration);
        
        const audioEl = document.createElement('div');
        audioEl.className = 'timeline-clip audio';
        audioEl.style.left = '0px';
        audioEl.style.width = `${duration * timelineZoom}px`;
        audioEl.innerHTML = `<i class="fas fa-music"></i> Audio (${duration}s)`;
        audioTimeline.appendChild(audioEl);
    }
    
    // Set minimum width for timeline content
    const minWidth = Math.max(totalDuration * timelineZoom, videoTimeline.parentElement.clientWidth);
    videoTimeline.style.minWidth = minWidth + 'px';
    textTimeline.style.minWidth = minWidth + 'px';
    audioTimeline.style.minWidth = minWidth + 'px';
    
    // Update time display
    document.getElementById('totalTime').textContent = formatTime(totalDuration);
    
    // Create ruler
    createTimelineRuler(totalDuration);
    
    // Show empty state if no content
    if (!videoTimeline.children.length) {
        videoTimeline.innerHTML = '<div style="color: #666; padding: 8px;">No video clips</div>';
    }
    if (!textTimeline.children.length) {
        textTimeline.innerHTML = '<div style="color: #666; padding: 8px;">No captions</div>';
    }
    if (!audioTimeline.children.length) {
        audioTimeline.innerHTML = '<div style="color: #666; padding: 8px;">No audio</div>';
    }
}

function createTimelineClipElement(item, index, type, start, duration) {
    const clipEl = document.createElement('div');
    clipEl.className = `timeline-clip ${type === 'caption' ? 'caption' : ''}`;
    clipEl.style.left = (start * timelineZoom) + 'px';
    clipEl.style.width = (duration * timelineZoom) + 'px';
    clipEl.dataset.index = index;
    clipEl.dataset.type = type;
    
    // Content
    if (type === 'clip') {
        clipEl.innerHTML = `
            <i class="fas fa-video"></i> 
            <span>Clip ${index + 1} (${duration.toFixed(1)}s)</span>
            <div class="timeline-clip-resize-handle left"></div>
            <div class="timeline-clip-resize-handle right"></div>
        `;
    } else if (type === 'caption') {
        const text = item.text || '';
        clipEl.innerHTML = `
            <i class="fas fa-comment"></i> 
            <span>${text.substring(0, 15)}${text.length > 15 ? '...' : ''}</span>
            <div class="timeline-clip-resize-handle left"></div>
            <div class="timeline-clip-resize-handle right"></div>
        `;
    }
    
    // Drag to move
    clipEl.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('timeline-clip-resize-handle')) {
            // Handle resize
            const clip = type === 'clip' ? currentData.clips[index] : currentData.captions[index];
            resizingClip = { 
                element: clipEl, 
                index, 
                type,
                originalStart: clip.start || 0,
                originalDuration: clip.duration || 5
            };
            resizeDirection = e.target.classList.contains('left') ? 'left' : 'right';
            dragStartX = e.clientX;
            dragStartTime = start;
            document.body.style.cursor = 'ew-resize';
            e.stopPropagation();
        } else {
            // Handle drag
            draggedClip = { 
                element: clipEl, 
                index, 
                type,
                originalStart: start
            };
            dragStartX = e.clientX;
            dragStartTime = start;
            clipEl.classList.add('dragging');
            document.body.style.cursor = 'move';
        }
    });
    
    // Click to select
    clipEl.addEventListener('click', (e) => {
        document.querySelectorAll('.timeline-clip').forEach(el => el.classList.remove('selected'));
        clipEl.classList.add('selected');
    });
    
    return clipEl;
}

// Attach property listeners
function attachPropertyListeners() {
    const inputs = document.querySelectorAll('#propertiesContent input, #propertiesContent textarea');
    inputs.forEach(input => {
        if (!input.hasAttribute('onchange')) {
            input.addEventListener('change', (e) => {
                const field = e.target.id;
                let value = e.target.value;
                
                if (e.target.type === 'number') {
                    value = parseFloat(value) || undefined;
                }
                
                if (currentData) {
                    currentData[field] = value;
                    renderTimeline(currentData);
                    updatePreview();
                }
            });
        }
    });
}

// Clip management functions
function addClip() {
    if (!currentData.clips) currentData.clips = [];
    
    // Find a gap to place the new clip
    let newStart = 0;
    if (currentData.clips.length > 0) {
        // Sort clips by start time
        const sorted = [...currentData.clips].sort((a, b) => (a.start || 0) - (b.start || 0));
        const lastClip = sorted[sorted.length - 1];
        newStart = (lastClip.start || 0) + (lastClip.duration || 5);
    }
    
    currentData.clips.push({
        videoUrl: '',
        start: newStart,
        duration: 5,
        volume: currentData.clips.some(c => c.volume !== undefined) ? 100 : undefined
    });
    renderProperties(currentData);
    renderTimeline(currentData);
    showNotification('Clip added at ' + formatTime(newStart), 'success');
}

function updateClip(index, field, value) {
    if (currentData.clips && currentData.clips[index]) {
        currentData.clips[index][field] = value;
        renderTimeline(currentData);
        updatePreview();
    }
}

function deleteClip(index) {
    if (currentData.clips && confirm('Delete this clip?')) {
        currentData.clips.splice(index, 1);
        renderProperties(currentData);
        renderTimeline(currentData);
    }
}

function moveClip(index, direction) {
    if (!currentData.clips) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentData.clips.length) return;
    
    [currentData.clips[index], currentData.clips[newIndex]] = 
    [currentData.clips[newIndex], currentData.clips[index]];
    
    renderProperties(currentData);
    renderTimeline(currentData);
}

// Caption management functions
function addCaption() {
    if (!currentData.captions) currentData.captions = [];
    
    // Find a gap to place the new caption
    let newStart = 0;
    if (currentData.captions.length > 0) {
        // Sort captions by start time
        const sorted = [...currentData.captions].sort((a, b) => (a.start || 0) - (b.start || 0));
        const lastCaption = sorted[sorted.length - 1];
        newStart = (lastCaption.start || 0) + (lastCaption.duration || 3);
    }
    
    currentData.captions.push({
        text: 'New Caption',
        start: newStart,
        duration: 3
    });
    renderProperties(currentData);
    renderTimeline(currentData);
    showNotification('Caption added at ' + formatTime(newStart), 'success');
}

function updateCaption(index, field, value) {
    if (currentData.captions && currentData.captions[index]) {
        currentData.captions[index][field] = value;
        renderTimeline(currentData);
        updatePreview();
    }
}

function deleteCaption(index) {
    if (currentData.captions && confirm('Delete this caption?')) {
        currentData.captions.splice(index, 1);
        renderProperties(currentData);
        renderTimeline(currentData);
    }
}

function moveCaption(index, direction) {
    if (!currentData.captions) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentData.captions.length) return;
    
    [currentData.captions[index], currentData.captions[newIndex]] = 
    [currentData.captions[newIndex], currentData.captions[index]];
    
    renderProperties(currentData);
    renderTimeline(currentData);
}

// Save JSON
function saveJson() {
    if (!currentData) {
        showNotification('No data to save!', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(currentData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName || 'video-config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('JSON file saved!', 'success');
}

// Confirm data
function confirmData() {
    if (!currentData) {
        showNotification('No data to confirm!', 'error');
        return;
    }
    
    console.log('Confirmed data:', currentData);
    showNotification('Data confirmed! Ready for backend integration.', 'success');
    
    // In future, this will send data to backend
    // For now, just show the data in console
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 16px 24px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Preview functionality
function updatePreview() {
    if (!currentData) return;
    
    const placeholder = document.getElementById('previewPlaceholder');
    const canvas = document.getElementById('previewCanvas');
    const video = document.getElementById('previewVideo');
    const image = document.getElementById('previewImage');
    const overlay = document.getElementById('previewOverlay');
    
    // Update text overlays
    document.getElementById('previewQuote').textContent = currentData.quote || '';
    document.getElementById('previewAuthor').textContent = currentData.author || '';
    document.getElementById('previewWatermark').textContent = currentData.watermark || '';
    
    // Show overlay if there's text
    if (currentData.quote || currentData.author || currentData.watermark) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
    
    // Load media
    if (currentData.imageUrl) {
        placeholder.style.display = 'none';
        image.style.display = 'block';
        image.src = currentData.imageUrl;
        enablePreviewControls();
    } else if (currentData.videoUrl) {
        placeholder.style.display = 'none';
        video.style.display = 'block';
        video.src = currentData.videoUrl;
        video.load();
        enablePreviewControls();
    } else if (currentData.clips && currentData.clips.length > 0) {
        // Load first clip
        const firstClip = currentData.clips[0];
        if (firstClip.videoUrl) {
            const isVideo = /\.(mp4|webm|mov|avi)$/i.test(firstClip.videoUrl);
            placeholder.style.display = 'none';
            
            if (isVideo) {
                video.style.display = 'block';
                video.src = firstClip.videoUrl;
                video.load();
            } else {
                image.style.display = 'block';
                image.src = firstClip.videoUrl;
            }
            enablePreviewControls();
        }
    }
    
    // Update captions based on current time
    updateCaptionDisplay();
}

function updateCaptionDisplay() {
    if (!currentData || !currentData.captions) return;
    
    const quoteEl = document.getElementById('previewQuote');
    const activeCaption = currentData.captions.find(cap => {
        const start = cap.start || 0;
        const duration = cap.duration || 3;
        return currentTime >= start && currentTime < start + duration;
    });
    
    if (activeCaption && currentData.captions) {
        quoteEl.textContent = activeCaption.text;
    } else if (!currentData.quote) {
        quoteEl.textContent = '';
    }
}

function enablePreviewControls() {
    document.getElementById('playPauseBtn').disabled = false;
    document.getElementById('muteBtn').disabled = false;
    document.getElementById('previewSeeker').disabled = false;
}

function togglePlayPause() {
    if (isPlaying) {
        pausePreview();
    } else {
        playPreview();
    }
}

function playPreview() {
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    
    const video = document.getElementById('previewVideo');
    if (video.style.display === 'block') {
        video.play();
    }
    
    animatePlayhead();
}

function pausePreview() {
    isPlaying = false;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    
    const video = document.getElementById('previewVideo');
    if (video.style.display === 'block') {
        video.pause();
    }
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

function animatePlayhead() {
    if (!isPlaying) return;
    
    currentTime += 0.016; // ~60fps
    if (currentTime >= totalDuration) {
        currentTime = 0;
    }
    
    updatePlayheadPosition();
    updateCaptionDisplay();
    
    animationFrameId = requestAnimationFrame(animatePlayhead);
}

function updatePlayheadPosition() {
    const playheads = document.querySelectorAll('.timeline-playhead');
    const position = currentTime * timelineZoom;
    
    playheads.forEach(playhead => {
        playhead.style.left = position + 'px';
    });
    
    // Update time displays
    document.getElementById('currentTime').textContent = formatTime(currentTime);
    document.getElementById('playheadTime').textContent = formatTime(currentTime);
    
    const seeker = document.getElementById('previewSeeker');
    if (totalDuration > 0) {
        seeker.value = (currentTime / totalDuration) * 100;
    }
}

function seekPreview(e) {
    const percent = e.target.value / 100;
    currentTime = totalDuration * percent;
    updatePlayheadPosition();
    updateCaptionDisplay();
    
    const video = document.getElementById('previewVideo');
    if (video.style.display === 'block') {
        video.currentTime = currentTime;
    }
}

function toggleMute() {
    const video = document.getElementById('previewVideo');
    const btn = document.getElementById('muteBtn');
    
    if (video.muted) {
        video.muted = false;
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
        video.muted = true;
        btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Timeline zoom
function adjustZoom(factor) {
    timelineZoom = Math.max(20, Math.min(500, timelineZoom * factor));
    document.getElementById('zoomLevel').textContent = Math.round((timelineZoom / 100) * 100);
    renderTimeline(currentData);
}

// Timeline interactions
function setupTimelineInteractions() {
    document.addEventListener('mousemove', handleTimelineMouseMove);
    document.addEventListener('mouseup', handleTimelineMouseUp);
}

function handleTimelineMouseMove(e) {
    if (draggedClip) {
        handleClipDrag(e);
    } else if (resizingClip) {
        handleClipResize(e);
    }
}

function handleTimelineMouseUp() {
    if (draggedClip) {
        draggedClip.element.classList.remove('dragging');
        
        // Validate final position (no overlaps)
        const isValid = validateClipPosition(draggedClip);
        if (!isValid) {
            // Revert to original position
            if (draggedClip.type === 'clip') {
                currentData.clips[draggedClip.index].start = draggedClip.originalStart;
            } else if (draggedClip.type === 'caption') {
                currentData.captions[draggedClip.index].start = draggedClip.originalStart;
            }
            showNotification('Cannot overlap clips on the same track!', 'error');
            renderTimeline(currentData);
            renderProperties(currentData);
        }
        
        draggedClip = null;
    }
    
    if (resizingClip) {
        // Validate final size (no overlaps)
        const isValid = validateClipPosition(resizingClip);
        if (!isValid) {
            // Revert to original size
            if (resizingClip.type === 'clip') {
                currentData.clips[resizingClip.index].start = resizingClip.originalStart;
                currentData.clips[resizingClip.index].duration = resizingClip.originalDuration;
            } else if (resizingClip.type === 'caption') {
                currentData.captions[resizingClip.index].start = resizingClip.originalStart;
                currentData.captions[resizingClip.index].duration = resizingClip.originalDuration;
            }
            showNotification('Cannot overlap clips on the same track!', 'error');
            renderTimeline(currentData);
            renderProperties(currentData);
        }
        
        resizingClip = null;
        resizeDirection = null;
    }
    
    document.body.style.cursor = '';
}

function handleClipDrag(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / timelineZoom;
    let newStart = Math.max(0, dragStartTime + deltaTime);
    
    // Get current clip
    const clip = draggedClip.type === 'clip' 
        ? currentData.clips[draggedClip.index]
        : currentData.captions[draggedClip.index];
    
    const duration = clip.duration || 5;
    
    // Update clip position
    if (draggedClip.type === 'clip') {
        currentData.clips[draggedClip.index].start = parseFloat(newStart.toFixed(2));
    } else if (draggedClip.type === 'caption') {
        currentData.captions[draggedClip.index].start = parseFloat(newStart.toFixed(2));
    }
    
    // Update visual position
    draggedClip.element.style.left = (newStart * timelineZoom) + 'px';
    
    // Visual feedback for collision
    const hasCollision = checkCollision(newStart, duration, draggedClip.index, draggedClip.type);
    if (hasCollision) {
        draggedClip.element.classList.add('collision-warning');
        draggedClip.element.style.borderColor = '#f44336';
    } else {
        draggedClip.element.classList.remove('collision-warning');
        draggedClip.element.style.borderColor = '#ffd700';
    }
}

function handleClipResize(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / timelineZoom;
    
    const clip = resizingClip.type === 'clip' 
        ? currentData.clips[resizingClip.index]
        : currentData.captions[resizingClip.index];
    
    if (resizeDirection === 'left') {
        let newStart = Math.max(0, dragStartTime + deltaTime);
        const oldEnd = resizingClip.originalStart + resizingClip.originalDuration;
        let newDuration = oldEnd - newStart;
        
        if (newDuration > 0.5) {
            // Check collision
            const hasCollision = checkCollision(newStart, newDuration, resizingClip.index, resizingClip.type);
            if (!hasCollision) {
                clip.start = parseFloat(newStart.toFixed(2));
                clip.duration = parseFloat(newDuration.toFixed(2));
            }
        }
    } else if (resizeDirection === 'right') {
        let newDuration = Math.max(0.5, resizingClip.originalDuration + deltaTime);
        
        // Check collision
        const hasCollision = checkCollision(clip.start, newDuration, resizingClip.index, resizingClip.type);
        if (!hasCollision) {
            clip.duration = parseFloat(newDuration.toFixed(2));
        }
    }
    
    // Re-render timeline
    renderTimeline(currentData);
    renderProperties(currentData);
}

// Collision detection
function checkCollision(start, duration, currentIndex, type) {
    const end = start + duration;
    const clips = type === 'clip' ? currentData.clips : currentData.captions;
    
    if (!clips) return false;
    
    for (let i = 0; i < clips.length; i++) {
        if (i === currentIndex) continue;
        
        const otherClip = clips[i];
        const otherStart = otherClip.start || 0;
        const otherDuration = otherClip.duration || 5;
        const otherEnd = otherStart + otherDuration;
        
        // Check if ranges overlap
        if (start < otherEnd && end > otherStart) {
            return true;
        }
    }
    
    return false;
}

function findNearestValidPosition(desiredStart, duration, currentIndex, type) {
    const clips = type === 'clip' ? currentData.clips : currentData.captions;
    if (!clips) return desiredStart;
    
    // If no collision, return desired position
    if (!checkCollision(desiredStart, duration, currentIndex, type)) {
        return desiredStart;
    }
    
    // Find gaps between clips
    const sortedClips = clips
        .map((clip, index) => ({
            start: clip.start || 0,
            duration: clip.duration || 5,
            index
        }))
        .filter(clip => clip.index !== currentIndex)
        .sort((a, b) => a.start - b.start);
    
    // Try to snap to end of previous clip
    for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        const snapPosition = clip.start + clip.duration;
        
        // Check if this position works
        if (Math.abs(snapPosition - desiredStart) < 2) { // Within 2 seconds
            if (!checkCollision(snapPosition, duration, currentIndex, type)) {
                return snapPosition;
            }
        }
    }
    
    // Try to snap to start of next clip
    for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        const snapPosition = clip.start - duration;
        
        if (snapPosition >= 0 && Math.abs(snapPosition - desiredStart) < 2) {
            if (!checkCollision(snapPosition, duration, currentIndex, type)) {
                return snapPosition;
            }
        }
    }
    
    return desiredStart;
}

function validateClipPosition(clipInfo) {
    const clip = clipInfo.type === 'clip' 
        ? currentData.clips[clipInfo.index]
        : currentData.captions[clipInfo.index];
    
    const start = clip.start || 0;
    const duration = clip.duration || 5;
    
    return !checkCollision(start, duration, clipInfo.index, clipInfo.type);
}

function createTimelineRuler(duration) {
    const ruler = document.getElementById('timelineRuler');
    if (!ruler) return;
    
    ruler.innerHTML = '';
    const step = timelineZoom >= 100 ? 1 : timelineZoom >= 50 ? 2 : 5;
    
    for (let i = 0; i <= duration; i += step) {
        const mark = document.createElement('div');
        mark.className = 'timeline-ruler-mark';
        mark.style.left = (i * timelineZoom) + 'px';
        mark.textContent = formatTime(i);
        ruler.appendChild(mark);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
