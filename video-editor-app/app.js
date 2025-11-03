// Professional Video Editor with Canvas Preview (matches backend rendering)
class VideoEditor {
    constructor() {
        this.currentData = null;
        this.currentFileName = '';
        this.timelineZoom = 60; // pixels per second
        this.isPlaying = false;
        this.currentTime = 0;
        this.totalDuration = 0;
        this.animationFrameId = null;
        this.audioDisabled = false; // Flag to disable audio if it causes issues

        // Canvas setup for 9:16 aspect ratio (matching backend 1080x1920)
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        if (this.canvas) {
            // Use full resolution for crisp text
            this.canvas.width = 1080; // Full backend resolution
            this.canvas.height = 1920; // Full backend resolution

            // Enable image smoothing for better media rendering
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';

            // Set text rendering for better quality
            this.ctx.textRendering = 'optimizeLegibility';

            console.log('🎨 Canvas initialized:', this.canvas.width + 'x' + this.canvas.height);
        }

        // Media cache
        this.loadedImages = new Map();
        this.loadedVideos = new Map();

        // Audio elements for preview playback
        this.audioElement = null;
        this.audioStartTime = 0;

        // Webhook settings
        this.webhookUrl = localStorage.getItem('webhookUrl') || 'https://n8n.ncertbot.fun/webhook/90aa23d0-a017-4833-8dee-6fd0a591c1bf';

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.populateJsonModal();
        this.startRenderLoop();
        this.loadFromLocalStorage();
        this.updateButtonLabels(); // Initialize button labels
    }

    setupEventListeners() {
        // Helper function to safely add event listeners
        const safeAddListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`⚠️ Element with id '${id}' not found, skipping event listener`);
            }
        };

        safeAddListener('loadBtn', 'click', async () => await this.showJsonModal());
        safeAddListener('saveBtn', 'click', async () => await this.saveJson());
        safeAddListener('confirmBtn', 'click', async () => await this.confirmData());
        safeAddListener('webhookSettingsBtn', 'click', () => this.showWebhookModal());
        safeAddListener('closeModal', 'click', () => this.hideJsonModal());
        safeAddListener('closeWebhookModal', 'click', () => this.hideWebhookModal());
        safeAddListener('saveWebhookSettings', 'click', () => this.saveWebhookSettings());
        safeAddListener('testWebhookBtn', 'click', () => this.testWebhook());
        safeAddListener('cancelWebhookSettings', 'click', () => this.hideWebhookModal());
        safeAddListener('refreshJsonBtn', 'click', async () => {
            this.showNotification('Refreshing Notion records...', 'info');
            await this.populateJsonModal();
            this.showNotification('Records refreshed!', 'success');
        });
        safeAddListener('fileInput', 'change', (e) => this.handleFileUpload(e));

        safeAddListener('playPauseBtn', 'click', () => this.togglePlayPause());
        safeAddListener('fullscreenBtn', 'click', () => this.showFullscreenModal());
        safeAddListener('audioTestBtn', 'click', () => this.testAudioLoading());

        safeAddListener('jsonModal', 'click', (e) => {
            if (e.target.id === 'jsonModal') this.hideJsonModal();
        });

        safeAddListener('webhookModal', 'click', (e) => {
            if (e.target.id === 'webhookModal') this.hideWebhookModal();
        });

        safeAddListener('fullscreenModal', 'click', (e) => {
            if (e.target.id === 'fullscreenModal') this.hideFullscreenModal();
        });

        safeAddListener('closeFullscreenModal', 'click', () => this.hideFullscreenModal());
        safeAddListener('fullscreenPlayPauseBtn', 'click', () => this.togglePlayPause());

        // Add reset button for stuck preview (double-click on canvas)
        if (this.canvas) {
            this.canvas.addEventListener('dblclick', () => this.resetVideoPreview());
        }

        // Add keyboard shortcuts for debugging
        document.addEventListener('keydown', (e) => {
            if (e.key === 'a' && e.ctrlKey) {
                e.preventDefault();
                this.toggleAudioMode();
            }
            if (e.key === 'r' && e.ctrlKey) {
                e.preventDefault();
                this.resetVideoPreview();
            }
            if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                this.syncAudio();
            }
        });

        // Video Edit Modal listeners
        document.getElementById('videoEditModal').addEventListener('click', (e) => {
            if (e.target.id === 'videoEditModal') this.hideVideoEditModal();
        });
        document.getElementById('closeVideoEditModal').addEventListener('click', () => this.hideVideoEditModal());
        document.getElementById('applyClipChanges').addEventListener('click', () => this.applyClipChanges());
        document.getElementById('cancelClipChanges').addEventListener('click', () => this.hideVideoEditModal());

        // Form field sync with timeline
        document.getElementById('clipBegin').addEventListener('input', () => this.syncFormToTimeline());
        document.getElementById('clipDuration').addEventListener('input', () => this.syncFormToTimeline());
        document.getElementById('clipVolume').addEventListener('input', () => this.syncVideoVolume());

        // Clip timeline controls
        document.getElementById('playClipBtn').addEventListener('click', () => this.playClipFromBegin());
        document.getElementById('durationLockBtn').addEventListener('click', () => this.toggleDurationLock());

        this.setupTimelineInteractions();
        this.setupClipTimelineInteractions();
        document.getElementById('videoTitle').addEventListener('input', () => this.autoSave());
    }

    getTestFiles() {
        return [
            { name: 'test_simple_playback.json', description: '🎯 SIMPLE TEST - Basic video playback (no audio)', endpoint: '/vid-1.5' },
            { name: 'test_working_audio.json', description: '🔊 AUDIO TEST - Video with working audio URL', endpoint: '/vid-1.5' },
            { name: 'test_local_audio.json', description: '🎵 LOCAL AUDIO - Test with local Instagram audio file', endpoint: '/vid-1.5' },
            { name: 'test_external_audio.json', description: '☁️ EXTERNAL AUDIO - Test for Cloudflare Pages deployment', endpoint: '/vid-1.5' },
            { name: 'test_deployment_ready.json', description: '🚀 DEPLOYMENT READY - Final test before going live', endpoint: '/vid-1.5' },
            { name: 'test_working_demo.json', description: '🎬 WORKING DEMO - Real images & video with overlay', endpoint: '/vid-1.5' },
            { name: 'test_cors_demo.json', description: '🛡️ CORS DEMO - Shows canvas vs edit modal differences', endpoint: '/vid-1.5' },
            { name: 'test_complete_structure.json', description: '✅ COMPLETE Structure - All clips with descriptions', endpoint: '/vid-1.4' },
            { name: 'test_new_structure.json', description: '🆕 NEW Structure - videourl/imageurl parameters', endpoint: '/vid-1.4' },
            { name: 'test_audio_duration.json', description: '🎵 Audio Duration Test - Timeline limited by audio length', endpoint: '/vid-1.5' },
            { name: 'test_overlay_demo.json', description: '🎨 Overlay Preview Demo - Toggle overlay effect', endpoint: '/vid-1.5' },
            { name: 'test_vid13_captions.json', description: 'Vid-1.3 - Video with timed captions', endpoint: '/vid-1.3' },
            { name: 'test_vid13_with_overlay.json', description: 'Vid-1.3 - Timed captions with radial overlay', endpoint: '/vid-1.3' },
            { name: 'test_vid14_mixed_media.json', description: 'Vid-1.4 - Mixed media with multiple clips', endpoint: '/vid-1.4' },
            { name: 'test_vid14_multi_clips.json', description: 'Vid-1.4 - Multiple video clips with captions', endpoint: '/vid-1.4' },
            { name: 'test_vid14_pexels.json', description: 'Vid-1.4 - Pexels video example', endpoint: '/vid-1.4' },
            { name: 'test_vid14_with_overlay.json', description: 'Vid-1.4 - Pexels video with radial overlay', endpoint: '/vid-1.4' },
            { name: 'test_vid15_working.json', description: 'Vid-1.5 - Timed captions without overlay', endpoint: '/vid-1.5' },
            { name: 'test_vid15_with_overlay.json', description: 'Vid-1.5 - Timed captions with overlay', endpoint: '/vid-1.5' },
            { name: 'test_vid12_real_images.json', description: 'Vid-1.2 - Real images with transitions', endpoint: '/vid-1.2' },
            { name: 'test_begin_parameter.json', description: '🆕 BEGIN PARAMETER - Test new begin parameter functionality', endpoint: '/vid-1.5' },
            { name: 'test_volume_demo.json', description: '🔊 VOLUME DEMO - Test volume parameter with different levels', endpoint: '/vid-1.5' }
        ];
    }

    async populateJsonModal() {
        const listContainer = document.getElementById('jsonFileList');

        // Add loading indicator
        listContainer.innerHTML = '<div class="loading-indicator">Loading JSON sources...</div>';

        let modalContent = '';

        // Add Notion database section
        try {
            const notionRecords = await this.loadNotionRecords();
            if (notionRecords && notionRecords.length > 0) {
                modalContent += '<div class="json-section"><h3><i class="fas fa-database"></i> Notion Database Records</h3>';
                modalContent += notionRecords.map(record => `
                    <div class="json-file-item" onclick="videoEditor.loadNotionRecord('${record.formula_id}')">
                        <h4><i class="fas fa-cloud"></i> ${record.username || record.formula_id}</h4>
                        <p>${record.caption || 'No caption available'}</p>
                        <small style="color: #4a90e2; font-weight: 600;">ID: ${record.formula_id} • Status: ${record.status || 'Unknown'}</small>
                    </div>
                `).join('');
                modalContent += '</div>';
            }
        } catch (error) {
            console.error('Error loading Notion records:', error);
            modalContent += '<div class="json-section"><h3><i class="fas fa-database"></i> Notion Database Records</h3>';
            modalContent += '<div class="json-file-item error-item"><h4><i class="fas fa-exclamation-triangle"></i> Error Loading Notion Records</h4><p>Could not connect to the database</p></div>';
            modalContent += '</div>';
        }



        // Add upload option
        modalContent += `
            <div class="json-section">
                <h3><i class="fas fa-upload"></i> Upload Custom</h3>
                <div class="json-file-item" onclick="document.getElementById('fileInput').click()" style="border: 2px dashed #4a90e2;">
                    <h4><i class="fas fa-upload"></i> Upload Custom JSON</h4>
                    <p>Load your own JSON file from your computer</p>
                </div>
            </div>
        `;

        listContainer.innerHTML = modalContent;
    }

    async showJsonModal() {
        document.getElementById('jsonModal').classList.add('active');
        // Refresh the modal content when opened to get latest N8N records
        await this.populateJsonModal();
    }

    hideJsonModal() {
        document.getElementById('jsonModal').classList.remove('active');
    }

    showWebhookModal() {
        document.getElementById('webhookModal').classList.add('active');
        document.getElementById('webhookUrl').value = this.webhookUrl;
    }

    hideWebhookModal() {
        document.getElementById('webhookModal').classList.remove('active');
    }

    saveWebhookSettings() {
        const webhookUrl = document.getElementById('webhookUrl').value.trim();
        if (webhookUrl && this.isValidUrl(webhookUrl)) {
            this.webhookUrl = webhookUrl;
            localStorage.setItem('webhookUrl', webhookUrl);
            this.showNotification('Webhook settings saved!', 'success');
            this.hideWebhookModal();
        } else {
            this.showNotification('Please enter a valid webhook URL', 'error');
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async testWebhook() {
        const webhookUrl = document.getElementById('webhookUrl').value.trim();
        if (!webhookUrl || !this.isValidUrl(webhookUrl)) {
            this.showNotification('Please enter a valid webhook URL first', 'error');
            return;
        }

        try {
            this.showNotification('Testing webhook...', 'info');
            
            // Simple test payload
            const testPayload = {
                timestamp: new Date().toISOString(),
                action: 'test',
                message: 'This is a test webhook call from the video editor',
                test: true
            };

            console.log('🧪 Testing webhook via proxy:', webhookUrl);
            console.log('📦 Test payload:', testPayload);

            // Use the server-side webhook proxy for testing too
            const response = await fetch('/webhook-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    webhookUrl: webhookUrl,
                    payload: testPayload
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Webhook test successful via proxy');
                this.showNotification('✅ Webhook test successful!', 'success');
                
                if (result.response) {
                    console.log('📥 Test response:', result.response);
                }
            } else {
                throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('❌ Webhook test failed:', error);
            
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error - unable to reach webhook proxy server';
            }
            
            this.showNotification(`❌ Webhook test failed: ${errorMessage}`, 'error');
        }
    }

    showFullscreenModal() {
        if (!this.currentData) {
            this.showNotification('No video loaded to display!', 'error');
            return;
        }

        document.getElementById('fullscreenModal').classList.add('active');
        this.setupFullscreenCanvas();
        console.log('🖥️ Opened fullscreen video preview');
    }

    hideFullscreenModal() {
        document.getElementById('fullscreenModal').classList.remove('active');
        console.log('🖥️ Closed fullscreen video preview');
    }

    editVideoClip(index) {
        if (!this.currentData.clips || !this.currentData.clips[index]) {
            this.showNotification('Clip not found!', 'error');
            return;
        }

        const clip = this.currentData.clips[index];
        const videoUrl = clip.videourl || clip.videoUrl;

        if (!videoUrl || this.isImageUrl(videoUrl)) {
            this.showNotification('This is not a video clip!', 'error');
            return;
        }

        this.showVideoEditModal(clip, index);
    }

    showVideoEditModal(clip, index) {
        const modal = document.getElementById('videoEditModal');
        const title = document.getElementById('videoEditTitle');
        const video = document.getElementById('videoEditPlayer');
        const source = document.getElementById('videoEditSource');

        // Store current clip data for editing
        this.currentEditingClip = { clip, index };

        // Set modal title
        title.textContent = `Edit Video Clip ${index + 1}`;

        // Set video source
        const videoUrl = clip.videourl || clip.videoUrl;
        source.src = videoUrl;
        video.load();

        // Populate form fields
        document.getElementById('clipVideoUrl').value = videoUrl;
        document.getElementById('clipBegin').value = clip.begin || 0;
        document.getElementById('clipDuration').value = clip.duration || 5;
        document.getElementById('clipStart').value = clip.start || 0;
        document.getElementById('clipVolume').value = clip.volume || 100;
        document.getElementById('clipDescription').value = clip.description || '';

        // Initialize clip timeline
        this.initializeClipTimeline(clip, video);

        // Set initial video volume to match the volume parameter
        // Wait a bit for video to load before setting volume
        setTimeout(() => {
            this.syncVideoVolume();
        }, 100);

        // Show modal
        modal.classList.add('active');
        console.log(`🎬 Opened video edit modal for clip ${index + 1}`);
    }

    hideVideoEditModal() {
        const modal = document.getElementById('videoEditModal');
        const video = document.getElementById('videoEditPlayer');

        // Pause video when closing modal
        video.pause();

        // Clear current editing clip reference
        this.currentEditingClip = null;

        modal.classList.remove('active');
        console.log('🎬 Closed video edit modal');
    }

    applyClipChanges() {
        if (!this.currentEditingClip) {
            this.showNotification('No clip being edited!', 'error');
            return;
        }

        const { clip, index } = this.currentEditingClip;

        // Get values from form fields
        const begin = parseFloat(document.getElementById('clipBegin').value) || 0;
        const duration = parseFloat(document.getElementById('clipDuration').value) || 5;
        const start = parseFloat(document.getElementById('clipStart').value) || 0;
        const volume = parseInt(document.getElementById('clipVolume').value) || 100;
        const description = document.getElementById('clipDescription').value || '';

        // Validate values
        if (duration <= 0) {
            this.showNotification('Duration must be greater than 0!', 'error');
            return;
        }

        if (begin < 0) {
            this.showNotification('Begin time cannot be negative!', 'error');
            return;
        }

        if (start < 0) {
            this.showNotification('Start time cannot be negative!', 'error');
            return;
        }

        if (volume < 0 || volume > 200) {
            this.showNotification('Volume must be between 0 and 200!', 'error');
            return;
        }

        // Update the clip data
        clip.begin = begin;
        clip.duration = duration;
        clip.start = start;
        clip.volume = volume;
        clip.description = description;

        // Recalculate timeline and refresh displays
        this.calculateTotalDuration();
        this.renderProperties();
        this.renderTimeline();

        // Close modal
        this.hideVideoEditModal();

        // Auto-save changes
        this.autoSave();

        this.showNotification(`Clip ${index + 1} updated successfully!`, 'success');
        console.log(`✅ Applied changes to clip ${index + 1}:`, { begin, duration, start, volume, description });
    }

    setupFullscreenCanvas() {
        const fullscreenCanvas = document.getElementById('fullscreenCanvas');
        const fullscreenCtx = fullscreenCanvas.getContext('2d');

        // Use much more of the available screen space
        // Account for header (about 60px) and small padding
        const availableWidth = window.innerWidth * 0.95;
        const availableHeight = (window.innerHeight * 0.95) - 80; // Subtract header height

        // Calculate size maintaining 9:16 aspect ratio but much larger
        let canvasWidth, canvasHeight;
        const aspectRatio = 9 / 16; // width/height for 9:16 format

        if (availableWidth / availableHeight > aspectRatio) {
            // Screen is wider than 9:16, fit to height
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight * aspectRatio;
        } else {
            // Screen is taller than 9:16, fit to width
            canvasWidth = availableWidth;
            canvasHeight = canvasWidth / aspectRatio;
        }

        // Make it even larger - use 95% of calculated size
        canvasWidth = Math.floor(canvasWidth * 0.95);
        canvasHeight = Math.floor(canvasHeight * 0.95);

        fullscreenCanvas.width = 1080; // Keep internal resolution high
        fullscreenCanvas.height = 1920;
        fullscreenCanvas.style.width = `${canvasWidth}px`;
        fullscreenCanvas.style.height = `${canvasHeight}px`;

        console.log(`🖥️ Fullscreen canvas size: ${canvasWidth}x${canvasHeight}px`);

        // Store reference for rendering
        this.fullscreenCanvas = fullscreenCanvas;
        this.fullscreenCtx = fullscreenCtx;

        // Disable image smoothing for crisp text
        fullscreenCtx.imageSmoothingEnabled = false;
        fullscreenCtx.textRendering = 'optimizeLegibility';
    }

    async loadNotionRecords() {
        try {
            const workerUrl = 'https://notion-reader.debabratamaitra898.workers.dev/';
            console.log('🔄 Fetching records from Notion database...');

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(workerUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid response format: missing items array');
            }

            // Transform the data to extract records with JSON content
            const records = data.items
                .filter(item => {
                    const hasJson = item.properties && item.properties.JSON && item.properties.JSON.trim() !== '';
                    const hasId = item.properties && (item.properties.ID || item.id);
                    return hasJson && hasId;
                })
                .map(item => ({
                    formula_id: item.properties.ID || item.id,
                    username: item.properties.Username || 'Unknown User',
                    caption: item.properties.Caption || 'No caption',
                    status: item.properties.Status || 'Unknown',
                    page_id: item.id,
                    created_time: item.created_time,
                    last_edited_time: item.last_edited_time
                }))
                .sort((a, b) => new Date(b.last_edited_time) - new Date(a.last_edited_time)); // Sort by most recent first

            console.log(`📊 Successfully loaded ${records.length} records from Notion database (${data.total} total records)`);
            return records;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Request timeout: Notion database took too long to respond');
                throw new Error('Request timeout - Notion database is not responding');
            }
            console.error('❌ Error loading Notion records:', error);
            throw error;
        }
    }

    async loadNotionRecord(formulaId) {
        try {
            this.showNotification('Loading record from Notion database...', 'info');
            console.log(`🔄 Loading Notion record: ${formulaId}`);

            const workerUrl = `https://notion-reader.debabratamaitra898.workers.dev/?json_id=${encodeURIComponent(formulaId)}`;

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(workerUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
            }

            const recordData = await response.json();

            console.log('🔍 Debug - Record data received:', {
                has_json_parsed: !!recordData.json_parsed,
                has_json_raw: !!recordData.json_raw,
                json_parsed_type: typeof recordData.json_parsed,
                json_raw_length: recordData.json_raw ? recordData.json_raw.length : 0,
                error: recordData.error
            });

            if (recordData.error) {
                throw new Error(recordData.error);
            }

            let jsonData = recordData.json_parsed;

            // If json_parsed is null but we have json_raw, try to clean and parse it
            if (!jsonData && recordData.json_raw) {
                console.log('🔧 Attempting to clean and parse raw JSON...');
                try {
                    // Clean the JSON by removing non-breaking spaces and other problematic characters
                    const cleanedJson = recordData.json_raw
                        .replace(/Â/g, ' ')  // Replace non-breaking spaces
                        .replace(/\u00A0/g, ' ')  // Replace other non-breaking space variants
                        .replace(/\s+/g, ' ')  // Normalize multiple spaces
                        .trim();

                    console.log('🔍 Cleaned JSON preview:', cleanedJson.substring(0, 100) + '...');
                    jsonData = JSON.parse(cleanedJson);
                    console.log('✅ Successfully cleaned and parsed JSON content');
                } catch (parseError) {
                    console.error('❌ Failed to parse cleaned JSON:', parseError);
                    console.error('❌ Raw JSON content:', recordData.json_raw.substring(0, 200));
                    throw new Error('JSON content contains invalid characters and cannot be parsed');
                }
            }

            // Handle case where json_parsed exists but is a string instead of object
            if (typeof jsonData === 'string') {
                console.log('🔧 JSON data is a string, attempting to parse...');
                try {
                    const cleanedJson = jsonData
                        .replace(/Â/g, ' ')  // Replace non-breaking spaces
                        .replace(/\u00A0/g, ' ')  // Replace other non-breaking space variants
                        .replace(/\s+/g, ' ')  // Normalize multiple spaces
                        .trim();

                    jsonData = JSON.parse(cleanedJson);
                    console.log('✅ Successfully parsed string JSON content');
                } catch (parseError) {
                    console.error('❌ Failed to parse string JSON:', parseError);
                    throw new Error('JSON content is a string but cannot be parsed as JSON');
                }
            }

            if (!jsonData) {
                throw new Error('No valid JSON content found in this record');
            }

            console.log('🔍 Final JSON data type:', typeof jsonData);
            console.log('🔍 Final JSON data keys:', Object.keys(jsonData || {}));

            // Validate that the JSON data has the expected structure for video editing
            if (typeof jsonData !== 'object' || jsonData === null) {
                throw new Error(`JSON content is not a valid object (type: ${typeof jsonData})`);
            }

            // Create a descriptive filename
            const username = recordData.username || 'Unknown';
            const caption = recordData.caption ? recordData.caption.substring(0, 30) : '';
            const fileName = `Notion_${username}_${formulaId}${caption ? '_' + caption.replace(/[^a-zA-Z0-9]/g, '_') : ''}`;

            // Store the Notion record information for save/confirm operations
            this.currentNotionRecord = {
                formula_id: formulaId,
                username: username,
                page_id: recordData.page_id,
                original_status: recordData.status
            };

            await this.loadData(jsonData, fileName);
            this.hideJsonModal();
            this.showNotification(`✅ Loaded: ${username} (${formulaId})`, 'success');

            console.log(`✅ Successfully loaded Notion record: ${formulaId} for user: ${username}`);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Request timeout: Notion record took too long to load');
                this.showNotification('Request timeout - Notion database is not responding', 'error');
                return;
            }
            console.error('❌ Error loading Notion record:', error);
            this.showNotification(`Failed to load record: ${error.message}`, 'error');
        }
    }

    async loadTestFile(fileName) {
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error('File not found');

            const data = await response.json();
            // Clear Notion record info when loading test files
            this.currentNotionRecord = null;

            await this.loadData(data, fileName);
            this.hideJsonModal();
            this.showNotification('File loaded successfully!', 'success');
        } catch (error) {
            console.error('Error loading file:', error);
            this.showNotification('Error loading file. Make sure the file exists.', 'error');
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Clear Notion record info when uploading custom files
                this.currentNotionRecord = null;

                await this.loadData(data, file.name);
                this.hideJsonModal();
                this.showNotification('File uploaded successfully!', 'success');
            } catch (error) {
                console.error('Error parsing JSON:', error);
                this.showNotification('Invalid JSON file!', 'error');
            }
        };
        reader.readAsText(file);
    }

    async loadData(data, fileName) {
        this.currentData = data;
        this.currentFileName = fileName;

        // Ensure all clips have a description parameter
        if (this.currentData.clips && Array.isArray(this.currentData.clips)) {
            this.currentData.clips.forEach(clip => {
                if (clip.description === undefined) {
                    clip.description = '';
                }
            });
        }

        // Set title with Notion indicator if applicable
        let displayTitle = fileName.replace('.json', '').replace(/[_-]/g, ' ');
        if (this.currentNotionRecord) {
            displayTitle = `📝 Notion: ${this.currentNotionRecord.username} (${this.currentNotionRecord.formula_id})`;
        }
        document.getElementById('videoTitle').value = displayTitle;

        this.currentTime = 0;
        this.isPlaying = false;

        // Reset audio element when loading new data
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement = null;
        }

        this.calculateTotalDuration();
        await this.preloadMedia();

        this.renderProperties();
        this.renderTimeline();
        this.showPreview();
        this.updateButtonLabels();

        this.autoSave();
    }

    calculateTotalDuration() {
        let maxDuration = 30; // Increased default from 10 to 30 seconds

        // If there's audio, use its duration as the primary constraint
        let audioDuration = null;
        if (this.currentData.audioUrl || this.currentData.instagramUrl) {
            audioDuration = this.currentData.duration || 15;
            maxDuration = audioDuration;
            console.log(`🎵 Audio duration set as timeline maximum: ${audioDuration}s`);
        } else if (this.currentData.duration) {
            maxDuration = Math.max(maxDuration, this.currentData.duration);
        }

        // Check clips duration but don't exceed audio duration if present
        if (this.currentData.clips) {
            this.currentData.clips.forEach(clip => {
                const end = (clip.start || 0) + (clip.duration || 5);
                if (!audioDuration) {
                    maxDuration = Math.max(maxDuration, end);
                } else {
                    // Warn if clips extend beyond audio
                    if (end > audioDuration) {
                        console.warn(`⚠️ Clip extends beyond audio duration: ${end}s > ${audioDuration}s`);
                    }
                }
            });
        }

        // Check captions duration but don't exceed audio duration if present
        if (this.currentData.captions) {
            this.currentData.captions.forEach(caption => {
                const end = (caption.start || 0) + (caption.duration || 3);
                if (!audioDuration) {
                    maxDuration = Math.max(maxDuration, end);
                } else {
                    // Warn if captions extend beyond audio
                    if (end > audioDuration) {
                        console.warn(`⚠️ Caption extends beyond audio duration: ${end}s > ${audioDuration}s`);
                    }
                }
            });
        }

        // Set total duration - use audio duration if available, otherwise calculated max
        this.totalDuration = audioDuration || Math.max(maxDuration, 15);
        console.log(`⏱️ Total timeline duration: ${this.totalDuration}s`);
    }

    async preloadMedia() {
        if (!this.currentData) return;

        const mediaUrls = new Set();

        if (this.currentData.imageUrl) mediaUrls.add(this.currentData.imageUrl);
        if (this.currentData.videoUrl) mediaUrls.add(this.currentData.videoUrl);

        if (this.currentData.clips) {
            this.currentData.clips.forEach(clip => {
                // Handle new structure: videourl and imageurl
                if (clip.videourl) mediaUrls.add(clip.videourl);
                if (clip.imageurl) mediaUrls.add(clip.imageurl);
                // Backward compatibility
                if (clip.videoUrl) mediaUrls.add(clip.videoUrl);
            });
        }

        if (mediaUrls.size > 0) {
            console.log(`🔄 Loading ${mediaUrls.size} media files...`);
            let loaded = 0;
            let failed = 0;

            for (const url of mediaUrls) {
                try {
                    if (this.isImageUrl(url)) {
                        await this.loadImage(url);
                    } else {
                        await this.loadVideo(url);
                    }
                    loaded++;
                } catch (error) {
                    console.warn(`Failed to preload media: ${url}`, error);
                    failed++;
                }
            }

            console.log(`📊 Media loading complete: ${loaded} loaded, ${failed} failed`);
            if (failed > 0) {
                this.showNotification(`⚠️ ${failed} media files failed to load`, 'warning');
            }
        }
    }

    isImageUrl(url) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            if (this.loadedImages.has(url)) {
                resolve(this.loadedImages.get(url));
                return;
            }

            const img = new Image();
            let resolved = false;

            const onSuccess = () => {
                if (resolved) return;
                resolved = true;
                this.loadedImages.set(url, img);
                console.log(`✅ Image loaded: ${url.substring(0, 50)}...`);
                resolve(img);
            };

            const onError = (error) => {
                if (resolved) return;
                console.warn(`❌ Failed to load image: ${url}`, error);

                // Try with crossOrigin for canvas compatibility
                if (!img.hasAttribute('crossorigin')) {
                    console.log(`🔄 Retrying image with CORS for canvas: ${url.substring(0, 50)}...`);
                    img.setAttribute('crossorigin', 'anonymous');
                    img.src = url; // Reload with CORS
                    return;
                }

                // Both attempts failed
                resolved = true;
                this.loadedImages.set(url, null);
                reject(error);
            };

            img.addEventListener('load', onSuccess);
            img.addEventListener('error', onError);
            img.src = url;
        });
    }

    loadVideo(url) {
        return new Promise((resolve, reject) => {
            if (this.loadedVideos.has(url)) {
                resolve(this.loadedVideos.get(url));
                return;
            }

            const video = document.createElement('video');
            video.muted = true;
            video.preload = 'metadata';
            video.playsInline = true; // Better mobile support

            // Don't set crossOrigin initially - let browser handle it naturally
            // This matches how the video edit modal works

            let resolved = false;
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                video.removeEventListener('loadeddata', onSuccess);
                video.removeEventListener('canplay', onSuccess);
                video.removeEventListener('error', onError);
                video.removeEventListener('abort', onError);
            };

            const onSuccess = () => {
                if (resolved) return;
                resolved = true;
                cleanup();

                // Add seeking protection
                video.addEventListener('seeking', () => {
                    if (this.seekingTimeout) {
                        clearTimeout(this.seekingTimeout);
                    }
                    this.seekingTimeout = setTimeout(() => {
                        console.warn('⚠️ Video seeking timeout, may be stuck');
                    }, 2000);
                });

                video.addEventListener('seeked', () => {
                    if (this.seekingTimeout) {
                        clearTimeout(this.seekingTimeout);
                        this.seekingTimeout = null;
                    }
                });

                this.loadedVideos.set(url, video);
                console.log(`✅ Video loaded: ${url.substring(0, 50)}...`);
                resolve(video);
            };

            const onError = (error) => {
                if (resolved) return;
                console.warn(`❌ Failed to load video: ${url}`, error);

                // For canvas drawing, we need to try with crossOrigin
                // But only after the first attempt fails
                if (!video.hasAttribute('crossorigin')) {
                    console.log(`🔄 Retrying video with CORS for canvas: ${url.substring(0, 50)}...`);
                    video.setAttribute('crossorigin', 'anonymous');
                    video.load();
                    return;
                }

                // If both attempts failed, store null and reject
                resolved = true;
                cleanup();
                this.loadedVideos.set(url, null);
                reject(error);
            };

            // Add timeout protection
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    console.warn(`⏰ Video loading timeout: ${url.substring(0, 50)}...`);
                    onError(new Error('Loading timeout'));
                }
            }, 10000); // 10 second timeout

            // Multiple event listeners for better compatibility
            video.addEventListener('loadeddata', onSuccess);
            video.addEventListener('canplay', onSuccess);
            video.addEventListener('error', onError);
            video.addEventListener('abort', onError);

            // Set source and start loading
            video.src = url;
        });
    }

    showPreview() {
        console.log('🎬 showPreview() called - enabling play button');
        
        const playBtn = document.getElementById('playPauseBtn');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const audioBtn = document.getElementById('audioTestBtn');
        
        document.getElementById('previewPlaceholder').style.display = 'none';
        document.getElementById('previewCanvasContainer').style.display = 'block';
        
        if (playBtn) {
            playBtn.disabled = false;
            console.log('✅ Play button enabled');
        } else {
            console.error('❌ Play button not found!');
        }
        
        if (fullscreenBtn) fullscreenBtn.disabled = false;
        if (audioBtn) audioBtn.disabled = false;
        
        console.log('🎬 Preview controls enabled');
    }

    // Render loop for real-time preview matching backend output
    startRenderLoop() {
        let lastFrameTime = 0;
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

        const render = (currentTime) => {
            // Throttle to target FPS to prevent excessive rendering
            if (currentTime - lastFrameTime >= frameInterval) {
                if (this.isPlaying) {
                    // Sync with audio if available and working, otherwise use performance timer
                    if (this.audioElement && !this.audioElement.paused && !this.audioElement.error && this.audioElement.readyState >= 2) {
                        // Use audio time but validate it's reasonable
                        const audioTime = this.audioElement.currentTime;
                        if (audioTime >= 0 && audioTime <= this.totalDuration) {
                            this.currentTime = audioTime;
                        } else {
                            // Audio time is invalid, fall back to timer
                            this.currentTime += frameInterval / 1000;
                        }
                    } else {
                        // No audio or audio not ready, use performance timer
                        this.currentTime += frameInterval / 1000;
                    }

                    if (this.currentTime >= this.totalDuration) {
                        this.currentTime = 0;
                        this.isPlaying = false;

                        // Update play/pause buttons
                        const btn = document.getElementById('playPauseBtn');
                        const fullscreenBtn = document.getElementById('fullscreenPlayPauseBtn');
                        const iconHTML = '<i class="fas fa-play"></i>';
                        btn.innerHTML = iconHTML;
                        fullscreenBtn.innerHTML = iconHTML;

                        // Reset audio to beginning
                        if (this.audioElement) {
                            this.audioElement.pause();
                            try {
                                this.audioElement.currentTime = 0;
                                console.log('🎵 Audio reset to beginning');
                            } catch (error) {
                                console.warn('🎵 Audio reset failed:', error.message);
                            }
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

    renderFrame() {
        if (!this.currentData || !this.ctx) return;

        try {
            // Render to main canvas
            this.renderToCanvas(this.ctx, this.canvas.width, this.canvas.height);

            // Also render to fullscreen canvas if modal is open
            if (this.fullscreenCtx && document.getElementById('fullscreenModal').classList.contains('active')) {
                this.renderToCanvas(this.fullscreenCtx, this.fullscreenCanvas.width, this.fullscreenCanvas.height);
                this.updateFullscreenTimeDisplay();
            }
        } catch (error) {
            console.warn('⚠️ Render frame error:', error);
            // Continue rendering on next frame even if this one fails
        }
    }

    // Safe video seeking method to prevent getting stuck
    safeSeekVideo(video, targetTime) {
        if (!video || video.readyState < 2 || video.seeking) {
            return false; // Can't seek right now
        }

        const timeDiff = Math.abs(video.currentTime - targetTime);
        if (timeDiff < 0.1) {
            return true; // Already at target time
        }

        try {
            const clampedTime = Math.max(0, Math.min(targetTime, video.duration - 0.1));
            video.currentTime = clampedTime;
            return true;
        } catch (error) {
            console.warn('⚠️ Video seek error:', error);
            return false;
        }
    }

    // Reset video preview if it gets stuck
    resetVideoPreview() {
        console.log('🔄 Resetting video preview...');

        // Stop playback
        this.isPlaying = false;
        this.currentTime = 0;

        // Reset all loaded videos
        this.loadedVideos.forEach((video, url) => {
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
        });

        // Clear seeking timeouts
        if (this.seekingTimeout) {
            clearTimeout(this.seekingTimeout);
            this.seekingTimeout = null;
        }

        // Update UI
        const btn = document.getElementById('playPauseBtn');
        const fullscreenBtn = document.getElementById('fullscreenPlayPauseBtn');
        const iconHTML = '<i class="fas fa-play"></i>';
        btn.innerHTML = iconHTML;
        fullscreenBtn.innerHTML = iconHTML;

        this.updateTimeDisplay();
        this.updatePlayheadPosition();

        this.showNotification('Video preview reset', 'info');
        console.log('✅ Video preview reset complete');
    }

    // Toggle audio mode for debugging
    toggleAudioMode() {
        this.audioDisabled = !this.audioDisabled;

        if (this.audioDisabled) {
            // Disable audio
            if (this.audioElement) {
                this.audioElement.pause();
                this.audioElement = null;
            }
            this.showNotification('Audio disabled (Ctrl+A to re-enable)', 'info');
            console.log('🔇 Audio disabled for debugging');
        } else {
            this.showNotification('Audio enabled (Ctrl+A to disable)', 'info');
            console.log('🔊 Audio enabled');
        }
    }

    // Test audio loading independently
    testAudioLoading() {
        if (!this.currentData) {
            this.showNotification('No data loaded to test audio', 'error');
            return;
        }

        const audioUrl = this.currentData.audioUrl || this.currentData.instagramUrl;
        if (!audioUrl) {
            this.showNotification('No audio URL found in current data', 'info');
            return;
        }

        console.log('🎵 Testing audio loading for:', audioUrl);
        this.showNotification('Testing audio: ' + audioUrl, 'info');

        // Create a test audio element
        const testAudio = new Audio();
        testAudio.crossOrigin = 'anonymous';

        testAudio.addEventListener('loadeddata', () => {
            console.log('✅ Audio test successful - can load and play');
            this.showNotification('✅ Audio loaded successfully!', 'success');
            testAudio.play().then(() => {
                console.log('✅ Audio playback test successful');
                setTimeout(() => testAudio.pause(), 1000); // Play for 1 second
            }).catch(e => {
                console.warn('⚠️ Audio loaded but playback failed:', e);
                this.showNotification('⚠️ Audio loaded but playback failed: ' + e.message, 'warning');
            });
        });

        testAudio.addEventListener('error', (e) => {
            console.error('❌ Audio test failed:', e);
            console.error('❌ Audio error details:', {
                error: testAudio.error,
                networkState: testAudio.networkState,
                readyState: testAudio.readyState
            });
            this.showNotification('❌ Audio loading failed - check console for details', 'error');
        });

        testAudio.src = audioUrl;

        // For local files, also try a fetch test
        if (!audioUrl.includes('://')) {
            console.log('🎵 Testing local file accessibility...');
            fetch(audioUrl, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        console.log('✅ Local audio file is accessible via HTTP');
                    } else {
                        console.warn('⚠️ Local audio file returned HTTP', response.status);
                    }
                })
                .catch(error => {
                    console.warn('⚠️ Local audio file fetch test failed:', error.message);
                    console.log('💡 This might be normal for local files - the audio element will still try to load it');
                });
        }
    }

    // Manually sync audio with timeline
    syncAudio() {
        if (!this.audioElement) {
            this.showNotification('No audio to sync', 'info');
            return;
        }

        console.log('🎵 Manually syncing audio...');

        try {
            const targetTime = Math.max(0, Math.min(this.currentTime, this.audioElement.duration || this.currentTime));
            this.audioElement.currentTime = targetTime;

            if (this.isPlaying && this.audioElement.paused) {
                this.audioElement.play();
            }

            this.showNotification(`Audio synced to ${targetTime.toFixed(1)}s`, 'success');
            console.log('✅ Audio manually synced to:', targetTime.toFixed(2));
        } catch (error) {
            console.error('❌ Manual audio sync failed:', error);
            this.showNotification('Audio sync failed: ' + error.message, 'error');
        }
    }

    renderToCanvas(ctx, width, height) {
        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Apply fade animation if configured
        let opacity = 1.0;
        if (this.currentData.fadeIn || this.currentData.fadeOut) {
            opacity = this.calculateFadeOpacity();
        }

        ctx.globalAlpha = opacity;

        // Render current media clip (matching backend logic)
        this.renderCurrentMedia(ctx, width, height);

        // Render overlay if enabled (matching backend overlay logic)
        this.renderOverlay(ctx, width, height);

        // Render text overlays (matching backend logic)
        this.renderTextOverlays(ctx, width, height);

        ctx.globalAlpha = 1.0;

        // Show audio indicator if audio is present
        this.renderAudioIndicator(ctx, width, height);
    }

    calculateFadeOpacity() {
        const fadeInDuration = this.currentData.fadeIn ? (this.totalDuration * 0.75) : 0;
        const fadeOutStart = this.currentData.fadeOut ? (this.totalDuration * 0.25) : this.totalDuration;

        if (this.currentData.fadeIn && this.currentTime < fadeInDuration) {
            // Fade in
            return this.currentTime / fadeInDuration;
        } else if (this.currentData.fadeOut && this.currentTime > fadeOutStart) {
            // Fade out
            return 1 - ((this.currentTime - fadeOutStart) / (this.totalDuration - fadeOutStart));
        }

        return 1.0;
    }

    renderAudioIndicator(ctx, width, height) {
        if (this.currentData.audioUrl || this.currentData.instagramUrl) {
            ctx.save();

            // Draw audio indicator in top-right corner
            const iconSize = 40;
            const padding = 20;
            const x = width - iconSize - padding;
            const y = padding;

            // Background circle
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(x + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Audio wave animation
            ctx.strokeStyle = '#4a90e2';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            const time = Date.now() / 100;
            for (let i = 0; i < 3; i++) {
                const barHeight = 10 + Math.sin(time + i) * 5;
                const barX = x + iconSize / 2 - 10 + i * 10;
                const barY = y + iconSize / 2;

                ctx.beginPath();
                ctx.moveTo(barX, barY - barHeight / 2);
                ctx.lineTo(barX, barY + barHeight / 2);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    renderCurrentMedia(ctx, width, height) {
        let currentMedia = null;
        let clipStartTime = 0;
        let clipDuration = 0;

        // Find current video/image clip
        if (this.currentData.clips) {
            for (const clip of this.currentData.clips) {
                const start = clip.begin !== undefined ? clip.begin : (clip.start || 0);
                const duration = clip.duration || 5;

                if (this.currentTime >= start && this.currentTime < start + duration) {
                    currentMedia = clip;
                    clipStartTime = start;
                    clipDuration = duration;
                    break;
                }
            }
        }

        // Fallback to single media
        if (!currentMedia) {
            if (this.currentData.imageUrl) {
                currentMedia = { videoUrl: this.currentData.imageUrl };
                clipDuration = this.currentData.duration || 30;
            } else if (this.currentData.videoUrl) {
                currentMedia = { videoUrl: this.currentData.videoUrl, start: this.currentData.start || 0 };
                clipDuration = this.currentData.duration || 30;
            }
        }

        if (currentMedia) {
            // Get the media URL from the new structure
            const mediaUrl = currentMedia.imageurl || currentMedia.videourl || currentMedia.videoUrl;

            if (mediaUrl) {
                // Only apply fade for style endpoints (style1, style2, style3, style4)
                // Vid-1.2, Vid-1.3, Vid-1.4 don't use fade animations
                const shouldFade = this.shouldUseFadeAnimation();
                let fadeOpacity = 1.0;

                if (shouldFade) {
                    const timeInClip = this.currentTime - clipStartTime;
                    fadeOpacity = this.calculateFadeOpacity(timeInClip, clipDuration);
                }

                // Pass both the clip start time and begin parameter
                const clipInfo = {
                    start: currentMedia.start || clipStartTime,
                    begin: currentMedia.begin || 0
                };
                this.drawMedia(ctx, mediaUrl, width, height, clipInfo, fadeOpacity);
            } else {
                // No media URL found, draw empty clip placeholder
                this.drawEmptyClipPlaceholder(ctx, width, height);
            }
        } else {
            // No current media at this time, draw timeline placeholder
            this.drawTimelinePlaceholder(ctx, width, height);
        }
    }

    // Render radial overlay effect (matching backend overlay logic)
    renderOverlay(ctx, width, height) {
        if (!this.currentData.overlay) return;

        console.log('🎨 Rendering radial overlay preview...');

        // Create radial gradient matching the backend overlay.png effect
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.max(width, height) * 0.8; // Adjust radius for effect

        // Create radial gradient from transparent center to dark edges
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)'); // Transparent center
        gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.1)'); // Slight darkening
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.3)'); // More darkening
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)'); // Dark edges

        // Apply the overlay with multiply-like effect
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Apply brightness reduction to match backend effect
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(200, 200, 200, 1)'; // Darken overall (equivalent to brightness=-0.3)
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    // Determine if current data should use fade animation based on endpoint type
    shouldUseFadeAnimation() {
        // Style endpoints use fade (style1, style2, style3, style4)
        // Vid endpoints don't use fade (vid-1.2, vid-1.3, vid-1.4)

        // Check if this is a multi-clip video (vid-1.4 style)
        if (this.currentData.clips && this.currentData.clips.length > 0) {
            return false; // Vid-1.4 style - no fade
        }

        // Check if this has timed captions (vid-1.3 style)
        if (this.currentData.captions && this.currentData.captions.length > 0) {
            return false; // Vid-1.3 style - no fade
        }

        // Check if this is image-based with transitions (vid-1.2 style)
        if (this.currentData.imageUrl && !this.currentData.quote) {
            return false; // Vid-1.2 style - no fade
        }

        // Default to fade for style endpoints (style1, style2, style3, style4)
        return true;
    }

    // Calculate fade in/out opacity (matching backend fade animation)
    calculateFadeOpacity(timeInClip, duration) {
        const fadeDuration = Math.min(duration * 0.75, 2); // 75% of clip or 2 seconds max

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

    drawMedia(ctx, url, canvasWidth, canvasHeight, clipInfo, opacity = 1.0) {
        // Save context and apply fade opacity
        ctx.save();
        ctx.globalAlpha = opacity;

        let mediaDrawn = false;

        // Handle both old format (clipStart as number) and new format (clipInfo object)
        const clipStart = typeof clipInfo === 'object' ? clipInfo.start : clipInfo;
        const beginTime = typeof clipInfo === 'object' ? (clipInfo.begin || 0) : 0;

        if (this.isImageUrl(url)) {
            const img = this.loadedImages.get(url);
            if (img) {
                this.drawMediaWithAspectRatio(ctx, img, canvasWidth, canvasHeight);
                mediaDrawn = true;
            }
        } else {
            const video = this.loadedVideos.get(url);
            if (video) {
                try {
                    // Calculate video time accounting for begin parameter
                    const timeInClip = this.currentTime - clipStart;
                    const videoTime = timeInClip + beginTime;

                    // Use safe seeking method
                    if (Math.abs(video.currentTime - videoTime) > 0.5) {
                        this.safeSeekVideo(video, videoTime);
                    }

                    // Handle play/pause state safely
                    if (this.isPlaying && video.paused && video.readyState >= 2 && !video.seeking) {
                        video.play().catch((error) => {
                            console.warn('⚠️ Video play error:', error);
                        });
                    } else if (!this.isPlaying && !video.paused) {
                        video.pause();
                    }

                    this.drawMediaWithAspectRatio(ctx, video, canvasWidth, canvasHeight);
                    mediaDrawn = true;
                } catch (error) {
                    console.warn(`Canvas drawing error for video: ${url}`, error);
                    // If canvas drawing fails due to CORS, show a different placeholder
                    this.drawCorsErrorPlaceholder(ctx, url, canvasWidth, canvasHeight);
                    mediaDrawn = true;
                }
            }
        }

        // Draw placeholder if media failed to load or is missing
        if (!mediaDrawn && url) {
            this.drawMediaPlaceholder(ctx, url, canvasWidth, canvasHeight);
        }

        ctx.restore();
    }

    // Match backend smart aspect ratio logic from vid-1.4.js
    drawMediaWithAspectRatio(ctx, media, canvasWidth, canvasHeight) {
        const mediaWidth = media.videoWidth || media.naturalWidth || media.width;
        const mediaHeight = media.videoHeight || media.naturalHeight || media.height;

        if (!mediaWidth || !mediaHeight) return;

        const mediaAspect = mediaWidth / mediaHeight;
        const targetAspect = canvasWidth / canvasHeight; // 9:16 = 0.5625

        let drawWidth, drawHeight, drawX, drawY;

        // SMART ASPECT RATIO LOGIC (matching backend)
        if (mediaAspect <= targetAspect) {
            // TALL or SQUARE clip - fill entire HEIGHT, center horizontally
            drawHeight = canvasHeight;
            drawWidth = drawHeight * mediaAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
        } else {
            // WIDE clip - fill entire WIDTH, center vertically  
            drawWidth = canvasWidth;
            drawHeight = drawWidth / mediaAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
        }

        ctx.drawImage(media, drawX, drawY, drawWidth, drawHeight);
    }

    // Draw placeholder for missing or failed media
    drawMediaPlaceholder(ctx, url, canvasWidth, canvasHeight) {
        ctx.save();

        // Draw dark background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);

        // Determine media type
        const isImage = this.isImageUrl(url);
        const mediaType = isImage ? 'IMAGE' : 'VIDEO';
        const iconCode = isImage ? '\uf03e' : '\uf03d'; // FontAwesome icons

        // Draw icon
        ctx.fillStyle = '#666';
        ctx.font = '120px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Try to draw FontAwesome icon, fallback to text
        try {
            ctx.fillText(iconCode, canvasWidth / 2, canvasHeight / 2 - 100);
        } catch (e) {
            // Fallback to simple text
            ctx.font = 'bold 80px Arial';
            ctx.fillText(isImage ? '🖼️' : '🎬', canvasWidth / 2, canvasHeight / 2 - 100);
        }

        // Draw media type label
        ctx.fillStyle = '#888';
        ctx.font = 'bold 48px Arial';
        ctx.fillText(`${mediaType} NOT FOUND`, canvasWidth / 2, canvasHeight / 2);

        // Draw URL (truncated)
        ctx.fillStyle = '#666';
        ctx.font = '24px Arial';
        const truncatedUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
        ctx.fillText(truncatedUrl, canvasWidth / 2, canvasHeight / 2 + 80);

        // Draw loading status
        ctx.fillStyle = '#999';
        ctx.font = '20px Arial';
        ctx.fillText('Check URL or network connection', canvasWidth / 2, canvasHeight / 2 + 120);

        ctx.restore();
    }

    // Draw placeholder for CORS-blocked media
    drawCorsErrorPlaceholder(ctx, url, canvasWidth, canvasHeight) {
        ctx.save();

        // Draw orange background to indicate CORS issue
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw border
        ctx.strokeStyle = '#ff4500';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, canvasWidth - 6, canvasHeight - 6);

        // Draw shield icon (CORS blocked)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', canvasWidth / 2, canvasHeight / 2 - 100);

        // Draw main message
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 42px Arial';
        ctx.fillText('CORS BLOCKED', canvasWidth / 2, canvasHeight / 2);

        // Draw explanation
        ctx.font = '28px Arial';
        ctx.fillText('Video loads in edit modal', canvasWidth / 2, canvasHeight / 2 + 50);
        ctx.fillText('but blocked in canvas', canvasWidth / 2, canvasHeight / 2 + 85);

        // Draw URL (truncated)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '20px Arial';
        const truncatedUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
        ctx.fillText(truncatedUrl, canvasWidth / 2, canvasWidth / 2 + 130);

        ctx.restore();
    }

    // Draw placeholder for empty clip (no URL set)
    drawEmptyClipPlaceholder(ctx, canvasWidth, canvasHeight) {
        ctx.save();

        // Draw dark background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw dashed border
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 10]);
        ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

        // Draw plus icon
        ctx.fillStyle = '#777';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', canvasWidth / 2, canvasHeight / 2 - 80);

        // Draw text
        ctx.fillStyle = '#999';
        ctx.font = 'bold 36px Arial';
        ctx.fillText('EMPTY CLIP', canvasWidth / 2, canvasHeight / 2 + 20);

        ctx.font = '24px Arial';
        ctx.fillText('Add media URL in properties', canvasWidth / 2, canvasHeight / 2 + 60);

        ctx.restore();
    }

    // Draw placeholder when no clips are active at current time
    drawTimelinePlaceholder(ctx, canvasWidth, canvasHeight) {
        ctx.save();

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw clock icon
        ctx.fillStyle = '#666';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏱️', canvasWidth / 2, canvasHeight / 2 - 80);

        // Draw text
        ctx.fillStyle = '#888';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('NO ACTIVE CLIP', canvasWidth / 2, canvasHeight / 2 + 20);

        ctx.font = '20px Arial';
        const timeText = `Time: ${this.formatTime(this.currentTime)} / ${this.formatTime(this.totalDuration)}`;
        ctx.fillText(timeText, canvasWidth / 2, canvasHeight / 2 + 60);

        ctx.restore();
    }

    renderTextOverlays(ctx, width, height) {
        const shouldFade = this.shouldUseFadeAnimation();

        // Render static quote/author/watermark
        let textOpacity = 1.0;
        if (shouldFade) {
            textOpacity = this.calculateFadeOpacity(this.currentTime, this.totalDuration);
        }

        if (this.currentData.quote) {
            this.drawText(ctx, this.currentData.quote, width, height, 'quote', textOpacity);
        }

        if (this.currentData.author) {
            this.drawText(ctx, this.currentData.author, width, height, 'author', textOpacity);
        }

        if (this.currentData.watermark) {
            this.drawText(ctx, this.currentData.watermark, width, height, 'watermark', 1.0); // Watermark never fades
        }

        // Render timed captions (vid-1.3, vid-1.4 style - no fade for captions)
        if (this.currentData.captions) {
            for (const caption of this.currentData.captions) {
                const start = caption.begin !== undefined ? caption.begin : (caption.start || 0);
                const duration = caption.duration || 3;

                if (this.currentTime >= start && this.currentTime < start + duration) {
                    // Captions in vid-1.3/vid-1.4 don't fade - they appear/disappear instantly
                    this.drawText(ctx, caption.text, width, height, 'caption', 1.0);
                    break;
                }
            }
        }
    }

    // Match backend text rendering from endpoints
    drawText(ctx, text, canvasWidth, canvasHeight, type, opacity = 1.0) {
        ctx.save();

        // Apply fade opacity
        ctx.globalAlpha = opacity;

        // No scaling needed - using full 1080x1920 resolution
        const textLayout = this.calculateTextLayout(text, '');

        let fontSize, y, textAlign, color, maxWidth;

        switch (type) {
            case 'quote':
            case 'caption':
                fontSize = 44; // Match backend fontSize=44 exactly
                color = '#ffffff';
                textAlign = 'center';

                // Use Vid-1.2 positioning logic
                const videoHeight = 800;
                const totalGroupHeight = textLayout.totalTextHeight + videoHeight;
                const groupStartY = (canvasHeight - totalGroupHeight) / 2;
                y = groupStartY + textLayout.topPadding;
                maxWidth = canvasWidth * 0.85;
                break;

            case 'author':
                fontSize = 32; // Match backend authorFontSize=32 exactly
                color = '#ffffff';
                textAlign = 'center';
                y = canvasHeight * 0.65;
                maxWidth = canvasWidth * 0.85;
                break;

            case 'watermark':
                fontSize = 40; // Match backend fontSize=40 exactly
                color = 'rgba(255, 255, 255, 0.4)'; // Match backend opacity
                textAlign = 'center';
                // Match backend y=(h-text_h)/2 - center vertically accounting for text height
                y = (canvasHeight - fontSize) / 2;
                maxWidth = canvasWidth * 0.8;
                break;
        }

        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px Impact, Arial, sans-serif`; // Match backend Impact font
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'top';

        // Text shadow matching backend exactly
        if (type === 'watermark') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 0; // Backend doesn't use blur
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
            ctx.shadowBlur = 0; // Backend doesn't use blur
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }

        // Word wrap using backend logic
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (testLine.length <= charsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);

        // Draw lines
        const lineHeight = fontSize * 1.4;
        const x = canvasWidth / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line, x, y + i * lineHeight);
        });

        ctx.restore();
    }

    // Calculate text layout using backend logic from utils.js
    calculateTextLayout(quote, author) {
        const topPadding = 100;
        const sidePadding = 80;
        const bottomPadding = 80;
        const maxWidth = 1080 - (sidePadding * 2);
        const fontSize = 44;
        const authorFontSize = 32;
        const lineHeight = fontSize * 1.4;
        const authorLineHeight = authorFontSize * 1.4;

        const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
        const words = quote.split(' ');
        let lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (testLine.length <= charsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);

        const quoteHeight = lines.length * lineHeight;
        const authorHeight = author ? authorLineHeight : 0;
        const spaceBetween = author ? 40 : 0;
        const totalTextHeight = topPadding + quoteHeight + spaceBetween + authorHeight + bottomPadding;

        return {
            fontSize,
            authorFontSize,
            lineHeight,
            authorLineHeight,
            lines,
            topPadding,
            sidePadding,
            bottomPadding,
            quoteHeight,
            authorHeight,
            spaceBetween,
            totalTextHeight
        };
    }

    renderTimeline() {
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

    renderVideoTimeline() {
        const container = document.getElementById('videoTimeline');
        if (!container) return;

        container.innerHTML = '';

        if (this.currentData.clips && this.currentData.clips.length > 0) {
            this.currentData.clips.forEach((clip, index) => {
                const clipEl = this.createTimelineClip(clip, index, 'video');
                container.appendChild(clipEl);
            });
        } else if (this.currentData.imageUrl || this.currentData.videoUrl) {
            const duration = this.currentData.duration || 30;
            const clipEl = document.createElement('div');
            clipEl.className = 'timeline-clip';
            clipEl.style.left = '0px';
            clipEl.style.width = `${duration * this.timelineZoom}px`;
            clipEl.innerHTML = `<i class="fas fa-${this.currentData.imageUrl ? 'image' : 'video'}"></i> Media (${duration}s)`;
            container.appendChild(clipEl);
        }

        if (!container.children.length) {
            container.innerHTML = '<div style="color: #666; padding: 8px; font-size: 12px;">No video clips</div>';
        }
    }

    renderTextTimeline() {
        const container = document.getElementById('textTimeline');
        container.innerHTML = '';

        if (this.currentData.captions) {
            this.currentData.captions.forEach((caption, index) => {
                const clipEl = this.createTimelineClip(caption, index, 'text');
                container.appendChild(clipEl);
            });
        }

        if (!container.children.length) {
            container.innerHTML = '<div style="color: #666; padding: 8px; font-size: 12px;">No captions</div>';
        }
    }

    renderAudioTimeline() {
        const container = document.getElementById('audioTimeline');
        container.innerHTML = '';

        if (this.currentData.audioUrl || this.currentData.instagramUrl) {
            const duration = this.currentData.duration || 15;
            const clipEl = document.createElement('div');
            clipEl.className = 'timeline-clip audio';
            clipEl.style.left = '0px';
            clipEl.style.width = `${duration * this.timelineZoom}px`;
            clipEl.innerHTML = `<i class="fas fa-music"></i> Audio (${duration}s)`;
            container.appendChild(clipEl);
        }

        if (!container.children.length) {
            container.innerHTML = '<div style="color: #666; padding: 8px; font-size: 12px;">No audio</div>';
        }
    }

    createTimelineClip(item, index, type) {
        const start = item.begin || item.start || 0;
        const duration = item.duration || (type === 'text' ? 3 : 5);

        const clipEl = document.createElement('div');
        clipEl.className = `timeline-clip ${type === 'text' ? 'caption' : ''}`;
        clipEl.style.left = `${start * this.timelineZoom}px`;
        clipEl.style.width = `${duration * this.timelineZoom}px`;
        clipEl.dataset.index = index;
        clipEl.dataset.type = type;

        if (type === 'video') {
            clipEl.innerHTML = `
                <div class="timeline-clip-resize-handle left"></div>
                <i class="fas fa-video"></i> 
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

        this.setupClipInteractions(clipEl, item, index, type);
        return clipEl;
    }

    setupClipInteractions(clipEl, item, index, type) {
        clipEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('timeline-clip-resize-handle')) return;
            e.stopPropagation();

            // Remove selection from all clips
            document.querySelectorAll('.timeline-clip').forEach(el => el.classList.remove('selected'));
            clipEl.classList.add('selected');

            // Jump playhead to clip start position
            this.currentTime = item.begin || item.start || 0;
            this.updatePlayheadPosition();
            this.updateTimeDisplay();

            console.log(`🎯 Jumped to ${type} clip at ${this.currentTime}s`);
        });

        clipEl.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('timeline-clip-resize-handle')) return;
            // Double-click behavior can be different if needed
            this.currentTime = item.begin || item.start || 0;
            this.updatePlayheadPosition();
            this.updateTimeDisplay();
        });

        this.makeDraggable(clipEl, item, index, type);
        this.makeResizable(clipEl, item, index, type);
    }

    makeDraggable(clipEl, item, index, type) {
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        let originalStart = 0;

        const onMouseDown = (e) => {
            if (e.target.classList.contains('timeline-clip-resize-handle')) return;

            isDragging = true;
            startX = e.clientX;
            originalStart = item.start || 0;
            startLeft = originalStart * this.timelineZoom;
            clipEl.classList.add('dragging');
            document.body.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const deltaX = e.clientX - startX;
            let newLeft = Math.max(0, startLeft + deltaX);
            let newStart = newLeft / this.timelineZoom;

            const snapResult = this.checkSnapping(newStart, item.duration || 5, index, type);
            if (snapResult.snapped) {
                newStart = snapResult.position;
                newLeft = newStart * this.timelineZoom;
                clipEl.classList.add('snapping');
            } else {
                clipEl.classList.remove('snapping');
            }

            const hasCollision = this.checkCollision(newStart, item.duration || 5, index, type);
            if (hasCollision) {
                clipEl.classList.add('collision-warning');
            } else {
                clipEl.classList.remove('collision-warning');
                item.start = Math.max(0, newStart);
                clipEl.style.left = `${item.start * this.timelineZoom}px`;
            }
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                clipEl.classList.remove('dragging', 'snapping', 'collision-warning');
                document.body.style.cursor = '';

                const hasCollision = this.checkCollision(item.start, item.duration || 5, index, type);
                if (hasCollision) {
                    item.start = originalStart;
                    clipEl.style.left = `${originalStart * this.timelineZoom}px`;
                    this.showNotification('Cannot place clip - collision detected!', 'error');
                } else {
                    this.calculateTotalDuration();
                    this.renderProperties();
                    this.autoSave();
                }
            }
        };

        clipEl.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    makeResizable(clipEl, item, index, type) {
        const leftHandle = clipEl.querySelector('.timeline-clip-resize-handle.left');
        const rightHandle = clipEl.querySelector('.timeline-clip-resize-handle.right');

        if (!leftHandle || !rightHandle) return;

        let isResizing = false;
        let resizeDirection = null;
        let startX = 0;
        let originalStart = 0;
        let originalDuration = 0;

        const onMouseDown = (e, direction) => {
            e.stopPropagation();
            e.preventDefault();
            isResizing = true;
            resizeDirection = direction;
            startX = e.clientX;
            originalStart = item.start || 0;
            originalDuration = item.duration || 5;
            document.body.style.cursor = 'ew-resize';
            clipEl.classList.add('resizing');
        };

        const onMouseMove = (e) => {
            if (!isResizing) return;
            e.preventDefault();

            const deltaX = e.clientX - startX;
            const deltaTime = deltaX / this.timelineZoom;

            if (resizeDirection === 'left') {
                let newStart = Math.max(0, originalStart + deltaTime);
                let newDuration = Math.max(0.5, originalDuration - deltaTime);

                // Check for cross-layer snapping
                const snapResult = this.checkResizeSnapping(newStart, newDuration, index, type, 'left');
                if (snapResult.snapped) {
                    newStart = snapResult.position;
                    newDuration = originalStart + originalDuration - newStart;
                    clipEl.classList.add('snapping');
                } else {
                    clipEl.classList.remove('snapping');
                }

                if (!this.checkCollision(newStart, newDuration, index, type)) {
                    item.start = newStart;
                    item.duration = newDuration;
                    clipEl.style.left = `${newStart * this.timelineZoom}px`;
                    clipEl.style.width = `${newDuration * this.timelineZoom}px`;
                    this.updateClipText(clipEl, item, index, type);
                }
            } else if (resizeDirection === 'right') {
                let newDuration = Math.max(0.5, originalDuration + deltaTime);
                const newEnd = originalStart + newDuration;

                // Check for cross-layer snapping
                const snapResult = this.checkResizeSnapping(originalStart, newDuration, index, type, 'right');
                if (snapResult.snapped) {
                    newDuration = snapResult.position - originalStart;
                    clipEl.classList.add('snapping');
                } else {
                    clipEl.classList.remove('snapping');
                }

                if (!this.checkCollision(item.start, newDuration, index, type)) {
                    item.duration = newDuration;
                    clipEl.style.width = `${newDuration * this.timelineZoom}px`;
                    this.updateClipText(clipEl, item, index, type);
                }
            }
        };

        const onMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                resizeDirection = null;
                document.body.style.cursor = '';
                clipEl.classList.remove('resizing', 'snapping');
                this.calculateTotalDuration();
                this.renderProperties();
                this.autoSave();
            }
        };

        leftHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'left'));
        rightHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updateClipText(clipEl, item, index, type) {
        const span = clipEl.querySelector('span');
        if (!span) return;

        const duration = item.duration || 5;
        if (type === 'video') {
            span.textContent = `Clip ${index + 1} (${duration.toFixed(1)}s)`;
        } else if (type === 'text') {
            const text = item.text || '';
            span.textContent = `${text.substring(0, 15)}${text.length > 15 ? '...' : ''}`;
        }
    }

    checkCollision(start, duration, currentIndex, type) {
        const end = start + duration;
        const clips = this.getClipsOfType(type);

        for (let i = 0; i < clips.length; i++) {
            if (i === currentIndex) continue;

            const otherClip = clips[i];
            const otherStart = otherClip.start || 0;
            const otherDuration = otherClip.duration || 5;
            const otherEnd = otherStart + otherDuration;

            if (start < otherEnd && end > otherStart) {
                return true;
            }
        }

        return false;
    }

    checkSnapping(position, duration, currentIndex, type) {
        const snapThreshold = 10 / this.timelineZoom;
        const clipEnd = position + duration;
        const clips = this.getClipsOfType(type);

        for (let i = 0; i < clips.length; i++) {
            if (i === currentIndex) continue;

            const otherClip = clips[i];
            const otherStart = otherClip.start || 0;
            const otherEnd = otherStart + (otherClip.duration || 5);

            if (Math.abs(position - otherEnd) < snapThreshold) {
                return { snapped: true, position: otherEnd };
            }

            if (Math.abs(position - otherStart) < snapThreshold) {
                return { snapped: true, position: otherStart };
            }
        }

        for (let i = 0; i < clips.length; i++) {
            if (i === currentIndex) continue;

            const otherClip = clips[i];
            const otherStart = otherClip.start || 0;
            const otherEnd = otherStart + (otherClip.duration || 5);

            if (Math.abs(clipEnd - otherStart) < snapThreshold) {
                const newStart = otherStart - duration;
                if (newStart >= 0) {
                    return { snapped: true, position: newStart };
                }
            }

            if (Math.abs(clipEnd - otherEnd) < snapThreshold) {
                const newStart = otherEnd - duration;
                if (newStart >= 0) {
                    return { snapped: true, position: newStart };
                }
            }
        }

        return { snapped: false };
    }

    // Find next available position for new clips to avoid overlaps
    findNextAvailablePosition(type, duration) {
        const existingClips = this.getClipsOfType(type);

        // Start at time 0
        let candidateStart = 0;

        // Keep checking positions until we find one that doesn't overlap
        while (true) {
            let hasOverlap = false;

            for (const clip of existingClips) {
                const clipStart = clip.start || 0;
                const clipEnd = clipStart + (clip.duration || (type === 'text' ? 3 : 5));
                const candidateEnd = candidateStart + duration;

                // Check if candidate overlaps with existing clip
                if (candidateStart < clipEnd && candidateEnd > clipStart) {
                    hasOverlap = true;
                    // Move candidate to end of this clip
                    candidateStart = clipEnd;
                    break;
                }
            }

            if (!hasOverlap) {
                return candidateStart;
            }
        }
    }

    // Cross-layer snapping for resize operations
    checkResizeSnapping(start, duration, currentIndex, currentType, direction) {
        const snapThreshold = 15 / this.timelineZoom; // Slightly larger threshold for easier snapping
        const end = start + duration;

        // Get all clips from all layers
        const allClips = [];

        // Video clips
        if (this.currentData.clips) {
            this.currentData.clips.forEach((clip, i) => {
                if (currentType !== 'video' || i !== currentIndex) {
                    allClips.push({
                        start: clip.start || 0,
                        end: (clip.start || 0) + (clip.duration || 5),
                        type: 'video'
                    });
                }
            });
        }

        // Caption clips
        if (this.currentData.captions) {
            this.currentData.captions.forEach((caption, i) => {
                if (currentType !== 'text' || i !== currentIndex) {
                    allClips.push({
                        start: caption.start || 0,
                        end: (caption.start || 0) + (caption.duration || 3),
                        type: 'text'
                    });
                }
            });
        }

        // Audio clips (add support for audio layer snapping)
        if (this.currentData.audioUrl || this.currentData.instagramUrl) {
            if (currentType !== 'audio') {
                allClips.push({
                    start: 0,
                    end: this.currentData.duration || 15,
                    type: 'audio'
                });
            }
        }

        // Check snapping based on direction
        if (direction === 'left') {
            // Snap start to other clips' start or end
            for (const clip of allClips) {
                if (Math.abs(start - clip.start) < snapThreshold) {
                    return { snapped: true, position: clip.start, snapType: clip.type };
                }
                if (Math.abs(start - clip.end) < snapThreshold) {
                    return { snapped: true, position: clip.end, snapType: clip.type };
                }
            }
        } else if (direction === 'right') {
            // Snap end to other clips' start or end
            for (const clip of allClips) {
                if (Math.abs(end - clip.start) < snapThreshold) {
                    return { snapped: true, position: clip.start, snapType: clip.type };
                }
                if (Math.abs(end - clip.end) < snapThreshold) {
                    return { snapped: true, position: clip.end, snapType: clip.type };
                }
            }
        }

        return { snapped: false };
    }

    getClipsOfType(type) {
        if (type === 'video') return this.currentData.clips || [];
        if (type === 'text') return this.currentData.captions || [];
        if (type === 'audio') return this.currentData.audio || [];
        return [];
    }

    updatePlayheadPosition() {
        const playhead = document.getElementById('globalPlayhead');
        if (!playhead) return;
        
        // Calculate position based on timeline container offset
        const timelineArea = document.querySelector('.timeline-area');
        const trackLabel = document.querySelector('.track-label');
        
        let baseOffset = 0;
        if (trackLabel) {
            baseOffset = trackLabel.offsetWidth || 150;
        } else {
            baseOffset = 150; // fallback
        }
        
        const position = baseOffset + (this.currentTime * this.timelineZoom);
        playhead.style.left = `${position}px`;
    }

    updateTimeDisplay() {
        const display = document.getElementById('previewTimeDisplay');
        if (display) {
            display.textContent = `${this.formatTime(this.currentTime)} / ${this.formatTime(this.totalDuration)}`;
        }
    }

    updateFullscreenTimeDisplay() {
        const display = document.getElementById('fullscreenTimeDisplay');
        if (display) {
            display.textContent = `${this.formatTime(this.currentTime)} / ${this.formatTime(this.totalDuration)}`;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    renderProperties() {
        const container = document.getElementById('propertiesContent');
        if (!this.currentData) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-file-import"></i><p>Load a JSON file to start editing</p></div>';
            return;
        }

        let html = '';

        if (this.currentData.quote !== undefined) {
            html += this.createFormGroup('quote', 'Quote', this.currentData.quote, 'textarea');
        }

        if (this.currentData.author !== undefined) {
            html += this.createFormGroup('author', 'Author', this.currentData.author, 'text');
        }

        if (this.currentData.watermark !== undefined) {
            html += this.createFormGroup('watermark', 'Watermark', this.currentData.watermark, 'text');
        }

        if (this.currentData.imageUrl !== undefined) {
            html += this.createFormGroup('imageUrl', 'Image URL', this.currentData.imageUrl, 'url');
            if (this.currentData.imageDescription !== undefined) {
                html += this.createFormGroup('imageDescription', 'Image Description', this.currentData.imageDescription, 'textarea');
            }
        }

        if (this.currentData.videoUrl !== undefined) {
            html += this.createFormGroup('videoUrl', 'Video URL', this.currentData.videoUrl, 'url');
            if (this.currentData.videoDescription !== undefined) {
                html += this.createFormGroup('videoDescription', 'Video Description', this.currentData.videoDescription, 'textarea');
            }
        }

        if (this.currentData.audioUrl !== undefined) {
            html += this.createFormGroup('audioUrl', 'Audio URL', this.currentData.audioUrl, 'text');
            if (this.currentData.audioDescription !== undefined) {
                html += this.createFormGroup('audioDescription', 'Audio Description', this.currentData.audioDescription, 'textarea');
            }
        }

        if (this.currentData.instagramUrl !== undefined) {
            html += this.createFormGroup('instagramUrl', 'Instagram URL (audio extracted by backend)', this.currentData.instagramUrl, 'url');
            if (this.currentData.instagramDescription !== undefined) {
                html += this.createFormGroup('instagramDescription', 'Instagram Description', this.currentData.instagramDescription, 'textarea');
            }
            html += `<div class="form-group" style="background: #fff3cd; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> Instagram audio will be extracted when rendering on the backend. 
                    Preview shows video only.
                </p>
            </div>`;
        }

        if (this.currentData.duration !== undefined) {
            html += this.createFormGroup('duration', 'Duration (seconds)', this.currentData.duration, 'number');
        }

        // Add overlay toggle control
        html += this.createOverlayToggle();

        if (this.currentData.clips) {
            html += this.renderClipsSection();
        }

        if (this.currentData.captions) {
            html += this.renderCaptionsSection();
        }

        container.innerHTML = html;
        this.attachPropertyListeners();
    }

    createFormGroup(id, label, value, type = 'text') {
        const inputElement = type === 'textarea'
            ? `<textarea id="${id}" rows="3">${value || ''}</textarea>`
            : `<input type="${type}" id="${id}" value="${value || ''}" ${type === 'number' ? 'min="0" step="0.1"' : ''}>`;

        return `
            <div class="form-group">
                <label for="${id}">${label}</label>
                ${inputElement}
            </div>
        `;
    }

    createOverlayToggle() {
        const isChecked = this.currentData.overlay ? 'checked' : '';
        return `
            <div class="form-group overlay-toggle">
                <label class="toggle-label">
                    <input type="checkbox" id="overlayToggle" ${isChecked} onchange="videoEditor.toggleOverlay(this.checked)">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">
                        <i class="fas fa-layer-group"></i> Radial Overlay Effect
                    </span>
                </label>
                <div class="overlay-description">
                    <small>Applies a cinematic radial vignette effect that darkens the edges while keeping the center bright</small>
                </div>
            </div>
        `;
    }

    renderClipsSection() {
        // Count image vs video clips
        let imageCount = 0;
        let videoCount = 0;

        this.currentData.clips.forEach(clip => {
            const hasImageUrl = clip.imageurl && clip.imageurl.trim() !== '';
            const hasVideoUrl = (clip.videourl && clip.videourl.trim() !== '') || (clip.videoUrl && clip.videoUrl.trim() !== '');

            if (hasImageUrl) {
                imageCount++;
            } else if (hasVideoUrl) {
                // Check if the videoUrl is actually an image (fallback for legacy structure)
                const mediaUrl = clip.videourl || clip.videoUrl;
                if (this.isImageUrl(mediaUrl)) {
                    imageCount++;
                } else {
                    videoCount++;
                }
            } else {
                // Empty clip - default to video since that's what addClip() creates
                videoCount++;
            }
        });

        const totalCount = this.currentData.clips.length;
        const countBreakdown = totalCount > 0 ?
            ` (${videoCount} video${videoCount !== 1 ? 's' : ''}, ${imageCount} image${imageCount !== 1 ? 's' : ''})` :
            ` (${totalCount})`;

        let html = `
            <div class="clips-section">
                <div class="clips-header">
                    <h3><i class="fas fa-film"></i> Clips${countBreakdown}</h3>
                    <button class="btn-small" onclick="videoEditor.addClip()">
                        <i class="fas fa-plus"></i> Add Clip
                    </button>
                </div>
        `;

        this.currentData.clips.forEach((clip, index) => {
            // Determine if this is an image or video clip using the new structure
            const hasImageUrl = clip.imageurl && clip.imageurl.trim() !== '';
            const hasVideoUrl = (clip.videourl && clip.videourl.trim() !== '') || (clip.videoUrl && clip.videoUrl.trim() !== '');

            let mediaUrl = '';
            let isImage = false;
            let propertyName = '';

            if (hasImageUrl) {
                mediaUrl = clip.imageurl;
                isImage = true;
                propertyName = 'imageurl';
            } else if (hasVideoUrl) {
                mediaUrl = clip.videourl || clip.videoUrl;
                isImage = this.isImageUrl(mediaUrl); // Fallback check for legacy videoUrl
                propertyName = 'videourl';
            }

            const clipIcon = isImage ? 'fas fa-image' : 'fas fa-video';
            const clipType = isImage ? 'Image' : 'Video';
            const clipTypeClass = isImage ? 'image-clip' : 'video-clip';

            html += `
                <div class="clip-item ${clipTypeClass}">
                    <div class="clip-item-header">
                        <span><i class="${clipIcon}"></i> ${clipType} Clip ${index + 1}</span>
                        <div class="clip-header-actions">
                            ${!isImage && mediaUrl ? `
                            <button class="btn-icon edit-video" onclick="videoEditor.editVideoClip(${index})" title="Edit Video Clip">
                                <i class="fas fa-edit"></i>
                            </button>
                            ` : ''}
                            <button class="btn-icon toggle-type" onclick="videoEditor.toggleClipType(${index})" title="Toggle between Image and Video">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button class="btn-icon delete" onclick="videoEditor.deleteClip(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="clip-field">
                        <label>${clipType} URL</label>
                        <input type="text" value="${mediaUrl}" onchange="videoEditor.updateClipUrl(${index}, this.value)">
                    </div>
                    <div class="clip-field">
                        <label>Description</label>
                        <textarea rows="2" placeholder="Describe this ${clipType.toLowerCase()} content..." onchange="videoEditor.updateClip(${index}, 'description', this.value)">${clip.description || ''}</textarea>
                    </div>
                    ${!isImage ? `
                    <div class="clip-field">
                        <label>Begin (seconds) <small style="color: #666;">- Source video start position</small></label>
                        <input type="number" value="${clip.begin || 0}" min="0" step="0.1" onchange="videoEditor.updateClip(${index}, 'begin', parseFloat(this.value))">
                    </div>
                    ` : ''}
                    <div class="clip-field">
                        <label>Start Time (seconds) <small style="color: #666;">- Timeline position</small></label>
                        <input type="number" value="${clip.start || 0}" min="0" step="0.1" onchange="videoEditor.updateClip(${index}, 'start', parseFloat(this.value))">
                    </div>
                    <div class="clip-field">
                        <label>Duration (seconds)</label>
                        <input type="number" value="${clip.duration || 5}" min="0.1" step="0.1" onchange="videoEditor.updateClip(${index}, 'duration', parseFloat(this.value))">
                    </div>
                    ${clip.volume !== undefined ? `
                    <div class="clip-field">
                        <label>Volume (%)</label>
                        <input type="number" value="${clip.volume || 100}" min="0" max="200" step="1" onchange="videoEditor.updateClip(${index}, 'volume', parseFloat(this.value))">
                    </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    renderCaptionsSection() {
        let html = `
            <div class="captions-section">
                <div class="clips-header">
                    <h3><i class="fas fa-closed-captioning"></i> Captions (${this.currentData.captions.length})</h3>
                    <button class="btn-small" onclick="videoEditor.addCaption()" style="background: #ff9800;">
                        <i class="fas fa-plus"></i> Add Caption
                    </button>
                </div>
        `;

        this.currentData.captions.forEach((caption, index) => {
            html += `
                <div class="caption-item">
                    <div class="clip-item-header">
                        <span><i class="fas fa-comment"></i> Caption ${index + 1}</span>
                        <button class="btn-icon delete" onclick="videoEditor.deleteCaption(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="clip-field">
                        <label>Caption Text</label>
                        <input type="text" value="${caption.text || ''}" onchange="videoEditor.updateCaption(${index}, 'text', this.value)">
                    </div>
                    <div class="clip-field">
                        <label>Start Time (seconds)</label>
                        <input type="number" value="${caption.start || 0}" min="0" step="0.1" onchange="videoEditor.updateCaption(${index}, 'start', parseFloat(this.value))">
                    </div>
                    <div class="clip-field">
                        <label>Duration (seconds)</label>
                        <input type="number" value="${caption.duration || 3}" min="0.1" step="0.1" onchange="videoEditor.updateCaption(${index}, 'duration', parseFloat(this.value))">
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    attachPropertyListeners() {
        const inputs = document.querySelectorAll('#propertiesContent input:not([onchange]), #propertiesContent textarea:not([onchange])');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.id;
                let value = e.target.value;

                if (e.target.type === 'number') {
                    value = parseFloat(value) || 0;
                }

                if (this.currentData && field) {
                    this.currentData[field] = value;
                    this.autoSave();
                }
            });
        });
    }

    toggleOverlay(enabled) {
        if (this.currentData) {
            this.currentData.overlay = enabled;
            this.autoSave();
            console.log(`🎨 Overlay ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    addClip() {
        if (!this.currentData.clips) this.currentData.clips = [];

        // Find next available position that doesn't overlap with existing clips
        const newStart = this.findNextAvailablePosition('video', 5);

        this.currentData.clips.push({
            videourl: '', // Use the new structure - default to video
            description: '',
            begin: 0, // NEW: Begin parameter for source video start position
            start: newStart,
            duration: 5
        });

        this.calculateTotalDuration();
        this.renderProperties();
        this.renderTimeline();
        this.showNotification('Clip added', 'success');
    }

    updateClip(index, field, value) {
        if (this.currentData.clips && this.currentData.clips[index]) {
            this.currentData.clips[index][field] = value;
            this.calculateTotalDuration();
            this.renderTimeline();
            this.autoSave();

            if ((field === 'videoUrl' || field === 'videourl' || field === 'imageurl') && value) {
                this.preloadMedia();
            }
        }
    }

    updateClipUrl(index, value) {
        if (!this.currentData.clips || !this.currentData.clips[index]) return;

        const clip = this.currentData.clips[index];
        const trimmedValue = value.trim();

        if (trimmedValue === '') {
            // Clear all URL fields if empty
            delete clip.videoUrl;
            delete clip.videourl;
            delete clip.imageurl;
        } else {
            // Determine if this is an image or video URL
            const isImage = this.isImageUrl(trimmedValue);

            // Clear all URL fields first
            delete clip.videoUrl;
            delete clip.videourl;
            delete clip.imageurl;

            // Set the appropriate field based on media type
            if (isImage) {
                clip.imageurl = trimmedValue;
            } else {
                clip.videourl = trimmedValue;
            }
        }

        this.calculateTotalDuration();
        this.renderProperties();
        this.renderTimeline();
        this.preloadMedia();
        this.autoSave();
    }

    toggleClipType(index) {
        if (!this.currentData.clips || !this.currentData.clips[index]) return;

        const clip = this.currentData.clips[index];
        const hasImageUrl = clip.imageurl && clip.imageurl.trim() !== '';
        const currentUrl = hasImageUrl ? clip.imageurl : (clip.videourl || clip.videoUrl || '');
        const isCurrentlyImage = hasImageUrl;

        // Show a modal or prompt to get the new URL
        const newType = isCurrentlyImage ? 'video' : 'image';
        const currentType = isCurrentlyImage ? 'image' : 'video';

        // Provide helpful examples based on the target type
        const examples = isCurrentlyImage ?
            'Examples:\n• https://example.com/video.mp4\n• https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' :
            'Examples:\n• https://picsum.photos/800/600\n• https://example.com/image.jpg';

        const newUrl = prompt(
            `🔄 Change Clip ${index + 1} from ${currentType} to ${newType}\n\n${examples}\n\nEnter the new ${newType} URL:`,
            ''
        );

        if (newUrl !== null && newUrl.trim() !== '') {
            const trimmedUrl = newUrl.trim();

            // Validate that the new URL matches the intended type
            const urlIsImage = this.isImageUrl(trimmedUrl);
            const expectedIsImage = !isCurrentlyImage;

            if (urlIsImage !== expectedIsImage) {
                const actualType = urlIsImage ? 'image' : 'video';
                const warning = `⚠️ The URL you entered appears to be a ${actualType}, but you're trying to change to ${newType}.\n\nDo you want to continue anyway?`;

                if (!confirm(warning)) {
                    return;
                }
            }

            // Clear all URL fields first
            delete clip.videoUrl;
            delete clip.videourl;
            delete clip.imageurl;

            // Set the appropriate field based on the intended type (not detected type)
            if (!isCurrentlyImage) {
                // Switching to image
                clip.imageurl = trimmedUrl;
            } else {
                // Switching to video
                clip.videourl = trimmedUrl;
            }

            // Update description placeholder if it's empty or generic
            if (!clip.description ||
                clip.description.includes('video/image content') ||
                clip.description.includes('Describe this') ||
                clip.description === 'Video content' ||
                clip.description === 'Image content') {
                clip.description = '';
            }

            // Refresh the properties panel and timeline
            this.renderProperties();
            this.renderTimeline();
            this.preloadMedia();
            this.autoSave();

            const actualType = this.isImageUrl(trimmedUrl) ? 'image' : 'video';
            this.showNotification(`✅ Clip ${index + 1} changed to ${actualType}`, 'success');
        }
    }

    deleteClip(index) {
        if (this.currentData.clips && confirm('Delete this clip?')) {
            this.currentData.clips.splice(index, 1);
            this.calculateTotalDuration();
            this.renderProperties();
            this.renderTimeline();
            this.autoSave();
        }
    }

    addCaption() {
        if (!this.currentData.captions) this.currentData.captions = [];

        // Find next available position that doesn't overlap with existing captions
        const newStart = this.findNextAvailablePosition('text', 3);

        this.currentData.captions.push({
            text: 'New Caption',
            start: newStart,
            duration: 3
        });

        this.calculateTotalDuration();
        this.renderProperties();
        this.renderTimeline();
        this.showNotification('Caption added', 'success');
    }

    updateCaption(index, field, value) {
        if (this.currentData.captions && this.currentData.captions[index]) {
            this.currentData.captions[index][field] = value;
            this.calculateTotalDuration();
            this.renderTimeline();
            this.autoSave();
        }
    }

    deleteCaption(index) {
        if (this.currentData.captions && confirm('Delete this caption?')) {
            this.currentData.captions.splice(index, 1);
            this.calculateTotalDuration();
            this.renderProperties();
            this.renderTimeline();
            this.autoSave();
        }
    }

    togglePlayPause() {
        console.log('🎬 togglePlayPause() called!');
        
        if (!this.currentData) {
            console.log('❌ No currentData available');
            this.showNotification('No video loaded!', 'error');
            return;
        }

        console.log(`🎬 Toggling playback: ${this.isPlaying} → ${!this.isPlaying}`);
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

        // Diagnostic info
        if (this.isPlaying) {
            setTimeout(() => this.logPlaybackStatus(), 1000);
        }
    }

    // Diagnostic method to check playback status
    logPlaybackStatus() {
        if (!this.isPlaying) return;

        const audioStatus = this.audioElement ? {
            currentTime: this.audioElement.currentTime.toFixed(2),
            duration: this.audioElement.duration?.toFixed(2) || 'unknown',
            readyState: this.audioElement.readyState,
            paused: this.audioElement.paused,
            ended: this.audioElement.ended,
            error: this.audioElement.error?.code || null
        } : null;

        console.log('🔍 Playback Status:', {
            isPlaying: this.isPlaying,
            timelineTime: this.currentTime.toFixed(2),
            totalDuration: this.totalDuration,
            hasAudio: !!this.audioElement,
            audioDisabled: this.audioDisabled,
            audioStatus: audioStatus,
            hasData: !!this.currentData,
            hasClips: this.currentData?.clips?.length || 0
        });

        // Check for sync issues
        if (this.audioElement && !this.audioElement.paused) {
            const timeDiff = Math.abs(this.audioElement.currentTime - this.currentTime);
            if (timeDiff > 1.0) {
                console.warn('⚠️ Audio/video sync issue - difference:', timeDiff.toFixed(2), 'seconds');
            }
        }
    }

    handleAudioPlayback() {
        if (!this.currentData || this.audioDisabled) return;

        const audioUrl = this.currentData.audioUrl || this.currentData.instagramUrl;
        if (!audioUrl) {
            console.log('🎵 No audio URL found in data');
            return;
        }

        // Validate audio URL
        if (!this.isValidAudioUrl(audioUrl)) {
            console.warn('🎵 Invalid or inaccessible audio URL:', audioUrl);
            this.showNotification('Audio file not accessible: ' + audioUrl, 'warning');
            return;
        }

        // For local files, give a helpful hint
        if (!audioUrl.includes('://')) {
            console.log('🎵 Local file detected. Make sure the file exists in the same directory as index.html');
        }

        console.log('🎵 Audio URL found:', audioUrl);

        if (this.isPlaying) {
            // Create or reuse audio element asynchronously
            this.setupAudioElement(audioUrl);
        } else {
            // Pause audio
            if (this.audioElement && !this.audioElement.paused) {
                this.audioElement.pause();
            }
        }
    }

    isValidAudioUrl(url) {
        // Check if it's a valid URL format
        try {
            new URL(url);
            return true;
        } catch {
            // Check if it's a relative path that might exist
            if (url.startsWith('/') || url.startsWith('./') || !url.includes('://')) {
                console.log('🎵 Local audio path detected:', url);
                return true; // Let the browser try to load it
            }

            // Check if it looks like a local file (has audio extension)
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
            if (audioExtensions.some(ext => url.toLowerCase().endsWith(ext))) {
                console.log('🎵 Local audio file detected:', url);
                return true;
            }

            return false;
        }
    }

    async setupAudioElement(audioUrl) {
        try {
            console.log('🎵 Setting up audio element for:', audioUrl);

            // Create or reuse audio element
            if (!this.audioElement || this.audioElement.src !== audioUrl) {
                if (this.audioElement) {
                    this.audioElement.pause();
                }

                this.audioElement = new Audio();

                // Set CORS for external URLs, but not for local files
                if (audioUrl.includes('://')) {
                    this.audioElement.crossOrigin = 'anonymous';
                    console.log('🎵 External URL detected, using CORS');
                } else {
                    console.log('🎵 Local file detected, no CORS needed');
                }

                this.audioElement.preload = 'auto'; // Changed to 'auto' for better loading
                this.audioElement.loop = false; // Ensure no looping
                this.audioElement.volume = 1.0; // Full volume

                // Set up comprehensive event handling
                this.audioElement.addEventListener('loadstart', () => {
                    console.log('🎵 Audio loading started:', audioUrl);
                });

                this.audioElement.addEventListener('loadedmetadata', () => {
                    console.log('🎵 Audio metadata loaded, duration:', this.audioElement.duration);
                });

                this.audioElement.addEventListener('loadeddata', () => {
                    console.log('🎵 Audio data loaded, ready to play');
                    this.tryPlayAudio();
                });

                this.audioElement.addEventListener('canplay', () => {
                    console.log('🎵 Audio can play');
                    this.tryPlayAudio();
                });

                this.audioElement.addEventListener('error', (e) => {
                    console.error('🎵 Audio loading error:', e, 'URL:', audioUrl);
                    const errorDetails = {
                        error: this.audioElement.error,
                        networkState: this.audioElement.networkState,
                        readyState: this.audioElement.readyState,
                        errorCode: this.audioElement.error?.code,
                        errorMessage: this.audioElement.error?.message
                    };
                    console.error('🎵 Audio error details:', errorDetails);

                    // Provide specific error messages
                    let errorMsg = 'Audio loading failed';
                    if (this.audioElement.error?.code === 4) {
                        errorMsg = audioUrl.includes('://') ?
                            'External audio file not found or blocked by CORS' :
                            'Local audio file not found';
                    } else if (this.audioElement.error?.code === 3) {
                        errorMsg = 'Audio file corrupted or unsupported format';
                    } else if (this.audioElement.error?.code === 2) {
                        errorMsg = audioUrl.includes('://') ?
                            'Network error - check internet connection' :
                            'Local file access error';
                    }

                    this.showNotification(errorMsg + ': ' + audioUrl, 'error');
                    this.audioElement = null; // Clear failed audio element
                });

                // Load audio source
                console.log('🎵 Loading audio source:', audioUrl);
                this.audioElement.src = audioUrl;
                this.audioElement.load(); // Explicitly trigger loading
            } else {
                console.log('🎵 Reusing existing audio element');
                this.tryPlayAudio();
            }
        } catch (error) {
            console.error('🎵 Audio setup failed:', error);
            this.audioElement = null;
        }
    }

    tryPlayAudio() {
        if (!this.audioElement || !this.isPlaying) return;

        console.log('🎵 Trying to play audio, readyState:', this.audioElement.readyState);

        if (this.audioElement.readyState >= 2) {
            try {
                // Only set audio time if there's a significant difference (avoid constant seeking)
                const targetTime = Math.max(0, Math.min(this.currentTime, this.audioElement.duration || this.currentTime));
                const timeDiff = Math.abs(this.audioElement.currentTime - targetTime);

                if (timeDiff > 0.5) { // Only seek if more than 0.5 seconds off
                    console.log('🎵 Syncing audio time from', this.audioElement.currentTime.toFixed(2), 'to', targetTime.toFixed(2));
                    this.audioElement.currentTime = targetTime;
                } else {
                    console.log('🎵 Audio time already synced:', this.audioElement.currentTime.toFixed(2));
                }

                // Play audio if not already playing
                if (this.audioElement.paused) {
                    console.log('🎵 Starting audio playback');
                    this.audioElement.play().then(() => {
                        console.log('🎵 Audio playback started successfully');
                    }).catch(e => {
                        console.warn('🎵 Audio play failed:', e.message);
                    });
                } else {
                    console.log('🎵 Audio already playing');
                }
            } catch (error) {
                console.warn('🎵 Audio sync failed:', error.message);
            }
        } else {
            console.log('🎵 Audio not ready yet, readyState:', this.audioElement.readyState);
        }
    }

    setupTimelineInteractions() {
        const tracks = document.getElementById('timelineTracks');
        tracks.addEventListener('click', (e) => {
            if (e.target.classList.contains('track-content')) {
                const rect = e.target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const time = x / this.timelineZoom;
                this.currentTime = Math.max(0, Math.min(time, this.totalDuration));

                // Seek audio to new position
                if (this.audioElement) {
                    this.audioElement.currentTime = this.currentTime;
                }

                this.updatePlayheadPosition();
                this.updateTimeDisplay();
            }
        });

        // Setup playhead dragging
        this.setupPlayheadDragging();
    }

    setupPlayheadDragging() {
        const playhead = document.getElementById('globalPlayhead');
        let isDragging = false;
        let startX = 0;
        let startTime = 0;

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startTime = this.currentTime;
            document.body.style.cursor = 'move';
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaTime = deltaX / this.timelineZoom;
            const newTime = Math.max(0, Math.min(startTime + deltaTime, this.totalDuration));

            this.currentTime = newTime;

            // Seek audio during drag
            if (this.audioElement) {
                this.audioElement.currentTime = this.currentTime;
            }

            this.updatePlayheadPosition();
            this.updateTimeDisplay();
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';

                // Final audio seek on mouse up
                if (this.audioElement) {
                    this.audioElement.currentTime = this.currentTime;
                }
            }
        };

        playhead.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    autoSave() {
        if (this.currentData) {
            localStorage.setItem('videoEditorProject', JSON.stringify({
                data: this.currentData,
                fileName: this.currentFileName,
                title: document.getElementById('videoTitle').value
            }));
        }
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('videoEditorProject');
        if (saved) {
            try {
                const project = JSON.parse(saved);
                if (project.data) {
                    this.loadData(project.data, project.fileName || 'saved-project.json');
                    if (project.title) {
                        document.getElementById('videoTitle').value = project.title;
                    }
                }
            } catch (e) {
                console.error('Failed to load saved project:', e);
            }
        }
    }

    async saveJson() {
        if (!this.currentData) {
            this.showNotification('No data to save!', 'error');
            return;
        }

        // Check if this is a Notion record that can be saved back to the database
        if (this.currentNotionRecord && this.currentNotionRecord.formula_id) {
            await this.saveToNotionDatabase();
        } else {
            // Fallback to local file download for non-Notion records
            this.saveJsonLocally();
        }
    }

    async saveToNotionDatabase() {
        try {
            this.showNotification('Saving to Notion database...', 'info');
            console.log(`🔄 Saving JSON to Notion record: ${this.currentNotionRecord.formula_id}`);

            // Clean up the data structure before saving
            const cleanedData = this.cleanDataForExport(this.currentData);

            const workerUrl = `https://notion-reader.debabratamaitra898.workers.dev/?formula_id=${encodeURIComponent(this.currentNotionRecord.formula_id)}`;

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for saves

            const response = await fetch(workerUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    json: cleanedData
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            this.showNotification(`✅ Saved to Notion database: ${this.currentNotionRecord.username} (${this.currentNotionRecord.formula_id})`, 'success');
            console.log(`✅ Successfully saved to Notion record: ${this.currentNotionRecord.formula_id}`);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Save timeout: Notion database took too long to respond');
                this.showNotification('Save timeout - Notion database is not responding', 'error');
                return;
            }
            console.error('❌ Error saving to Notion database:', error);
            this.showNotification(`Failed to save: ${error.message}`, 'error');

            // Offer fallback to local save
            if (confirm('Save failed. Would you like to download the JSON file locally instead?')) {
                this.saveJsonLocally();
            }
        }
    }

    saveJsonLocally() {
        // Clean up the data structure before saving
        const cleanedData = this.cleanDataForExport(this.currentData);

        const dataStr = JSON.stringify(cleanedData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.currentFileName || 'video-config.json';
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('JSON file downloaded locally!', 'success');
    }

    cleanDataForExport(data) {
        // Create a deep copy of the data
        const cleaned = JSON.parse(JSON.stringify(data));

        // Clean up clips array
        if (cleaned.clips && Array.isArray(cleaned.clips)) {
            cleaned.clips = cleaned.clips.map(clip => {
                const cleanedClip = { ...clip };

                // Ensure description parameter is always present
                if (!cleanedClip.description) {
                    cleanedClip.description = '';
                }

                // Determine if this is an image or video clip
                const hasImageUrl = cleanedClip.imageurl && cleanedClip.imageurl.trim() !== '';
                const hasVideoUrl = (cleanedClip.videourl && cleanedClip.videourl.trim() !== '') ||
                    (cleanedClip.videoUrl && cleanedClip.videoUrl.trim() !== '');

                let mediaUrl = '';
                let isImage = false;

                if (hasImageUrl) {
                    mediaUrl = cleanedClip.imageurl;
                    isImage = true;
                } else if (hasVideoUrl) {
                    mediaUrl = cleanedClip.videourl || cleanedClip.videoUrl;
                    isImage = this.isImageUrl(mediaUrl);
                }

                // Clean up URL parameters and set the correct one
                delete cleanedClip.videoUrl; // Remove legacy parameter
                delete cleanedClip.videourl;
                delete cleanedClip.imageurl;

                if (mediaUrl) {
                    if (isImage) {
                        cleanedClip.imageurl = mediaUrl;
                    } else {
                        cleanedClip.videourl = mediaUrl;
                    }
                }

                return cleanedClip;
            });
        }

        return cleaned;
    }

    async confirmData() {
        if (!this.currentData) {
            this.showNotification('No data to confirm!', 'error');
            return;
        }

        // Debug logging
        console.log('🔍 Debug - confirmData called');
        console.log('🔍 Debug - currentNotionRecord:', this.currentNotionRecord);
        console.log('🔍 Debug - currentNotionRecord exists:', !!this.currentNotionRecord);
        console.log('🔍 Debug - formula_id exists:', this.currentNotionRecord?.formula_id);

        // Check if this is a Notion record that can be confirmed in the database
        if (this.currentNotionRecord && this.currentNotionRecord.formula_id) {
            console.log('✅ Confirming via Notion database');
            await this.confirmNotionRecord();
        } else {
            console.log('⚠️ Falling back to local confirmation');
            console.log('⚠️ Reason: currentNotionRecord =', this.currentNotionRecord);
            // Fallback for non-Notion records
            this.confirmDataLocally();
        }

        // Always call webhook after confirmation (if webhook URL is configured)
        await this.callWebhook();
    }

    async confirmNotionRecord() {
        try {
            this.showNotification('Confirming record in Notion database...', 'info');
            console.log(`🔄 Confirming Notion record: ${this.currentNotionRecord.formula_id}`);

            // First, save the current JSON data
            const cleanedData = this.cleanDataForExport(this.currentData);

            const workerUrl = `https://notion-reader.debabratamaitra898.workers.dev/?formula_id=${encodeURIComponent(this.currentNotionRecord.formula_id)}`;

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(workerUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    json: cleanedData,
                    status: 'Confirmed'
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            // Update local record status
            this.currentNotionRecord.original_status = 'Confirmed';

            this.showNotification(`✅ Confirmed: ${this.currentNotionRecord.username} (${this.currentNotionRecord.formula_id}) - Status: Confirmed`, 'success');
            console.log(`✅ Successfully confirmed Notion record: ${this.currentNotionRecord.formula_id}`);
            console.log('Confirmed data:', cleanedData);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Confirm timeout: Notion database took too long to respond');
                this.showNotification('Confirm timeout - Notion database is not responding', 'error');
                return;
            }
            console.error('❌ Error confirming Notion record:', error);
            this.showNotification(`Failed to confirm: ${error.message}`, 'error');

            // Offer fallback to local confirm
            if (confirm('Confirm failed. Would you like to confirm locally instead?')) {
                this.confirmDataLocally();
            }
        }
    }

    confirmDataLocally() {
        // Clean up the data structure before confirming
        const cleanedData = this.cleanDataForExport(this.currentData);

        console.log('Confirmed data:', cleanedData);
        this.showNotification('Data confirmed locally! Ready for backend integration.', 'success');

        // Also log the cleaned JSON structure for easy copying
        console.log('JSON for backend:', JSON.stringify(cleanedData, null, 2));
    }

    async callWebhook() {
        if (!this.webhookUrl) {
            console.log('No webhook URL configured, skipping webhook call');
            return;
        }

        try {
            console.log('🔍 Debug - currentNotionRecord:', this.currentNotionRecord);
            
            // Prepare webhook payload
            const payload = {
                timestamp: new Date().toISOString(),
                action: 'confirm',
                data: this.cleanDataForExport(this.currentData)
            };

            // Add Notion record information if available
            if (this.currentNotionRecord) {
                console.log('🔄 Fetching ID column value from Notion via Cloudflare worker...');
                
                // Fetch the actual ID column value from Notion using the Cloudflare worker
                try {
                    const workerUrl = `https://notion-reader.debabratamaitra898.workers.dev/?json_id=${encodeURIComponent(this.currentNotionRecord.formula_id)}`;
                    const notionResponse = await fetch(workerUrl);
                    
                    if (notionResponse.ok) {
                        const notionData = await notionResponse.json();
                        console.log('📥 Notion record data:', notionData);
                        
                        // Extract endpoint from Notion data
                        const endpointValue = notionData.endpoint || 'master'; // Use endpoint from worker or default to 'master'
                        
                        console.log('🎯 Extracted endpoint value:', endpointValue);
                        
                        // Add detailed Notion record info with the actual ID column value and endpoint
                        payload.notion_record = {
                            formula_id: this.currentNotionRecord.formula_id,
                            username: this.currentNotionRecord.username,
                            page_id: this.currentNotionRecord.page_id,
                            status: this.currentNotionRecord.original_status,
                            id_column_value: notionData.formula_id, // This is the actual ID column value
                            endpoint: endpointValue
                        };
                        
                        // Add the ID column value and endpoint directly to top level for easy access
                        payload.notion_id = notionData.formula_id;
                        payload.notion_username = this.currentNotionRecord.username;
                        payload.endpoint = endpointValue;
                        
                        console.log('✅ Added Notion record with ID column value and endpoint:', payload.notion_record);
                        console.log('✅ ID column value at top level:', payload.notion_id);
                        console.log('✅ Endpoint at top level:', payload.endpoint);
                    } else {
                        console.error('❌ Failed to fetch ID column value from Notion worker');
                        // Fallback to using the formula_id we already have
                        payload.notion_record = {
                            formula_id: this.currentNotionRecord.formula_id,
                            username: this.currentNotionRecord.username,
                            page_id: this.currentNotionRecord.page_id,
                            status: this.currentNotionRecord.original_status,
                            endpoint: 'master' // Default endpoint when fetch fails
                        };
                        payload.notion_id = this.currentNotionRecord.formula_id;
                        payload.notion_username = this.currentNotionRecord.username;
                        payload.endpoint = 'master'; // Default endpoint when fetch fails
                    }
                } catch (fetchError) {
                    console.error('❌ Error fetching ID column value:', fetchError);
                    // Fallback to using the formula_id we already have
                    payload.notion_record = {
                        formula_id: this.currentNotionRecord.formula_id,
                        username: this.currentNotionRecord.username,
                        page_id: this.currentNotionRecord.page_id,
                        status: this.currentNotionRecord.original_status,
                        endpoint: 'master' // Default endpoint when fetch fails
                    };
                    payload.notion_id = this.currentNotionRecord.formula_id;
                    payload.notion_username = this.currentNotionRecord.username;
                    payload.endpoint = 'master'; // Default endpoint when fetch fails
                }
            } else {
                console.log('⚠️ No currentNotionRecord found - webhook will not include Notion ID');
            }

            console.log('🔗 Calling webhook via proxy:', this.webhookUrl);
            console.log('📦 Full webhook payload:', JSON.stringify(payload, null, 2));

            // Use the server-side webhook proxy to avoid CORS issues
            const response = await fetch('/webhook-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    webhookUrl: this.webhookUrl,
                    payload: payload
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Webhook called successfully via proxy');
                this.showNotification('Webhook called successfully!', 'success');
                
                if (result.response) {
                    console.log('📥 Webhook response:', result.response);
                }
            } else {
                throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('❌ Error calling webhook:', error);
            
            // Provide more specific error messages
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error - unable to reach webhook proxy server';
            }
            
            this.showNotification(`Webhook call failed: ${errorMessage}`, 'error');
            
            // Log additional debugging info
            console.log('🔍 Webhook debugging info:');
            console.log('- URL:', this.webhookUrl);
            console.log('- Payload size:', JSON.stringify(payload).length, 'characters');
            console.log('- Error:', error);
        }
    }

    updateButtonLabels() {
        const saveBtn = document.getElementById('saveBtn');
        const confirmBtn = document.getElementById('confirmBtn');

        if (this.currentNotionRecord) {
            saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save to Notion';
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm in Notion';
            saveBtn.title = `Save JSON to Notion record: ${this.currentNotionRecord.formula_id}`;
            confirmBtn.title = `Save and mark as Confirmed in Notion record: ${this.currentNotionRecord.formula_id}`;
            saveBtn.classList.add('notion-mode');
            confirmBtn.classList.add('notion-mode');
        } else {
            saveBtn.innerHTML = '<i class="fas fa-download"></i> Save';
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm';
            saveBtn.title = 'Download JSON file locally';
            confirmBtn.title = 'Confirm data locally (console output)';
            saveBtn.classList.remove('notion-mode');
            confirmBtn.classList.remove('notion-mode');
        }
    }

    showWebhookModal() {
        document.getElementById('webhookModal').classList.add('active');
        document.getElementById('webhookUrl').value = this.webhookUrl || '';
    }

    hideWebhookModal() {
        document.getElementById('webhookModal').classList.remove('active');
    }

    saveWebhookSettings() {
        const webhookUrl = document.getElementById('webhookUrl').value.trim();
        this.webhookUrl = webhookUrl;
        localStorage.setItem('webhookUrl', webhookUrl);
        this.hideWebhookModal();
        this.showNotification('Webhook settings saved!', 'success');
    }

    async testWebhook() {
        const webhookUrl = document.getElementById('webhookUrl').value.trim();
        if (!webhookUrl) {
            this.showNotification('Please enter a webhook URL first', 'error');
            return;
        }

        try {
            this.showNotification('Testing webhook...', 'info');
            
            const testPayload = {
                timestamp: new Date().toISOString(),
                action: 'test',
                message: 'This is a test webhook call from the Video Editor'
            };

            const response = await fetch('/webhook-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    webhookUrl: webhookUrl,
                    payload: testPayload
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showNotification('Webhook test successful!', 'success');
            } else {
                throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Webhook test failed:', error);
            this.showNotification(`Webhook test failed: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#5cb85c' :
            type === 'error' ? '#d9534f' :
                type === 'warning' ? '#f0ad4e' : '#4a90e2';

        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 16px 24px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        const duration = type === 'warning' ? 5000 : 3000; // Show warnings longer
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    // Clip Timeline Functions
    initializeClipTimeline(clip, video) {
        this.clipTimelineData = {
            clip: clip,
            video: video,
            duration: 0,
            begin: clip.begin || 0,
            clipDuration: clip.duration || 5,
            timelineWidth: 360, // Fixed width for timeline
            pixelsPerSecond: 20,
            durationLocked: false
        };

        // Wait for video metadata to load
        video.addEventListener('loadedmetadata', () => {
            this.clipTimelineData.duration = video.duration;
            this.setupClipTimelineLayout();
            this.setVideoToBeginTime();
        });

        // Handle video play - ensure it starts at begin time
        video.addEventListener('play', () => {
            this.setVideoToBeginTime();
            this.updatePlayButtonIcon(false); // Show pause icon
        });

        // Handle video pause
        video.addEventListener('pause', () => {
            this.updatePlayButtonIcon(true); // Show play icon
        });

        // Handle video time updates - stop at end of clip duration
        video.addEventListener('timeupdate', () => {
            this.handleVideoTimeUpdate();
        });

        // If metadata is already loaded
        if (video.readyState >= 1) {
            this.clipTimelineData.duration = video.duration;
            this.setupClipTimelineLayout();
            this.setVideoToBeginTime();
        }
    }

    setupClipTimelineLayout() {
        const data = this.clipTimelineData;
        const clipElement = document.getElementById('clipTimelineClip');
        const timelineTrack = document.querySelector('.clip-timeline-track');

        // Calculate timeline scale to fit the video duration into the available width
        data.pixelsPerSecond = data.timelineWidth / data.duration;

        // Set the timeline track width to match the video duration
        timelineTrack.style.width = `${data.timelineWidth}px`;

        // Generate time markers
        this.generateTimeMarkers();

        // Add visual feedback for the full video duration
        const timelineBg = document.getElementById('clipTimelineBg');
        timelineBg.style.width = `${data.timelineWidth}px`;

        // Position and size the clip rectangle based on begin and duration
        const clipStart = data.begin * data.pixelsPerSecond;
        const clipWidth = data.clipDuration * data.pixelsPerSecond;

        clipElement.style.left = `${clipStart}px`;
        clipElement.style.width = `${clipWidth}px`;

        // Calculate and display duration percentage
        const durationPercentage = ((data.clipDuration / data.duration) * 100).toFixed(1);

        // Update clip info display
        this.updateClipInfo();

        // Initialize lock button state
        this.updateTimelineVisualState();

        console.log(`📏 Clip timeline initialized: ${data.duration}s video, ${data.clipDuration}s clip (${clipWidth}px wide, ${durationPercentage}%) at ${data.begin}s`);
        console.log(`📐 Timeline scale: ${data.pixelsPerSecond.toFixed(2)} pixels per second`);

        // Extract and display video frames for timeline background
        this.extractTimelineFrames();
    }

    setupClipTimelineInteractions() {
        const leftHandle = document.getElementById('leftTrimHandle');
        const rightHandle = document.getElementById('rightTrimHandle');

        // Trim handle dragging
        this.setupTrimHandleDragging(leftHandle, 'left');
        this.setupTrimHandleDragging(rightHandle, 'right');
    }



    setupTrimHandleDragging(handle, side) {
        let isDragging = false;
        let startX = 0;
        let originalValue = 0;

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            originalValue = side === 'left' ? this.clipTimelineData.begin :
                (this.clipTimelineData.begin + this.clipTimelineData.clipDuration);
            document.body.style.cursor = 'ew-resize';
            e.preventDefault();
            e.stopPropagation();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaTime = deltaX / this.clipTimelineData.pixelsPerSecond;

            if (this.clipTimelineData.durationLocked) {
                // Duration is locked - both handles move the clip without changing duration
                const lockedDuration = this.clipTimelineData.clipDuration;

                if (side === 'left') {
                    // Left handle - move entire clip by adjusting begin time
                    const newBegin = Math.max(0, Math.min(originalValue + deltaTime,
                        this.clipTimelineData.duration - lockedDuration));
                    this.clipTimelineData.begin = newBegin;
                } else {
                    // Right handle - move entire clip by adjusting begin time (end - duration = begin)
                    const newEnd = Math.max(lockedDuration, Math.min(originalValue + deltaTime,
                        this.clipTimelineData.duration));
                    this.clipTimelineData.begin = newEnd - lockedDuration;
                }

                // Duration stays the same
                this.clipTimelineData.clipDuration = lockedDuration;
            } else {
                // Duration is unlocked - normal behavior
                if (side === 'left') {
                    // Left handle - adjust begin time
                    const newBegin = Math.max(0, Math.min(originalValue + deltaTime,
                        this.clipTimelineData.begin + this.clipTimelineData.clipDuration - 0.1));
                    const newDuration = this.clipTimelineData.clipDuration + (this.clipTimelineData.begin - newBegin);

                    this.clipTimelineData.begin = newBegin;
                    this.clipTimelineData.clipDuration = newDuration;
                } else {
                    // Right handle - adjust duration
                    const newEnd = Math.max(this.clipTimelineData.begin + 0.1,
                        Math.min(originalValue + deltaTime, this.clipTimelineData.duration));
                    this.clipTimelineData.clipDuration = newEnd - this.clipTimelineData.begin;
                }
            }

            this.updateClipTimelineLayout();
            this.updateFormFields();

            // Sync video time when begin time changes (left handle)
            if (side === 'left') {
                this.setVideoToBeginTime();
            }

            // Update the main clip data to reflect changes immediately
            if (this.currentEditingClip) {
                this.currentEditingClip.clip.begin = this.clipTimelineData.begin;
                this.currentEditingClip.clip.duration = this.clipTimelineData.clipDuration;
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            document.body.style.cursor = '';
        };

        handle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updateClipTimelineLayout() {
        const data = this.clipTimelineData;
        const clipElement = document.getElementById('clipTimelineClip');

        const clipStart = data.begin * data.pixelsPerSecond;
        const clipWidth = data.clipDuration * data.pixelsPerSecond;

        clipElement.style.left = `${clipStart}px`;
        clipElement.style.width = `${clipWidth}px`;

        // Update clip info display
        this.updateClipInfo();

        // Update visual feedback for locked duration
        this.updateTimelineVisualState();
    }

    updateFormFields() {
        document.getElementById('clipBegin').value = this.clipTimelineData.begin.toFixed(1);
        document.getElementById('clipDuration').value = this.clipTimelineData.clipDuration.toFixed(1);
    }



    generateTimeMarkers() {
        const data = this.clipTimelineData;
        const timelineBg = document.getElementById('clipTimelineBg');

        // Clear existing markers
        timelineBg.innerHTML = '';

        // Calculate appropriate marker interval based on timeline scale
        let interval = 1;
        if (data.pixelsPerSecond < 15) {
            interval = 5; // Every 5 seconds for very compressed timelines
        } else if (data.pixelsPerSecond < 30) {
            interval = 2; // Every 2 seconds for compressed timelines
        } else {
            interval = 1; // Every second for expanded timelines
        }

        for (let time = 0; time <= data.duration; time += interval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${time * data.pixelsPerSecond}px`;

            // Show labels for major intervals or start/end
            if (time === 0 || time % (interval * 2) === 0 || Math.abs(time - data.duration) < 0.1) {
                const label = document.createElement('span');
                label.className = 'time-label';
                label.textContent = `${time}s`;
                marker.appendChild(label);
            }

            timelineBg.appendChild(marker);
        }
    }

    setVideoToBeginTime() {
        if (!this.clipTimelineData || !this.clipTimelineData.video) return;

        const video = this.clipTimelineData.video;
        const beginTime = this.clipTimelineData.begin;

        // Set video to start at the begin time
        if (video.readyState >= 1 && Math.abs(video.currentTime - beginTime) > 0.1) {
            video.currentTime = beginTime;
            console.log(`🎬 Video set to begin time: ${beginTime}s`);
        }
    }

    handleVideoTimeUpdate() {
        if (!this.clipTimelineData || !this.clipTimelineData.video) return;

        const video = this.clipTimelineData.video;
        const data = this.clipTimelineData;
        const currentTime = video.currentTime;
        const endTime = data.begin + data.clipDuration;

        // If video has played beyond the clip duration, pause and reset
        if (currentTime >= endTime) {
            video.pause();
            video.currentTime = data.begin; // Reset to begin time
            console.log(`⏹️ Clip playback ended, reset to begin time: ${data.begin}s`);
        }

        // If video is before the begin time, jump to begin time
        if (currentTime < data.begin) {
            video.currentTime = data.begin;
        }
    }

    syncFormToTimeline() {
        if (!this.clipTimelineData) return;

        const begin = parseFloat(document.getElementById('clipBegin').value) || 0;
        const duration = parseFloat(document.getElementById('clipDuration').value) || 0.1;

        // Validate values
        const maxBegin = Math.max(0, this.clipTimelineData.duration - 0.1);
        const maxDuration = this.clipTimelineData.duration - begin;

        this.clipTimelineData.begin = Math.max(0, Math.min(begin, maxBegin));
        this.clipTimelineData.clipDuration = Math.max(0.1, Math.min(duration, maxDuration));

        this.updateClipTimelineLayout();

        // Update video time to match new begin time
        this.setVideoToBeginTime();

        // Update clip info display
        this.updateClipInfo();

        // Update the main clip data to reflect changes immediately
        if (this.currentEditingClip) {
            this.currentEditingClip.clip.begin = this.clipTimelineData.begin;
            this.currentEditingClip.clip.duration = this.clipTimelineData.clipDuration;
        }
    }

    syncVideoVolume() {
        if (!this.clipTimelineData || !this.clipTimelineData.video) return;

        const volumeField = document.getElementById('clipVolume');
        const video = this.clipTimelineData.video;
        
        // Get volume value (0-200) and convert to video volume (0.0-1.0 for HTML5 video)
        const volumePercent = parseInt(volumeField.value) || 100;
        // HTML5 video volume is clamped to 0.0-1.0, but we show the full range in UI
        const videoVolume = Math.max(0, Math.min(1.0, volumePercent / 100));
        
        // Apply volume to video element
        video.volume = videoVolume;
        
        // Show a note if volume exceeds 100% since video element can't preview it
        const volumeNote = volumePercent > 100 ? ' (preview capped at 100%)' : '';
        console.log(`🔊 Video volume set to ${volumePercent}% (preview: ${(videoVolume * 100).toFixed(0)}%)${volumeNote}`);
        
        // Update the main clip data to reflect changes immediately
        if (this.currentEditingClip) {
            this.currentEditingClip.clip.volume = volumePercent;
        }
    }

    playClipFromBegin() {
        if (!this.clipTimelineData || !this.clipTimelineData.video) return;

        const video = this.clipTimelineData.video;
        const data = this.clipTimelineData;

        if (video.paused) {
            // Set video to begin time and play
            video.currentTime = data.begin;
            video.play();
            console.log(`▶️ Playing clip from ${data.begin}s for ${data.clipDuration}s`);
        } else {
            // Pause the video
            video.pause();
            console.log(`⏸️ Paused clip playback`);
        }
    }

    updateClipInfo() {
        if (!this.clipTimelineData) return;

        const data = this.clipTimelineData;
        const clipInfo = document.getElementById('clipInfo');

        if (clipInfo) {
            const lockIcon = data.durationLocked ? '🔒 ' : '';
            clipInfo.textContent = `${lockIcon}${data.clipDuration.toFixed(1)}s @ ${data.begin.toFixed(1)}s`;
        }
    }

    updatePlayButtonIcon(showPlay) {
        const playBtn = document.getElementById('playClipBtn');
        const icon = playBtn ? playBtn.querySelector('i') : null;

        if (icon) {
            icon.className = showPlay ? 'fas fa-play' : 'fas fa-pause';
        }
    }

    toggleDurationLock() {
        if (!this.clipTimelineData) return;

        this.clipTimelineData.durationLocked = !this.clipTimelineData.durationLocked;

        const lockBtn = document.getElementById('durationLockBtn');
        const icon = lockBtn.querySelector('i');
        const durationInput = document.getElementById('clipDuration');

        const helpText = document.getElementById('durationHelp');

        if (this.clipTimelineData.durationLocked) {
            // Lock duration
            lockBtn.classList.add('locked');
            icon.className = 'fas fa-lock';
            lockBtn.title = 'Unlock duration';
            durationInput.disabled = true;
            if (helpText) helpText.textContent = 'Duration locked - drag handles to move clip';
            console.log(`🔒 Duration locked at ${this.clipTimelineData.clipDuration}s`);
        } else {
            // Unlock duration
            lockBtn.classList.remove('locked');
            icon.className = 'fas fa-unlock';
            lockBtn.title = 'Lock duration - handles will move clip without changing length';
            durationInput.disabled = false;
            if (helpText) helpText.textContent = 'Drag handles to adjust timing';
            console.log(`🔓 Duration unlocked`);
        }

        // Update timeline visual state
        this.updateTimelineVisualState();
    }

    updateTimelineVisualState() {
        if (!this.clipTimelineData) return;

        const clipElement = document.getElementById('clipTimelineClip');
        const leftHandle = document.getElementById('leftTrimHandle');
        const rightHandle = document.getElementById('rightTrimHandle');

        if (this.clipTimelineData.durationLocked) {
            // Add locked visual state
            clipElement.classList.add('duration-locked');
            leftHandle.classList.add('locked-handle');
            rightHandle.classList.add('locked-handle');
        } else {
            // Remove locked visual state
            clipElement.classList.remove('duration-locked');
            leftHandle.classList.remove('locked-handle');
            rightHandle.classList.remove('locked-handle');
        }
    }

    async extractTimelineFrames() {
        console.log('🔍 Starting extractTimelineFrames...');

        if (!this.clipTimelineData || !this.clipTimelineData.video) {
            console.log('⚠️ No video data available for frame extraction');
            return;
        }

        const video = this.clipTimelineData.video;
        const data = this.clipTimelineData;
        const timelineBg = document.getElementById('clipTimelineBg');
        const framesContainer = document.getElementById('timelineFramesContainer');
        const loadingElement = document.getElementById('timelineFramesLoading');

        console.log('🔍 Elements found:', {
            timelineBg: !!timelineBg,
            framesContainer: !!framesContainer,
            loadingElement: !!loadingElement,
            videoReady: video.readyState,
            videoDuration: video.duration
        });

        if (!framesContainer) {
            console.error('❌ Timeline frames container not found!');
            return;
        }

        if (video.readyState < 2) {
            console.log('⏳ Video not ready, waiting for metadata...');
            video.addEventListener('loadedmetadata', () => {
                console.log('✅ Video metadata loaded, retrying frame extraction');
                this.extractTimelineFrames();
            }, { once: true });
            return;
        }

        // Clear existing frames
        const existingFrames = framesContainer.querySelectorAll('.timeline-frame-thumbnail');
        existingFrames.forEach(frame => frame.remove());

        // Show loading
        loadingElement.style.display = 'block';

        try {
            // Calculate frames for the full video timeline
            const timelineWidth = data.timelineWidth;
            const videoDuration = data.duration;

            // Dynamic frame count based on video duration and timeline width
            let frameCount;
            if (videoDuration <= 10) {
                frameCount = Math.max(5, Math.floor(timelineWidth / 40));
            } else if (videoDuration <= 30) {
                frameCount = Math.max(8, Math.floor(timelineWidth / 50));
            } else if (videoDuration <= 60) {
                frameCount = Math.max(10, Math.floor(timelineWidth / 60));
            } else {
                frameCount = Math.max(12, Math.floor(timelineWidth / 70));
            }

            // Cap frame count for performance (max 20 frames for full timeline)
            frameCount = Math.min(frameCount, 20);

            console.log(`🎬 Extracting ${frameCount} frames for ${videoDuration}s video timeline (${timelineWidth}px wide)`);

            // Calculate frame extraction times at regular intervals across the full video
            const frameInterval = videoDuration / frameCount;
            const frameTimes = [];

            for (let i = 0; i < frameCount; i++) {
                // Extract frames at regular intervals across the full video duration
                const frameTime = i * frameInterval;
                frameTimes.push(Math.min(frameTime, videoDuration - 0.1));
            }

            // Extract frames with optimized settings
            const frames = await this.extractVideoFrames(video, frameTimes, timelineWidth / frameCount);

            // Display frames across the full timeline background
            console.log('🔍 Displaying frames:', frames.length, 'frames extracted');

            if (frames.length === 0 || frames.every(f => !f)) {
                // Fallback: create colored rectangles if frame extraction fails
                console.log('⚠️ No frames extracted, creating fallback rectangles');
                for (let i = 0; i < frameCount; i++) {
                    const div = document.createElement('div');
                    div.className = 'timeline-frame-thumbnail';
                    div.style.width = `${timelineWidth / frameCount}px`;
                    div.style.height = '100%';
                    div.style.background = `hsl(${(i * 360) / frameCount}, 50%, 30%)`;
                    div.style.border = '1px solid rgba(255,255,255,0.2)';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.justifyContent = 'center';
                    div.style.fontSize = '8px';
                    div.style.color = 'white';
                    div.textContent = `${frameTimes[i].toFixed(1)}s`;
                    framesContainer.appendChild(div);
                }
            } else {
                frames.forEach((frameDataUrl, index) => {
                    if (frameDataUrl) {
                        const img = document.createElement('img');
                        img.className = 'timeline-frame-thumbnail';
                        img.src = frameDataUrl;
                        img.style.width = `${timelineWidth / frameCount}px`;
                        img.alt = `Frame at ${frameTimes[index].toFixed(1)}s`;
                        framesContainer.appendChild(img);
                        console.log(`🖼️ Added frame ${index + 1} at ${frameTimes[index].toFixed(1)}s`);
                    } else {
                        console.log(`⚠️ Frame ${index + 1} failed to extract`);
                        // Create a placeholder for failed frames
                        const div = document.createElement('div');
                        div.className = 'timeline-frame-thumbnail';
                        div.style.width = `${timelineWidth / frameCount}px`;
                        div.style.height = '100%';
                        div.style.background = '#444';
                        div.style.border = '1px solid rgba(255,255,255,0.1)';
                        div.style.display = 'flex';
                        div.style.alignItems = 'center';
                        div.style.justifyContent = 'center';
                        div.style.fontSize = '8px';
                        div.style.color = '#999';
                        div.textContent = '?';
                        framesContainer.appendChild(div);
                    }
                });
            }

            console.log(`✅ Successfully extracted ${frames.filter(f => f).length}/${frameCount} timeline frames`);

        } catch (error) {
            console.error('❌ Error extracting timeline frames:', error);
        } finally {
            // Hide loading
            loadingElement.style.display = 'none';
        }
    }

    async extractVideoFrames(video, frameTimes, targetFrameWidth = 40) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const frames = [];
            let currentFrameIndex = 0;

            // Optimize canvas size based on target frame width and video aspect ratio
            const aspectRatio = video.videoWidth / video.videoHeight;
            canvas.width = Math.min(targetFrameWidth * 2, 80); // Cap at 80px for performance
            canvas.height = Math.round(canvas.width / aspectRatio);

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';

            const extractNextFrame = () => {
                if (currentFrameIndex >= frameTimes.length) {
                    resolve(frames);
                    return;
                }

                const targetTime = frameTimes[currentFrameIndex];

                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);

                    try {
                        // Clear canvas
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Draw current frame to canvas
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        // Convert to data URL with optimized quality
                        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        frames[currentFrameIndex] = frameDataUrl;

                    } catch (error) {
                        console.warn(`⚠️ Failed to extract frame at ${targetTime}s:`, error);
                        frames[currentFrameIndex] = null;
                    }

                    currentFrameIndex++;

                    // Reduced delay for faster extraction
                    setTimeout(extractNextFrame, 30);
                };

                const onError = () => {
                    video.removeEventListener('seeked', onSeeked);
                    video.removeEventListener('error', onError);
                    console.warn(`⚠️ Seek error at ${targetTime}s`);
                    frames[currentFrameIndex] = null;
                    currentFrameIndex++;
                    setTimeout(extractNextFrame, 30);
                };

                video.addEventListener('seeked', onSeeked);
                video.addEventListener('error', onError);

                // Set video time with bounds checking
                const clampedTime = Math.max(0, Math.min(targetTime, video.duration - 0.1));
                video.currentTime = clampedTime;
            };

            // Start extraction
            extractNextFrame();
        });
    }

    // Update frames when timeline changes (only needed when video changes, not clip properties)
    updateTimelineFrames() {
        // Debounce frame updates to avoid excessive extraction
        if (this.frameUpdateTimeout) {
            clearTimeout(this.frameUpdateTimeout);
        }

        this.frameUpdateTimeout = setTimeout(() => {
            this.extractTimelineFrames();
        }, 500); // Wait 500ms after last change
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize video editor with error handling
let videoEditor;
try {
    videoEditor = new VideoEditor();
    console.log('✅ Video Editor initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Video Editor:', error);
    
    // Show user-friendly error message
    document.body.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #fff; background: #2d2d2d; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
            <h1 style="color: #ff6b6b;">⚠️ Video Editor Failed to Load</h1>
            <p>There was an error initializing the video editor.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin: 20px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🔄 Reload Page
            </button>
            <details style="margin-top: 20px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
                <summary style="cursor: pointer; color: #4a90e2;">Show Technical Details</summary>
                <pre style="background: #1a1a1a; padding: 15px; border-radius: 4px; overflow: auto; margin-top: 10px;">${error.stack}</pre>
            </details>
        </div>
    `;
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
