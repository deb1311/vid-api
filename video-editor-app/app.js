// Professional Video Editor with Canvas Preview (matches backend rendering)
class VideoEditor {
    constructor() {
        this.currentData = null;
        this.currentFileName = '';
        this.currentNotionId = null; // Store the loaded Notion record ID
        this.timelineZoom = 60; // pixels per second
        this.isPlaying = false;
        this.currentTime = 0;
        this.totalDuration = 0;
        this.animationFrameId = null;
        
        // Audio playback
        this.audioElement = null;
        this.audioLoaded = false;
        
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
        
        // Video clip audio control - SIMPLIFIED
        this.currentActiveVideoUrl = null;
        
        // Audio waveform data
        this.audioWaveformData = null;
        this.detectedBeats = [];
        
        // Undo/Redo history
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Clip duration lock state
        this.isDurationLocked = false;
        
        // Video browser cache
        this.videoBrowserCache = {
            data: null,
            timestamp: null,
            expiryMinutes: 30 // Cache expires after 30 minutes
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.startRenderLoop();
        
        // Check for URL parameter and load from Notion if present
        await this.checkUrlParameter();
        
        // Only load from localStorage if no URL parameter was found
        if (!this.currentData) {
            this.loadFromLocalStorage();
        }
    }

    async checkUrlParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const notionId = urlParams.get('id');
        
        if (notionId) {
            console.log('🔗 Loading from URL parameter:', notionId);
            try {
                await this.loadNotionRecord(notionId, true); // silent = true for URL loads
                console.log('✅ Successfully loaded from URL parameter');
            } catch (error) {
                console.error('❌ Failed to load from URL parameter:', error);
                this.showNotification(`Failed to load record ${notionId}: ${error.message}`, 'error');
            }
        }
    }

    setupEventListeners() {
        document.getElementById('loadNotionBtn').addEventListener('click', () => this.showNotionModal());
        document.getElementById('renderBtn').addEventListener('click', () => this.showRenderModal());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveJson());
        document.getElementById('confirmBtn').addEventListener('click', () => this.confirmData());
        document.getElementById('closeNotionModal').addEventListener('click', () => this.hideNotionModal());
        document.getElementById('closeRenderModal').addEventListener('click', () => this.hideRenderModal());
        document.getElementById('refreshNotionBtn').addEventListener('click', () => this.loadNotionRecords());
        document.getElementById('notionStatusFilter').addEventListener('change', () => this.loadNotionRecords());
        
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('splitClipBtn').addEventListener('click', () => this.splitClipAtPlayhead());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.showFullscreenModal());
        
        document.getElementById('notionModal').addEventListener('click', (e) => {
            if (e.target.id === 'notionModal') this.hideNotionModal();
        });
        
        document.getElementById('renderModal').addEventListener('click', (e) => {
            if (e.target.id === 'renderModal') this.hideRenderModal();
        });
        
        document.getElementById('fullscreenModal').addEventListener('click', (e) => {
            if (e.target.id === 'fullscreenModal') this.hideFullscreenModal();
        });
        
        document.getElementById('closeFullscreenModal').addEventListener('click', () => this.hideFullscreenModal());
        
        // Video Browser modal listeners
        document.getElementById('videoBrowserModal').addEventListener('click', (e) => {
            if (e.target.id === 'videoBrowserModal') this.hideVideoBrowser();
        });
        document.getElementById('closeVideoBrowserModal').addEventListener('click', () => this.hideVideoBrowser());
        document.getElementById('refreshVideoBrowserBtn').addEventListener('click', () => {
            this.showNotification('🔄 Refreshing video list...', 'info');
            this.loadVideosFromFilebase(true); // Force refresh
        });
        
        // Fullscreen playbar controls - use event delegation for better reliability
        document.addEventListener('click', (e) => {
            // Handle playbar play button clicks (button or its icon)
            if (e.target.id === 'fullscreenPlaybarPlayBtn' || 
                e.target.closest('#fullscreenPlaybarPlayBtn') ||
                (e.target.tagName === 'I' && e.target.parentElement && e.target.parentElement.id === 'fullscreenPlaybarPlayBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.togglePlayPause();
                console.log('🎮 Playbar play button clicked');
                return;
            }
        });
        
        document.getElementById('fullscreenVolumeBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('fullscreenVolumeSlider').addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Progress bar seeking
        this.setupFullscreenProgressBar();
        
        // Video Edit Modal listeners
        document.getElementById('videoEditModal').addEventListener('click', (e) => {
            if (e.target.id === 'videoEditModal') this.hideVideoEditModal();
        });
        document.getElementById('closeVideoEditModal').addEventListener('click', () => this.hideVideoEditModal());
        document.getElementById('applyClipChanges').addEventListener('click', () => this.applyClipChanges());
        document.getElementById('cancelClipChanges').addEventListener('click', () => this.hideVideoEditModal());
        document.getElementById('lockDurationBtn').addEventListener('click', () => this.toggleDurationLock());
        
        // Render modal handlers
        document.getElementById('startRenderBtn').addEventListener('click', () => this.startRender());
        document.getElementById('cancelRenderBtn').addEventListener('click', () => this.hideRenderModal());
        document.getElementById('downloadRenderBtn').addEventListener('click', () => this.downloadRenderedVideo());
        document.getElementById('copyRenderUrlBtn').addEventListener('click', () => this.copyRenderUrl());
        
        this.setupTimelineInteractions();
        document.getElementById('videoTitle').addEventListener('input', () => this.autoSave());
        
        // Keyboard shortcuts for undo/redo
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                this.redo();
            }
        });
    }



    showNotionModal() {
        document.getElementById('notionModal').classList.add('active');
        this.loadNotionRecords();
    }

    hideNotionModal() {
        document.getElementById('notionModal').classList.remove('active');
    }

    async loadNotionRecords() {
        const listContainer = document.getElementById('notionRecordList');
        const statusFilter = document.getElementById('notionStatusFilter').value;
        
        // Show loading state
        listContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading records from Notion...</p>
            </div>
        `;

        try {
            const workerUrl = 'https://notion-reader.debabratamaitra898.workers.dev';
            const url = statusFilter ? `${workerUrl}/?filter=${statusFilter}` : workerUrl;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch from Notion');
            
            const data = await response.json();
            
            let records = [];
            if (statusFilter && data.records) {
                records = data.records;
            } else if (data.items) {
                records = data.items.map(item => ({
                    page_id: item.id,
                    formula_id: item.properties.ID,
                    username: item.properties.Username,
                    caption: item.properties.Caption,
                    status: item.properties.Status,
                    created_time: item.created_time,
                    url: item.url
                }));
            }

            if (records.length === 0) {
                listContainer.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-inbox"></i>
                        <p>No records found</p>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = records.map(record => {
                const statusClass = record.status ? `status-${record.status.toLowerCase()}` : '';
                const statusBadge = record.status ? `<span class="record-status ${statusClass}">${record.status}</span>` : '';
                const date = new Date(record.created_time).toLocaleDateString();
                
                return `
                    <div class="notion-record-item" onclick="videoEditor.loadNotionRecord('${record.formula_id}')">
                        <h4>
                            <i class="fas fa-database"></i>
                            ${record.username || 'Untitled'}
                            ${statusBadge}
                        </h4>
                        <p>${record.caption || 'No caption'}</p>
                        <small>ID: ${record.formula_id} • Created: ${date}</small>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading Notion records:', error);
            listContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading records: ${error.message}</p>
                    <small>Make sure the Cloudflare worker is deployed and accessible</small>
                </div>
            `;
        }
    }

    async loadNotionRecord(formulaId, silent = false) {
        try {
            const workerUrl = 'https://notion-reader.debabratamaitra898.workers.dev';
            
            if (!silent) {
                this.showNotification('Loading record...', 'info');
            }
            
            const response = await fetch(`${workerUrl}/?json_id=${formulaId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch record (${response.status}): ${errorText}`);
            }
            
            const recordData = await response.json();
            
            // Check for error in response
            if (recordData.error) {
                throw new Error(recordData.error);
            }
            
            // Check if JSON data exists
            if (!recordData.json_parsed) {
                throw new Error('No JSON data found in this record');
            }

            // Store the Notion record ID and endpoint for saving/rendering later
            this.currentNotionId = formulaId;
            // Remove leading slash from endpoint if present
            this.currentEndpoint = recordData.endpoint ? recordData.endpoint.replace(/^\//, '') : null;
            
            // Load the JSON data into the editor
            const jsonData = recordData.json_parsed;
            await this.loadData(jsonData, `Notion: ${recordData.username || formulaId}`);
            
            // Only close modal and show notification if not silent (i.e., not from URL)
            if (!silent) {
                this.hideNotionModal();
                this.showNotification(`✅ Loaded: ${recordData.username || formulaId}`, 'success');
            }
            
            console.log('📊 Loaded record from Notion + Supabase:', {
                id: formulaId,
                username: recordData.username,
                status: recordData.status,
                endpoint: recordData.endpoint,
                clips: recordData.json_parsed?.clips?.length || 0,
                captions: recordData.json_parsed?.captions?.length || 0,
                loadedFrom: silent ? 'URL' : 'Modal'
            });

        } catch (error) {
            console.error('❌ Error loading record:', error);
            if (!silent) {
                this.showNotification(`Error loading record: ${error.message}`, 'error');
            }
            throw error; // Re-throw so checkUrlParameter can handle it
        }
    }

    showFullscreenModal() {
        if (!this.currentData) {
            this.showNotification('No video loaded to display!', 'error');
            return;
        }
        
        document.getElementById('fullscreenModal').classList.add('active');
        this.setupFullscreenCanvas();
        this.initializeFullscreenPlaybar();
        console.log('🖥️ Opened fullscreen video preview');
    }

    initializeFullscreenPlaybar() {
        // Initialize volume slider with current audio volume
        const volumeSlider = document.getElementById('fullscreenVolumeSlider');
        const volumeBtn = document.getElementById('fullscreenVolumeBtn');
        
        if (this.audioElement && this.audioLoaded) {
            const currentVolume = this.audioElement.volume * 100;
            volumeSlider.value = currentVolume;
            
            if (this.audioElement.muted || currentVolume === 0) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else if (currentVolume < 50) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
            } else {
                volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        } else {
            volumeSlider.value = 100;
            volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
        
        // Initialize playbar state
        this.updateFullscreenPlaybar();
    }

    hideFullscreenModal() {
        document.getElementById('fullscreenModal').classList.remove('active');
        console.log('🖥️ Closed fullscreen video preview');
    }

    // Video Browser Modal Methods
    showVideoBrowser(clipIndex) {
        this.currentBrowsingClipIndex = clipIndex;
        document.getElementById('videoBrowserModal').classList.add('active');
        this.loadVideosFromFilebase();
        console.log('📁 Opened video browser for clip', clipIndex);
    }

    hideVideoBrowser() {
        document.getElementById('videoBrowserModal').classList.remove('active');
        this.currentBrowsingClipIndex = null;
        
        // Clean up observer and unload all videos to free memory
        if (this.videoObserver) {
            this.videoObserver.disconnect();
            this.videoObserver = null;
        }
        
        // Aggressively clean up all video elements
        const videos = document.querySelectorAll('#videoBrowserList video');
        videos.forEach(video => {
            video.pause();
            video.removeAttribute('src');
            video.load();
        });
        
        console.log('📁 Closed video browser and freed memory');
    }

    async loadVideosFromFilebase(forceRefresh = false) {
        const listContainer = document.getElementById('videoBrowserList');
        const searchInput = document.getElementById('videoBrowserSearch');
        
        // Check cache first (unless force refresh)
        if (!forceRefresh && this.videoBrowserCache.data && this.videoBrowserCache.timestamp) {
            const now = Date.now();
            const cacheAge = (now - this.videoBrowserCache.timestamp) / 1000 / 60; // minutes
            
            if (cacheAge < this.videoBrowserCache.expiryMinutes) {
                console.log(`📦 Using cached video list (${cacheAge.toFixed(1)} min old)`);
                
                // Use cached data
                this.allVideos = this.videoBrowserCache.data;
                this.renderVideoGrid(this.allVideos);
                this.updateCacheIndicator();
                
                // Setup search filtering
                searchInput.oninput = (e) => {
                    const query = e.target.value.toLowerCase();
                    const filtered = this.allVideos.filter(video => 
                        video.name.toLowerCase().includes(query)
                    );
                    this.renderVideoGrid(filtered);
                };
                
                // Show cache indicator
                this.showNotification(`📦 Loaded ${this.allVideos.length} videos from cache`, 'info');
                return;
            } else {
                console.log('🔄 Cache expired, fetching fresh data');
            }
        }
        
        // Show loading state
        listContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading videos from Filebase...</p>
            </div>
        `;

        try {
            // Use the Cloudflare worker to list files from the bucket
            const workerUrl = 'https://filebase-media-fetcher.debabratamaitra898.workers.dev';
            const bucketName = 'stock-clips'; // Change this to your bucket name
            
            const response = await fetch(`${workerUrl}/${bucketName}?list`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch videos (${response.status})`);
            }
            
            const data = await response.json();
            
            if (!data.files || data.files.length === 0) {
                listContainer.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-inbox"></i>
                        <p>No videos found in bucket</p>
                    </div>
                `;
                return;
            }

            // Filter for video files only
            const videoFiles = data.files.filter(file => 
                file.name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)
            );

            if (videoFiles.length === 0) {
                listContainer.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-inbox"></i>
                        <p>No video files found</p>
                    </div>
                `;
                return;
            }

            // Store all videos for search filtering
            this.allVideos = videoFiles;
            
            // Cache the results
            this.videoBrowserCache.data = videoFiles;
            this.videoBrowserCache.timestamp = Date.now();
            
            this.renderVideoGrid(videoFiles);
            this.updateCacheIndicator();

            // Setup search filtering
            searchInput.oninput = (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = this.allVideos.filter(video => 
                    video.name.toLowerCase().includes(query)
                );
                this.renderVideoGrid(filtered);
            };

            console.log('📁 Loaded', videoFiles.length, 'videos from Filebase (cached for', this.videoBrowserCache.expiryMinutes, 'minutes)');

        } catch (error) {
            console.error('❌ Error loading videos:', error);
            listContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading videos: ${error.message}</p>
                    <small>Make sure the Cloudflare worker is deployed and accessible</small>
                </div>
            `;
        }
    }

    renderVideoGrid(videos) {
        const listContainer = document.getElementById('videoBrowserList');
        
        if (videos.length === 0) {
            listContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-search"></i>
                    <p>No videos match your search</p>
                </div>
            `;
            return;
        }

        // Clean up previous observer if exists
        if (this.videoObserver) {
            this.videoObserver.disconnect();
        }

        // Track currently playing video to limit to one at a time
        let currentlyPlayingVideo = null;

        // Use Intersection Observer for lazy loading with aggressive unloading
        this.videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const videoElement = entry.target.querySelector('video');
                
                if (entry.isIntersecting) {
                    // Load video when visible
                    if (videoElement && !videoElement.src) {
                        const workerUrl = 'https://filebase-media-fetcher.debabratamaitra898.workers.dev';
                        const bucketName = 'stock-clips';
                        videoElement.src = `${workerUrl}/${bucketName}/${encodeURIComponent(videoElement.dataset.filename)}`;
                        videoElement.load();
                    }
                } else {
                    // Aggressively unload video when not visible to save memory
                    if (videoElement && videoElement.src) {
                        videoElement.pause();
                        videoElement.removeAttribute('src');
                        videoElement.load(); // This releases the video from memory
                    }
                }
            });
        }, {
            rootMargin: '100px', // Load slightly before visible
            threshold: 0
        });

        const html = `
            <div class="video-grid">
                ${videos.map(video => {
                    // Use worker URL format for Filebase videos
                    const workerUrl = 'https://filebase-media-fetcher.debabratamaitra898.workers.dev';
                    const bucketName = 'stock-clips';
                    const videoUrl = `${workerUrl}/${bucketName}/${encodeURIComponent(video.name)}`;
                    const durationText = video.duration ? `${video.duration.toFixed(1)}s` : '';
                    
                    return `
                        <div class="video-item" data-video-url="${videoUrl}" data-filename="${video.name}">
                            <div class="video-thumbnail">
                                <div class="video-placeholder">
                                    <i class="fas fa-video"></i>
                                </div>
                                <video 
                                    data-filename="${video.name}"
                                    muted 
                                    preload="none"
                                    playsinline
                                    disablePictureInPicture
                                    style="display: none;"
                                ></video>
                                ${durationText ? `<div class="video-duration-badge">${durationText}</div>` : ''}
                            </div>
                            <div class="video-info">
                                <div class="video-name" title="${video.name}">${video.name}</div>
                                <div class="video-meta">
                                    <span>${video.sizeFormatted}</span>
                                    ${durationText ? `<span>${durationText}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        listContainer.innerHTML = html;

        // Attach click handlers and setup lazy loading
        const videoItems = listContainer.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            // Setup lazy loading
            this.videoObserver.observe(item);
            
            // Click handler
            item.addEventListener('click', () => {
                const videoUrl = item.dataset.videoUrl;
                this.selectVideoFromBrowser(videoUrl);
            });

            // Optimized hover preview - only one video plays at a time
            const video = item.querySelector('video');
            const placeholder = item.querySelector('.video-placeholder');
            
            if (video) {
                let hoverTimeout;
                
                item.addEventListener('mouseenter', () => {
                    // Check if preview is enabled
                    const previewEnabled = document.getElementById('enablePreviewToggle')?.checked;
                    if (!previewEnabled) return;
                    
                    // Stop any currently playing video
                    if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
                        currentlyPlayingVideo.pause();
                        currentlyPlayingVideo.currentTime = 0;
                        currentlyPlayingVideo.style.display = 'none';
                        const prevPlaceholder = currentlyPlayingVideo.parentElement.querySelector('.video-placeholder');
                        if (prevPlaceholder) prevPlaceholder.style.display = 'flex';
                    }
                    
                    // Delay preview to avoid loading on quick mouse movements
                    hoverTimeout = setTimeout(() => {
                        if (video.src) {
                            placeholder.style.display = 'none';
                            video.style.display = 'block';
                            video.currentTime = 0;
                            video.play().catch(() => {});
                            currentlyPlayingVideo = video;
                        }
                    }, 300); // 300ms delay before preview starts
                });
                
                item.addEventListener('mouseleave', () => {
                    clearTimeout(hoverTimeout);
                    video.pause();
                    video.currentTime = 0;
                    video.style.display = 'none';
                    placeholder.style.display = 'flex';
                    if (currentlyPlayingVideo === video) {
                        currentlyPlayingVideo = null;
                    }
                });
            }
        });
    }

    updateCacheIndicator() {
        const indicator = document.getElementById('cacheIndicator');
        const ageSpan = document.getElementById('cacheAge');
        
        if (!this.videoBrowserCache.timestamp) {
            indicator.style.display = 'none';
            return;
        }
        
        const now = Date.now();
        const ageMinutes = (now - this.videoBrowserCache.timestamp) / 1000 / 60;
        
        if (ageMinutes < 1) {
            ageSpan.textContent = 'Just now';
        } else if (ageMinutes < 60) {
            ageSpan.textContent = `${Math.floor(ageMinutes)} min ago`;
        } else {
            ageSpan.textContent = 'Expired';
        }
        
        indicator.style.display = 'flex';
    }

    selectVideoFromBrowser(videoUrl) {
        if (this.currentBrowsingClipIndex !== null && this.currentData.clips) {
            const clip = this.currentData.clips[this.currentBrowsingClipIndex];
            if (clip) {
                // Update the clip's video URL
                clip.videourl = videoUrl;
                clip.videoUrl = videoUrl; // Support both formats
                
                // Refresh the properties panel
                this.renderProperties();
                this.preloadMedia();
                this.autoSave();
                
                this.showNotification(`✅ Video selected for clip ${this.currentBrowsingClipIndex + 1}`, 'success');
                console.log('📹 Selected video:', videoUrl);
            }
        }
        
        this.hideVideoBrowser();
    }

    setupFullscreenProgressBar() {
        const progressTrack = document.getElementById('fullscreenProgressTrack');
        const progressFill = document.getElementById('fullscreenProgressFill');
        const progressHandle = document.getElementById('fullscreenProgressHandle');
        
        let isDragging = false;
        
        const updateProgress = (clientX) => {
            const rect = progressTrack.getBoundingClientRect();
            const x = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const newTime = (percentage / 100) * this.totalDuration;
            
            this.currentTime = newTime;
            
            // Sync audio to new time
            if (this.audioElement && this.audioLoaded) {
                this.audioElement.currentTime = this.currentTime;
            }
            
            this.updateFullscreenPlaybar();
        };
        
        const onMouseDown = (e) => {
            isDragging = true;
            updateProgress(e.clientX);
            e.preventDefault();
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            updateProgress(e.clientX);
        };
        
        const onMouseUp = () => {
            isDragging = false;
        };
        
        progressTrack.addEventListener('mousedown', onMouseDown);
        progressHandle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Click to seek
        progressTrack.addEventListener('click', (e) => {
            if (!isDragging) {
                updateProgress(e.clientX);
            }
        });
    }

    updateFullscreenPlaybar() {
        if (!document.getElementById('fullscreenModal').classList.contains('active')) return;
        
        const progressFill = document.getElementById('fullscreenProgressFill');
        const progressHandle = document.getElementById('fullscreenProgressHandle');
        const timeDisplay = document.getElementById('fullscreenPlaybarTime');
        const playBtn = document.getElementById('fullscreenPlaybarPlayBtn');
        
        // Update progress bar
        const percentage = this.totalDuration > 0 ? (this.currentTime / this.totalDuration) * 100 : 0;
        progressFill.style.width = `${percentage}%`;
        progressHandle.style.left = `${percentage}%`;
        
        // Update time display
        const currentTimeStr = this.formatTime(this.currentTime);
        const totalTimeStr = this.formatTime(this.totalDuration);
        timeDisplay.textContent = `${currentTimeStr} / ${totalTimeStr}`;
        
        // Update play button
        const iconHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        playBtn.innerHTML = iconHTML;
    }

    toggleMute() {
        if (!this.audioElement || !this.audioLoaded) return;
        
        const volumeBtn = document.getElementById('fullscreenVolumeBtn');
        const volumeSlider = document.getElementById('fullscreenVolumeSlider');
        
        if (this.audioElement.muted) {
            this.audioElement.muted = false;
            volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.audioElement.volume = volumeSlider.value / 100;
        } else {
            this.audioElement.muted = true;
            volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    }

    setVolume(value) {
        if (!this.audioElement || !this.audioLoaded) return;
        
        const volume = value / 100;
        this.audioElement.volume = volume;
        this.audioElement.muted = false;
        
        const volumeBtn = document.getElementById('fullscreenVolumeBtn');
        if (volume === 0) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (volume < 0.5) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
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
        
        // Seek to begin time and set volume when video is loaded
        const beginTime = clip.begin || 0;
        const videoInitialVolume = clip.volume || 100;
        const seekToBeginAndSetVolume = () => {
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
                // Set volume
                const volumeDecimal = Math.max(0, Math.min(2.0, videoInitialVolume / 100));
                video.volume = volumeDecimal;
                console.log(`🔊 Video edit modal: Set initial volume to ${videoInitialVolume}% (${volumeDecimal.toFixed(2)})`);
                
                // Seek to begin time if needed
                if (beginTime > 0) {
                    video.currentTime = beginTime;
                    console.log(`🎯 Video edit modal: Seeking to begin time ${beginTime}s`);
                    
                    // Show visual feedback
                    this.showNotification(`📍 Video positioned at begin time: ${beginTime}s, volume: ${videoInitialVolume}%`, 'info');
                } else if (videoInitialVolume !== 100) {
                    this.showNotification(`🔊 Video volume set to: ${videoInitialVolume}%`, 'info');
                }
                
                // Initialize clip timeline AFTER video is loaded and modal is rendered
                // Timeline initialization removed temporarily
            }
        };
        
        // Add event listeners for seeking to begin time and setting volume
        video.addEventListener('loadeddata', seekToBeginAndSetVolume, { once: true });
        video.addEventListener('canplay', seekToBeginAndSetVolume, { once: true });
        
        // Update video time indicator
        const videoTimeIndicator = document.getElementById('videoTimeIndicator');
        this.currentTimeUpdateHandler = () => {
            const currentTime = video.currentTime || 0;
            const minutes = Math.floor(currentTime / 60);
            const seconds = Math.floor(currentTime % 60);
            videoTimeIndicator.textContent = `Video time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        
        // Remove existing time update handler
        if (this.previousTimeUpdateHandler) {
            video.removeEventListener('timeupdate', this.previousTimeUpdateHandler);
        }
        
        // Add new time update handler
        video.addEventListener('timeupdate', this.currentTimeUpdateHandler);
        this.previousTimeUpdateHandler = this.currentTimeUpdateHandler;
        
        // Add duration limiting functionality
        this.currentDurationLimitHandler = () => {
            const beginTime = parseFloat(document.getElementById('clipBegin').value) || 0;
            const duration = parseFloat(document.getElementById('clipDuration').value) || 5;
            const endTime = beginTime + duration;
            
            if (video.currentTime >= endTime) {
                video.pause();
                video.currentTime = beginTime; // Reset to begin position for next play
                console.log(`⏹️ Video paused at duration limit: ${endTime}s (begin: ${beginTime}s + duration: ${duration}s) - Reset to begin position`);
            }
        };
        
        // Remove existing duration limit handler
        if (this.previousDurationLimitHandler) {
            video.removeEventListener('timeupdate', this.previousDurationLimitHandler);
        }
        
        // Add new duration limit handler
        video.addEventListener('timeupdate', this.currentDurationLimitHandler);
        this.previousDurationLimitHandler = this.currentDurationLimitHandler;
        
        // Add real-time preview updates when begin time changes
        const clipBeginInput = document.getElementById('clipBegin');
        this.currentVideoPreviewUpdater = () => {
            const newBeginTime = parseFloat(clipBeginInput.value) || 0;
            if (video.readyState >= 2 && newBeginTime >= 0) {
                video.currentTime = newBeginTime;
                console.log(`🎯 Video edit modal: Updated preview to begin time ${newBeginTime}s`);
            }
        };
        
        // Remove any existing event listeners to prevent duplicates
        if (this.previousVideoPreviewUpdater) {
            clipBeginInput.removeEventListener('input', this.previousVideoPreviewUpdater);
            clipBeginInput.removeEventListener('change', this.previousVideoPreviewUpdater);
        }
        if (this.previousDurationUpdater) {
            const clipDurationInput = document.getElementById('clipDuration');
            clipDurationInput.removeEventListener('input', this.previousDurationUpdater);
            clipDurationInput.removeEventListener('change', this.previousDurationUpdater);
        }
        
        // Add new event listeners
        clipBeginInput.addEventListener('input', this.currentVideoPreviewUpdater);
        clipBeginInput.addEventListener('change', this.currentVideoPreviewUpdater);
        
        // Add duration event listeners to update duration limiting
        const clipDurationInput = document.getElementById('clipDuration');
        this.currentDurationUpdater = () => {
            // Duration limiting is handled by the timeupdate event listener
            // This just provides feedback that duration has changed
            const newDuration = parseFloat(clipDurationInput.value) || 5;
            console.log(`⏱️ Video edit modal: Duration updated to ${newDuration}s`);
        };
        
        // Remove existing duration updater
        if (this.previousDurationUpdater) {
            clipDurationInput.removeEventListener('input', this.previousDurationUpdater);
            clipDurationInput.removeEventListener('change', this.previousDurationUpdater);
        }
        
        // Add new duration event listeners
        clipDurationInput.addEventListener('input', this.currentDurationUpdater);
        clipDurationInput.addEventListener('change', this.currentDurationUpdater);
        
        // Add helper button functionality
        const jumpToBeginBtn = document.getElementById('jumpToBeginBtn');
        const previewClipBtn = document.getElementById('previewClipBtn');
        
        this.currentJumpToBeginHandler = () => {
            const beginTime = parseFloat(clipBeginInput.value) || 0;
            if (video.readyState >= 2) {
                video.currentTime = beginTime;
                console.log(`⏭️ Jumped to begin time: ${beginTime}s`);
            }
        };
        
        this.currentPreviewClipHandler = () => {
            const beginTime = parseFloat(clipBeginInput.value) || 0;
            const duration = parseFloat(document.getElementById('clipDuration').value) || 5;
            if (video.readyState >= 2) {
                // Always reset to begin time and restart playback
                video.pause(); // Ensure video is paused first
                video.currentTime = beginTime;
                video.play();
                // The duration limiting will automatically stop playback at begin + duration
                // No need for setTimeout as timeupdate handler will handle it
                console.log(`🎬 Previewing clip segment: ${beginTime}s to ${beginTime + duration}s (auto-stop enabled)`);
            }
        };
        
        // Remove existing handlers if any
        if (this.previousJumpToBeginHandler) {
            jumpToBeginBtn.removeEventListener('click', this.previousJumpToBeginHandler);
        }
        if (this.previousPreviewClipHandler) {
            previewClipBtn.removeEventListener('click', this.previousPreviewClipHandler);
        }
        
        // Add new handlers
        jumpToBeginBtn.addEventListener('click', this.currentJumpToBeginHandler);
        previewClipBtn.addEventListener('click', this.currentPreviewClipHandler);
        
        // Store references for cleanup
        this.previousVideoPreviewUpdater = this.currentVideoPreviewUpdater;
        this.previousDurationUpdater = this.currentDurationUpdater;
        this.previousJumpToBeginHandler = this.currentJumpToBeginHandler;
        this.previousPreviewClipHandler = this.currentPreviewClipHandler;
        
        // Populate form fields
        document.getElementById('clipVideoUrl').value = videoUrl;
        document.getElementById('clipBegin').value = clip.begin || 0;
        document.getElementById('clipDuration').value = clip.duration || 5;
        document.getElementById('clipStart').value = clip.start || 0;
        document.getElementById('clipDescription').value = clip.description || '';
        
        // Initialize clip timeline visualization
        this.updateClipTimeline();
        
        // Add timeline update listeners
        clipBeginInput.addEventListener('input', () => this.updateClipTimeline());
        clipDurationInput.addEventListener('input', () => this.updateClipTimeline());
        
        // Setup draggable handles for timeline
        this.setupClipTimelineHandles();
        
        // Show modal (timeline will be initialized after video loads)
        modal.classList.add('active');
        console.log(`🎬 Opened video edit modal for clip ${index + 1} (begin: ${beginTime}s)`);
    }
    
    updateClipTimeline() {
        const beginTime = parseFloat(document.getElementById('clipBegin').value) || 0;
        const duration = parseFloat(document.getElementById('clipDuration').value) || 5;
        const video = document.getElementById('videoEditPlayer');
        
        // Get video duration if available, otherwise estimate
        const videoDuration = video && video.duration && !isNaN(video.duration) ? video.duration : Math.max(beginTime + duration + 5, 30);
        
        const endTime = beginTime + duration;
        
        // Calculate percentages for positioning
        const startPercent = (beginTime / videoDuration) * 100;
        const widthPercent = (duration / videoDuration) * 100;
        
        // Update timeline segment
        const segment = document.getElementById('clipTimelineSegment');
        const label = document.getElementById('clipTimelineLabel');
        const endMarker = document.getElementById('clipTimelineEnd');
        
        if (segment && label && endMarker) {
            segment.style.left = `${startPercent}%`;
            segment.style.width = `${widthPercent}%`;
            label.textContent = `${beginTime.toFixed(1)}s - ${endTime.toFixed(1)}s`;
            endMarker.textContent = `${videoDuration.toFixed(0)}s`;
        }
    }
    
    setupClipTimelineHandles() {
        const leftHandle = document.getElementById('clipTimelineHandleLeft');
        const rightHandle = document.getElementById('clipTimelineHandleRight');
        const segment = document.getElementById('clipTimelineSegment');
        const label = document.getElementById('clipTimelineLabel');
        const timelineTotal = document.getElementById('clipTimelineTotal');
        const video = document.getElementById('videoEditPlayer');
        
        if (!leftHandle || !rightHandle || !timelineTotal || !segment) return;
        
        let isDragging = false;
        let dragHandle = null;
        let startX = 0;
        let startBegin = 0;
        let startDuration = 0;
        let videoDuration = 30;
        
        const onMouseDown = (e, handle) => {
            isDragging = true;
            dragHandle = handle;
            startX = e.clientX;
            startBegin = parseFloat(document.getElementById('clipBegin').value) || 0;
            startDuration = parseFloat(document.getElementById('clipDuration').value) || 5;
            videoDuration = video && video.duration && !isNaN(video.duration) ? video.duration : Math.max(startBegin + startDuration + 5, 30);
            
            // Disable transitions for smooth dragging
            segment.style.transition = 'none';
            
            // Change cursor based on drag type
            if (handle === 'segment') {
                segment.style.cursor = 'grabbing';
            }
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const onMouseMove = (e) => {
            if (!isDragging || !dragHandle) return;
            
            const rect = timelineTotal.getBoundingClientRect();
            const deltaX = e.clientX - startX;
            const deltaPercent = (deltaX / rect.width) * 100;
            const deltaTime = (deltaPercent / 100) * videoDuration;
            
            let newBegin = startBegin;
            let newDuration = startDuration;
            
            if (dragHandle === 'left') {
                // Dragging left handle - adjust begin time
                if (this.isDurationLocked) {
                    // If locked, move both begin and end together (shift the clip)
                    newBegin = Math.max(0, Math.min(videoDuration - startDuration, startBegin + deltaTime));
                    newDuration = startDuration; // Keep duration locked
                } else {
                    newBegin = Math.max(0, startBegin + deltaTime);
                    newDuration = startDuration - deltaTime;
                    
                    // Ensure minimum duration of 0.1s
                    if (newDuration < 0.1) {
                        newDuration = 0.1;
                        newBegin = startBegin + startDuration - 0.1;
                    }
                    
                    // Ensure begin doesn't exceed video duration
                    if (newBegin >= videoDuration - 0.1) {
                        newBegin = videoDuration - 0.1;
                        newDuration = 0.1;
                    }
                }
            } else if (dragHandle === 'right') {
                // Dragging right handle - adjust duration
                if (this.isDurationLocked) {
                    // If locked, don't allow duration changes
                    newDuration = startDuration;
                } else {
                    newDuration = Math.max(0.1, startDuration + deltaTime);
                    
                    // Ensure end doesn't exceed video duration
                    const maxDuration = videoDuration - startBegin;
                    if (newDuration > maxDuration) {
                        newDuration = maxDuration;
                    }
                }
            } else if (dragHandle === 'segment') {
                // Dragging segment - move entire clip (adjust begin, keep duration)
                newBegin = startBegin + deltaTime;
                newDuration = startDuration; // Keep duration constant
                
                // Ensure begin is not negative
                if (newBegin < 0) {
                    newBegin = 0;
                }
                
                // Ensure end doesn't exceed video duration
                if (newBegin + newDuration > videoDuration) {
                    newBegin = videoDuration - newDuration;
                }
            }
            
            // Directly update segment position (smooth, no reflow)
            const startPercent = (newBegin / videoDuration) * 100;
            const widthPercent = (newDuration / videoDuration) * 100;
            const endTime = newBegin + newDuration;
            
            segment.style.left = `${startPercent}%`;
            segment.style.width = `${widthPercent}%`;
            label.textContent = `${newBegin.toFixed(1)}s - ${endTime.toFixed(1)}s`;
            
            // Store current values for drag end
            this._dragBegin = newBegin;
            this._dragDuration = newDuration;
        };
        
        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                
                // Re-enable transitions and reset cursor
                segment.style.transition = '';
                segment.style.cursor = '';
                
                // Update input fields with final values
                if (this._dragBegin !== undefined && this._dragDuration !== undefined) {
                    const clipBeginInput = document.getElementById('clipBegin');
                    const clipDurationInput = document.getElementById('clipDuration');
                    
                    clipBeginInput.value = this._dragBegin.toFixed(1);
                    clipDurationInput.value = this._dragDuration.toFixed(1);
                    
                    // Update video preview to new begin time
                    if (video && video.readyState >= 2) {
                        video.currentTime = this._dragBegin;
                    }
                    
                    console.log(`🎯 Timeline drag complete: begin=${this._dragBegin.toFixed(1)}s, duration=${this._dragDuration.toFixed(1)}s`);
                    
                    // Clean up
                    delete this._dragBegin;
                    delete this._dragDuration;
                }
                
                dragHandle = null;
            }
        };
        
        // Add event listeners for handles
        leftHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'left'));
        rightHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));
        
        // Add event listener for segment body (drag to move)
        segment.addEventListener('mousedown', (e) => {
            // Only trigger if not clicking on handles
            if (e.target === segment || e.target === label) {
                onMouseDown(e, 'segment');
            }
        });
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Store cleanup function
        this.cleanupTimelineHandles = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }

    toggleDurationLock() {
        this.isDurationLocked = !this.isDurationLocked;
        const lockBtn = document.getElementById('lockDurationBtn');
        const icon = lockBtn.querySelector('i');
        
        if (this.isDurationLocked) {
            icon.className = 'fas fa-lock';
            lockBtn.style.background = '#3b82f6';
            lockBtn.style.color = 'white';
            lockBtn.title = 'Duration locked - Click to unlock';
            this.showNotification('🔒 Duration locked', 'info');
        } else {
            icon.className = 'fas fa-lock-open';
            lockBtn.style.background = '';
            lockBtn.style.color = '';
            lockBtn.title = 'Lock/Unlock duration';
            this.showNotification('🔓 Duration unlocked', 'info');
        }
    }
    
    hideVideoEditModal() {
        const modal = document.getElementById('videoEditModal');
        const video = document.getElementById('videoEditPlayer');
        const clipBeginInput = document.getElementById('clipBegin');
        
        // Reset lock state when closing modal
        this.isDurationLocked = false;
        
        // Pause video when closing modal
        video.pause();
        
        // Clean up event listeners to prevent memory leaks
        if (this.currentVideoPreviewUpdater) {
            clipBeginInput.removeEventListener('input', this.currentVideoPreviewUpdater);
            clipBeginInput.removeEventListener('change', this.currentVideoPreviewUpdater);
            this.currentVideoPreviewUpdater = null;
        }
        
        // Clean up duration event listeners
        const clipDurationInput = document.getElementById('clipDuration');
        if (this.currentDurationUpdater) {
            clipDurationInput.removeEventListener('input', this.currentDurationUpdater);
            clipDurationInput.removeEventListener('change', this.currentDurationUpdater);
            this.currentDurationUpdater = null;
        }
        
        // Clean up helper button listeners
        const jumpToBeginBtn = document.getElementById('jumpToBeginBtn');
        const previewClipBtn = document.getElementById('previewClipBtn');
        
        if (this.currentJumpToBeginHandler) {
            jumpToBeginBtn.removeEventListener('click', this.currentJumpToBeginHandler);
            this.currentJumpToBeginHandler = null;
        }
        
        if (this.currentPreviewClipHandler) {
            previewClipBtn.removeEventListener('click', this.currentPreviewClipHandler);
            this.currentPreviewClipHandler = null;
        }
        
        // Clean up time update handler
        if (this.currentTimeUpdateHandler) {
            video.removeEventListener('timeupdate', this.currentTimeUpdateHandler);
            this.currentTimeUpdateHandler = null;
        }
        
        // Clean up timeline handle listeners
        if (this.cleanupTimelineHandles) {
            this.cleanupTimelineHandles();
            this.cleanupTimelineHandles = null;
        }
        
        // Clean up duration limit handler
        if (this.currentDurationLimitHandler) {
            video.removeEventListener('timeupdate', this.currentDurationLimitHandler);
            this.currentDurationLimitHandler = null;
        }
        
        // Timeline cleanup removed temporarily
        
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
        
        // Update the clip data
        clip.begin = begin;
        clip.duration = duration;
        clip.start = start;
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
        const aspectRatio = 9/16; // width/height for 9:16 format
        
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



    async loadData(data, fileName) {
        this.currentData = data;
        this.currentFileName = fileName;
        
        // Initialize history with loaded data
        this.history = [JSON.parse(JSON.stringify(data))];
        this.historyIndex = 0;
        
        // Clear Notion ID and endpoint if this is not a Notion load (to prevent accidental overwrites)
        if (!fileName.startsWith('Notion:')) {
            this.currentNotionId = null;
            this.currentEndpoint = null;
        }
        
        // Ensure all clips have description and volume parameters
        if (this.currentData.clips && Array.isArray(this.currentData.clips)) {
            this.currentData.clips.forEach(clip => {
                if (clip.description === undefined) {
                    clip.description = '';
                }
                // Initialize volume to 100 if not set (for video clips)
                if (clip.volume === undefined) {
                    const hasVideoUrl = (clip.videourl && clip.videourl.trim() !== '') || (clip.videoUrl && clip.videoUrl.trim() !== '');
                    const hasImageUrl = clip.imageurl && clip.imageurl.trim() !== '';
                    // Only set volume for video clips, not images
                    if (hasVideoUrl && !hasImageUrl) {
                        clip.volume = 100;
                    }
                }
            });
        }
        
        // Ensure quote has alt parameter
        if (this.currentData.quote !== undefined && this.currentData.alt === undefined) {
            this.currentData.alt = '';
        }
        
        // Ensure all captions have alt parameter
        if (this.currentData.captions && Array.isArray(this.currentData.captions)) {
            this.currentData.captions.forEach(caption => {
                if (caption.alt === undefined) {
                    caption.alt = '';
                }
            });
        }
        
        document.getElementById('videoTitle').value = fileName.replace('.json', '').replace(/[_-]/g, ' ');
        
        this.currentTime = 0;
        this.isPlaying = false;
        
        this.calculateTotalDuration();
        
        // Show UI immediately - don't wait for media
        console.log('🚀 Rendering UI (media loading in background)...');
        this.renderProperties();
        this.renderTimeline();
        this.showPreview();
        
        // Count media files
        const mediaCount = this.countMediaFiles();
        if (mediaCount > 0) {
            console.log(`📦 Loading ${mediaCount} media files in background...`);
        }
        
        // Load media in background (non-blocking)
        this.preloadMedia().then(() => {
            console.log('✅ All media loaded');
            this.pauseAllVideos();
        }).catch(error => {
            console.error('❌ Media preloading failed:', error);
        });
        
        this.loadAudio().catch(error => {
            console.error('❌ Audio loading failed:', error);
        });
        
        this.autoSave();
    }
    
    countMediaFiles() {
        if (!this.currentData) return 0;
        
        const mediaUrls = new Set();
        if (this.currentData.imageUrl) mediaUrls.add(this.currentData.imageUrl);
        if (this.currentData.videoUrl) mediaUrls.add(this.currentData.videoUrl);
        
        if (this.currentData.clips) {
            this.currentData.clips.forEach(clip => {
                if (clip.videourl) mediaUrls.add(clip.videourl);
                if (clip.imageurl) mediaUrls.add(clip.imageurl);
                if (clip.videoUrl) mediaUrls.add(clip.videoUrl);
            });
        }
        
        return mediaUrls.size;
    }

    calculateTotalDuration() {
        let maxDuration = 10;
        
        // If there's audio, use its duration as the primary constraint
        let audioDuration = null;
        if (this.currentData.audioUrl || this.currentData.instagramUrl) {
            // Try to get duration from audio element first, then from data, then fallback to 15
            if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
                audioDuration = this.audioElement.duration;
                console.log(`🎵 Audio duration from audio element: ${audioDuration.toFixed(2)}s`);
            } else {
                audioDuration = this.currentData.duration || 15;
                console.log(`🎵 Audio duration from data (or fallback): ${audioDuration}s`);
            }
            maxDuration = audioDuration;
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
            console.log(`🔄 Loading ${mediaUrls.size} media files in background...`);
            
            // Load all media in parallel (non-blocking)
            const loadPromises = Array.from(mediaUrls).map(url => {
                return (this.isImageUrl(url) ? this.loadImage(url) : this.loadVideo(url))
                    .then(() => ({ url, success: true }))
                    .catch(error => {
                        console.warn(`Failed to preload: ${url.substring(0, 50)}...`, error.message);
                        return { url, success: false, error };
                    });
            });
            
            // Wait for all to complete (but don't block UI)
            const results = await Promise.all(loadPromises);
            const loaded = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            console.log(`📊 Media loading complete: ${loaded}/${mediaUrls.size} loaded`);
            if (failed > 0) {
                console.warn(`⚠️ ${failed} media files failed to load`);
            }
        }
    }

    async loadAudio() {
        // Clean up existing audio
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
        }
        
        this.audioLoaded = false;
        
        if (!this.currentData) return;
        
        // Check for audio URL (audioUrl or instagramUrl)
        const audioUrl = this.currentData.audioUrl || this.currentData.instagramUrl;
        
        if (!audioUrl) {
            console.log('📢 No audio URL found in data');
            return;
        }
        
        try {
            console.log('🎵 Loading audio:', audioUrl.substring(0, 50) + '...');
            
            this.audioElement = new Audio();
            this.audioElement.crossOrigin = 'anonymous';
            this.audioElement.preload = 'auto';
            
            let audioLoadResolved = false;
            
            // Set up audio event listeners with proper state management
            const onAudioLoaded = () => {
                if (audioLoadResolved) return;
                audioLoadResolved = true;
                this.audioLoaded = true;
                
                // Update duration from actual audio file
                if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
                    this.currentData.duration = this.audioElement.duration;
                    console.log(`✅ Audio loaded successfully - duration: ${this.audioElement.duration.toFixed(2)}s`);
                    
                    // Generate waveform from audio
                    this.generateAudioWaveform(audioUrl).then(() => {
                        // Recalculate total duration with actual audio duration
                        this.calculateTotalDuration();
                        
                        // Re-render timeline with correct audio duration and waveform
                        this.renderTimeline();
                    }).catch(err => {
                        console.warn('⚠️ Waveform generation failed:', err);
                        // Still render timeline without waveform
                        this.calculateTotalDuration();
                        this.renderTimeline();
                    });
                } else {
                    console.log('✅ Audio loaded successfully - readyState:', this.audioElement.readyState);
                }
                
                this.showNotification('🎵 Audio loaded and ready to play!', 'success');
            };
            
            const onAudioError = (e) => {
                if (audioLoadResolved) return;
                
                // Give a small delay to see if audio actually loads despite the error
                setTimeout(() => {
                    if (audioLoadResolved) return;
                    
                    // Check if audio actually has loaded data despite the error event
                    if (this.audioElement && this.audioElement.readyState >= 2) {
                        onAudioLoaded();
                        return;
                    }
                    
                    audioLoadResolved = true;
                    console.warn('❌ Audio loading failed - readyState:', this.audioElement?.readyState, 'error:', e);
                    this.audioLoaded = false;
                    this.showNotification('⚠️ Audio failed to load - video will play without sound', 'warning');
                }, 1000);
            };
            
            // Multiple success events to handle different browsers
            this.audioElement.addEventListener('loadeddata', onAudioLoaded);
            this.audioElement.addEventListener('canplay', onAudioLoaded);
            this.audioElement.addEventListener('canplaythrough', onAudioLoaded);
            
            // Error handling
            this.audioElement.addEventListener('error', onAudioError);
            this.audioElement.addEventListener('abort', onAudioError);
            
            this.audioElement.addEventListener('ended', () => {
                this.isPlaying = false;
                this.currentTime = 0;
                this.updatePlayPauseButtons();
            });
            
            // Timeout fallback for slow loading
            setTimeout(() => {
                if (!audioLoadResolved && this.audioElement) {
                    if (this.audioElement.readyState >= 2) {
                        // Audio has loaded enough data but events didn't fire properly
                        console.log('🔄 Audio loaded via timeout fallback');
                        onAudioLoaded();
                    } else {
                        // Audio really failed to load
                        console.warn('⏰ Audio loading timeout');
                        onAudioError(new Error('Audio loading timeout'));
                    }
                }
            }, 8000);
            
            // Load the audio
            this.audioElement.src = audioUrl;
            
        } catch (error) {
            console.error('Error setting up audio:', error);
            this.audioLoaded = false;
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
            video.preload = 'metadata';
            video.playsInline = true;
            video.muted = true; // Start muted for autoplay
            video.volume = 1.0;
            
            // Don't set crossOrigin initially - let browser handle it naturally
            // This matches how the video edit modal works
            
            let resolved = false;
            
            const onSuccess = () => {
                if (resolved) return;
                resolved = true;
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
                this.loadedVideos.set(url, null);
                reject(error);
            };
            
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
        document.getElementById('previewPlaceholder').style.display = 'none';
        document.getElementById('previewCanvasContainer').style.display = 'block';
        document.getElementById('playPauseBtn').disabled = false;
        document.getElementById('splitClipBtn').disabled = false;
        document.getElementById('fullscreenBtn').disabled = false;
    }

    // Render loop for real-time preview matching backend output
    startRenderLoop() {
        const render = () => {
            if (this.isPlaying) {
                // Sync with audio if available, otherwise use frame-based timing
                if (this.audioElement && this.audioLoaded && !this.audioElement.paused) {
                    this.currentTime = this.audioElement.currentTime;
                } else {
                    this.currentTime += 1/30; // 30 FPS fallback
                }
                
                if (this.currentTime >= this.totalDuration) {
                    this.currentTime = 0;
                    this.isPlaying = false;
                    this.updatePlayPauseButtons();
                    
                    // Stop audio if playing
                    if (this.audioElement && this.audioLoaded) {
                        this.audioElement.pause();
                        this.audioElement.currentTime = 0;
                    }
                    
                    // Pause all videos and mute audio when timeline ends
                    this.pauseAllVideos();
                    this.muteAllVideoAudio();
                }
                this.updateTimeDisplay();
                this.updatePlayheadPosition();
                this.updateAudioVolume();
            }
            
            this.renderFrame();
            requestAnimationFrame(render);
        };
        render();
    }

    renderFrame() {
        if (!this.currentData || !this.ctx) return;
        
        // Render to main canvas
        this.renderToCanvas(this.ctx, this.canvas.width, this.canvas.height);
        
        // Also render to fullscreen canvas if modal is open
        if (this.fullscreenCtx && document.getElementById('fullscreenModal').classList.contains('active')) {
            this.renderToCanvas(this.fullscreenCtx, this.fullscreenCanvas.width, this.fullscreenCanvas.height);
            this.updateFullscreenTimeDisplay();
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
            ctx.arc(x + iconSize/2, y + iconSize/2, iconSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Audio wave animation
            ctx.strokeStyle = '#4a90e2';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            const time = Date.now() / 100;
            for (let i = 0; i < 3; i++) {
                const barHeight = 10 + Math.sin(time + i) * 5;
                const barX = x + iconSize/2 - 10 + i * 10;
                const barY = y + iconSize/2;
                
                ctx.beginPath();
                ctx.moveTo(barX, barY - barHeight/2);
                ctx.lineTo(barX, barY + barHeight/2);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }

    getAudioStatus() {
        if (!this.audioElement) return 'No audio element';
        
        const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
        return {
            loaded: this.audioLoaded,
            readyState: this.audioElement.readyState,
            readyStateText: states[this.audioElement.readyState] || 'UNKNOWN',
            duration: this.audioElement.duration,
            currentTime: this.audioElement.currentTime,
            paused: this.audioElement.paused,
            src: this.audioElement.src
        };
    }

    updateAudioVolume() {
        if (!this.audioElement || !this.audioLoaded) return;
        
        let volume = 1.0; // Default volume
        
        // Check if any video clips are currently playing and have volume settings
        if (this.currentData.clips) {
            for (const clip of this.currentData.clips) {
                const clipStart = clip.start || 0;
                const clipDuration = clip.duration || 5;
                const clipEnd = clipStart + clipDuration;
                
                // If current time is within this clip's timeframe
                if (this.currentTime >= clipStart && this.currentTime <= clipEnd) {
                    if (clip.volume !== undefined) {
                        // Convert percentage to decimal (100% = 1.0)
                        volume = Math.max(0, Math.min(2.0, (clip.volume || 100) / 100));
                        break; // Use the first matching clip's volume
                    }
                }
            }
        }
        
        // Apply volume to audio element
        this.audioElement.volume = volume;
    }

    pauseAllVideos() {
        // Simple pause all videos when playback stops
        if (this.loadedVideos && this.loadedVideos.size > 0) {
            for (const [url, video] of this.loadedVideos) {
                if (video && !video.paused) {
                    video.pause();
                }
            }
        }
    }

    updateVideoAudioStates(activeVideoUrl) {
        // Mute all videos except the active one
        if (this.loadedVideos && this.loadedVideos.size > 0) {
            for (const [url, video] of this.loadedVideos) {
                if (video && url !== activeVideoUrl) {
                    video.muted = true;
                }
            }
        }
    }

    muteAllVideoAudio() {
        // Mute all video audio
        if (this.loadedVideos && this.loadedVideos.size > 0) {
            for (const [url, video] of this.loadedVideos) {
                if (video) {
                    video.muted = true;
                }
            }
        }
    }

    renderCurrentMedia(ctx, width, height) {
        let currentMedia = null;
        let clipStartTime = 0;
        let clipDuration = 0;
        let currentVideoUrl = null;
        
        // Find current video/image clip
        if (this.currentData.clips) {
            for (const clip of this.currentData.clips) {
                const start = clip.start || 0;
                const duration = clip.duration || 5;
                
                if (this.currentTime >= start && this.currentTime < start + duration) {
                    currentMedia = clip;
                    clipStartTime = start;
                    clipDuration = duration;
                    currentVideoUrl = clip.imageurl || clip.videourl || clip.videoUrl;
                    
                    // Debug logging for begin parameter usage (disabled to reduce console spam)
                    // if (clip.begin && clip.begin > 0) {
                    //     console.log(`🎯 Found clip with begin parameter: begin=${clip.begin}s, start=${start}s, duration=${duration}s, currentTime=${this.currentTime.toFixed(2)}s`);
                    // }
                    break;
                }
            }
        }
        
        // Manage video audio states when active video changes
        if (this.currentActiveVideoUrl !== currentVideoUrl) {
            console.log(`🎬 Active video changed: "${currentVideoUrl ? currentVideoUrl.substring(0, 60) : 'none'}"`);
            this.updateVideoAudioStates(currentVideoUrl);
            this.currentActiveVideoUrl = currentVideoUrl;
        }
        
        // If no video is currently active, make sure all are muted
        if (!currentVideoUrl) {
            this.muteAllVideoAudio();
        }
        
        // Fallback to single media
        if (!currentMedia) {
            if (this.currentData.imageUrl) {
                currentMedia = { videoUrl: this.currentData.imageUrl };
                clipDuration = this.currentData.duration || 10;
            } else if (this.currentData.videoUrl) {
                currentMedia = { videoUrl: this.currentData.videoUrl, start: this.currentData.start || 0, begin: this.currentData.begin || 0 };
                clipDuration = this.currentData.duration || 10;
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
                
                this.drawMedia(ctx, mediaUrl, width, height, currentMedia.start || clipStartTime, fadeOpacity, currentMedia);
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

    drawMedia(ctx, url, canvasWidth, canvasHeight, clipStart, opacity = 1.0, currentClip = null) {
        // Save context and apply fade opacity
        ctx.save();
        ctx.globalAlpha = opacity;
        
        let mediaDrawn = false;
        
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
                    // Sync video time with clip time, accounting for begin parameter
                    const beginTime = currentClip ? (currentClip.begin || 0) : 0;
                    const timeInClip = this.currentTime - clipStart;
                    const videoTime = beginTime + timeInClip;
                    
                    // Debug logging for begin parameter (disabled to reduce console spam)
                    // if (beginTime > 0) {
                    //     console.log(`🎬 Video preview using begin parameter: begin=${beginTime}s, timeInClip=${timeInClip.toFixed(2)}s, videoTime=${videoTime.toFixed(2)}s`);
                    // }
                    
                    if (Math.abs(video.currentTime - videoTime) > 0.5) {
                        video.currentTime = videoTime;
                    }
                    
                    // SIMPLE VOLUME CONTROL - Rewritten from scratch
                    const isActiveClip = (url === this.currentActiveVideoUrl);
                    
                    if (isActiveClip && this.isPlaying) {
                        // This is the currently playing clip
                        
                        // Get volume from clip (0-200%)
                        const clipVolume = currentClip && currentClip.volume !== undefined ? currentClip.volume : 100;
                        const volumeValue = Math.max(0, Math.min(2.0, clipVolume / 100));
                        
                        // Unmute and set volume
                        video.muted = false;
                        video.volume = volumeValue;
                        
                        console.log(`🔊 Clip volume: ${clipVolume}% (${volumeValue.toFixed(2)})`);
                        
                        // Play if paused
                        if (video.paused) {
                            video.play().catch(e => console.warn('Play failed:', e));
                        }
                    } else {
                        // Not active or not playing - mute and pause
                        video.muted = true;
                        if (!video.paused) {
                            video.pause();
                        }
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
                const start = caption.start || 0;
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
                y = (canvasHeight - 40) / 2; // Match backend y=(1920-40)/2 exactly - center position
                maxWidth = canvasWidth * 0.8;
                break;
        }
        
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`; // Match backend Arial Bold font
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'top';
        
        // Text shadow matching backend exactly
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        
        // Different shadow offsets for different text types to match backend
        if (type === 'watermark') {
            ctx.shadowOffsetX = 3; // Match backend shadowx=3
            ctx.shadowOffsetY = 3; // Match backend shadowy=3
        } else {
            ctx.shadowOffsetX = 2; // Match backend shadowx=2 for other text
            ctx.shadowOffsetY = 2; // Match backend shadowy=2 for other text
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
        if (!this.currentData) return;
        
        this.renderVideoTimeline();
        this.renderTextTimeline();
        this.renderAudioTimeline();
        
        document.getElementById('globalPlayhead').style.display = 'block';
        this.updatePlayheadPosition();
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
            const duration = this.currentData.duration || 10;
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
            const width = duration * this.timelineZoom;
            
            // Create clip element
            const clipEl = document.createElement('div');
            clipEl.className = 'timeline-clip audio';
            clipEl.style.left = '0px';
            clipEl.style.width = `${width}px`;
            
            // Create SVG waveform that fills entire width
            const svg = this.createWaveformSVG(width, 40, duration);
            svg.style.position = 'absolute';
            svg.style.left = '0';
            svg.style.top = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.opacity = '0.5';
            
            // Create text overlay with semi-transparent background
            const textOverlay = document.createElement('div');
            textOverlay.style.position = 'absolute';
            textOverlay.style.left = '8px';
            textOverlay.style.top = '50%';
            textOverlay.style.transform = 'translateY(-50%)';
            textOverlay.style.zIndex = '2';
            textOverlay.style.display = 'flex';
            textOverlay.style.alignItems = 'center';
            textOverlay.style.gap = '6px';
            textOverlay.style.padding = '4px 8px';
            textOverlay.style.background = 'rgba(0, 0, 0, 0.3)';
            textOverlay.style.borderRadius = '4px';
            textOverlay.innerHTML = `<i class="fas fa-music"></i> Audio (${duration}s)`;
            
            // Add click handler to show beat detection panel
            clipEl.addEventListener('click', () => {
                this.showBeatDetectionPanel();
            });
            
            clipEl.appendChild(svg);
            clipEl.appendChild(textOverlay);
            
            // Add markers if detected
            if (this.detectedBeats && this.detectedBeats.length > 0) {
                this.detectedBeats.forEach(marker => {
                    const markerEl = document.createElement('div');
                    markerEl.className = marker.type === 'beat' ? 'beat-marker' : 'tone-marker';
                    markerEl.style.position = 'absolute';
                    markerEl.style.left = `${marker.time * this.timelineZoom}px`;
                    markerEl.style.top = '0';
                    markerEl.style.width = '2px';
                    markerEl.style.height = '100%';
                    markerEl.style.background = marker.type === 'beat' ? '#fbbf24' : '#60a5fa';
                    markerEl.style.zIndex = '3';
                    markerEl.style.pointerEvents = 'none';
                    markerEl.style.boxShadow = marker.type === 'beat' 
                        ? '0 0 4px rgba(251, 191, 36, 0.5)' 
                        : '0 0 4px rgba(96, 165, 250, 0.5)';
                    markerEl.title = marker.type === 'beat' 
                        ? `Beat at ${marker.time.toFixed(2)}s` 
                        : `Tone change at ${marker.time.toFixed(2)}s`;
                    clipEl.appendChild(markerEl);
                });
            }
            
            container.appendChild(clipEl);
        }
        
        if (!container.children.length) {
            container.innerHTML = '<div style="color: #666; padding: 8px; font-size: 12px;">No audio</div>';
        }
    }
    
    createWaveformSVG(width, height, duration) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        const centerY = height / 2;
        // Increase bar density for better beat detection - 1 bar per 2 pixels
        const barCount = Math.min(Math.floor(width / 2), 500);
        const barWidth = width / barCount;
        
        // Use real waveform data if available, otherwise generate pseudo-random
        for (let i = 0; i < barCount; i++) {
            let amplitude;
            
            if (this.audioWaveformData && this.audioWaveformData.length > 0) {
                const dataIndex = Math.floor((i / barCount) * this.audioWaveformData.length);
                amplitude = this.audioWaveformData[dataIndex];
            } else {
                const seed = (i * 12345 + duration * 67890) % 1000;
                amplitude = (Math.sin(seed) * 0.5 + 0.5) * 0.8 + 0.2;
            }
            
            const barHeight = amplitude * (height * 0.8);
            const x = i * barWidth;
            const y = centerY - barHeight / 2;
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', Math.max(1, barWidth - 1));
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', 'rgba(255, 255, 255, 0.8)');
            
            svg.appendChild(rect);
        }
        
        return svg;
    }
    
    async generateAudioWaveform(audioUrl) {
        try {
            console.log('🎨 Generating waveform from audio file...');
            
            // Fetch audio file
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Get audio data from first channel
            const channelData = audioBuffer.getChannelData(0);
            const samples = 200; // Number of bars in waveform
            const blockSize = Math.floor(channelData.length / samples);
            
            // Calculate amplitude for each bar
            const waveformData = [];
            for (let i = 0; i < samples; i++) {
                const start = blockSize * i;
                let sum = 0;
                
                // Calculate RMS (root mean square) for this block
                for (let j = 0; j < blockSize; j++) {
                    sum += channelData[start + j] ** 2;
                }
                const rms = Math.sqrt(sum / blockSize);
                waveformData.push(rms);
            }
            
            // Normalize waveform data
            const max = Math.max(...waveformData);
            this.audioWaveformData = waveformData.map(val => val / max);
            
            console.log('✅ Waveform generated successfully');
            
        } catch (error) {
            console.error('❌ Failed to generate waveform:', error);
            this.audioWaveformData = null;
            throw error;
        }
    }
    


    createTimelineClip(item, index, type) {
        const start = item.start || 0;
        const duration = item.duration || (type === 'text' ? 3 : 5);
        
        const clipEl = document.createElement('div');
        clipEl.className = `timeline-clip ${type === 'text' ? 'caption' : ''}`;
        clipEl.style.left = `${start * this.timelineZoom}px`;
        clipEl.style.width = `${duration * this.timelineZoom}px`;
        clipEl.dataset.index = index;
        clipEl.dataset.type = type;
        
        if (type === 'video') {
            const volumeInfo = item.volume !== undefined ? ` 🔊${item.volume}%` : '';
            clipEl.innerHTML = `
                <div class="timeline-clip-resize-handle left"></div>
                <i class="fas fa-video"></i> 
                <span>Clip ${index + 1} (${duration.toFixed(1)}s)${volumeInfo}</span>
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
            
            // Highlight corresponding clip in properties panel
            this.highlightPropertiesClip(index, type);
            
            // Jump playhead to clip start position
            this.currentTime = item.start || 0;
            this.updatePlayheadPosition();
            this.updateTimeDisplay();
            
            console.log(`🎯 Jumped to ${type} clip at ${this.currentTime}s`);
        });
        
        clipEl.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('timeline-clip-resize-handle')) return;
            // Double-click behavior can be different if needed
            this.currentTime = item.start || 0;
            this.updatePlayheadPosition();
            this.updateTimeDisplay();
        });
        
        this.makeDraggable(clipEl, item, index, type);
        this.makeResizable(clipEl, item, index, type);
    }
    
    highlightPropertiesClip(index, type) {
        // Remove highlight from all property clips
        document.querySelectorAll('.clip-item, .caption-item').forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // Add highlight to the corresponding clip in properties panel
        if (type === 'video') {
            const clipItems = document.querySelectorAll('.clip-item');
            if (clipItems[index]) {
                clipItems[index].classList.add('highlighted');
                // Scroll into view
                clipItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else if (type === 'text') {
            const captionItems = document.querySelectorAll('.caption-item');
            if (captionItems[index]) {
                captionItems[index].classList.add('highlighted');
                // Scroll into view
                captionItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
    
    jumpToClip(index, type, event) {
        // Prevent triggering when clicking on buttons or inputs
        if (event && (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || 
            event.target.tagName === 'TEXTAREA' || event.target.closest('button'))) {
            return;
        }
        
        // Get the clip data
        let clip;
        if (type === 'video' && this.currentData.clips && this.currentData.clips[index]) {
            clip = this.currentData.clips[index];
        } else if (type === 'text' && this.currentData.captions && this.currentData.captions[index]) {
            clip = this.currentData.captions[index];
        }
        
        if (!clip) return;
        
        // Jump playhead to clip start position
        this.currentTime = clip.start || 0;
        this.updatePlayheadPosition();
        this.updateTimeDisplay();
        
        // Highlight the corresponding timeline clip
        document.querySelectorAll('.timeline-clip').forEach(el => el.classList.remove('selected'));
        
        const timelineClips = document.querySelectorAll(`.timeline-clip[data-index="${index}"][data-type="${type}"]`);
        if (timelineClips.length > 0) {
            timelineClips[0].classList.add('selected');
        }
        
        // Highlight this clip in properties
        this.highlightPropertiesClip(index, type);
        
        console.log(`🎯 Jumped to ${type} clip ${index + 1} at ${this.currentTime}s`);
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
        // Start at 320px (after preview section) + 150px (track label width)
        const position = 320 + 150 + (this.currentTime * this.timelineZoom);
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
        
        // Also update the playbar
        this.updateFullscreenPlaybar();
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
            if (this.currentData.alt !== undefined) {
                html += this.createFormGroup('alt', 'Alt Text (alternate version)', this.currentData.alt, 'textarea');
            }
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
        
        // Always show original parameter field (even if empty) with open link button
        html += this.createOriginalFormGroup('original', 'Original Instagram URL', this.currentData.original || '');
        
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

    createOriginalFormGroup(id, label, value) {
        const hasValue = value && value.trim() !== '';
        const buttonDisabled = !hasValue ? 'disabled' : '';
        
        return `
            <div class="form-group">
                <label for="${id}">${label}</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="url" id="${id}" value="${value || ''}" style="flex: 1;" placeholder="https://www.instagram.com/reel/...">
                    <button 
                        id="${id}OpenBtn" 
                        class="btn-open-link"
                        onclick="videoEditor.openOriginalUrl()" 
                        ${buttonDisabled}
                        title="Open original Instagram URL in new tab">
                        <i class="fas fa-external-link-alt"></i>
                        Open
                    </button>
                </div>
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
                <div class="clip-item ${clipTypeClass}" onclick="videoEditor.jumpToClip(${index}, 'video', event)">
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
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <input type="text" value="${mediaUrl}" onchange="videoEditor.updateClipUrl(${index}, this.value)" style="flex: 1;">
                            ${!isImage ? `
                            <button class="btn-browse" onclick="videoEditor.showVideoBrowser(${index})" title="Browse videos from Filebase">
                                <i class="fas fa-folder-open"></i>
                            </button>
                            ` : ''}
                        </div>
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
                    ${!isImage ? `
                    <div class="clip-field">
                        <label>Volume (%) <small style="color: #666;">- 0=mute, 100=normal, 200=max boost</small></label>
                        <input type="number" value="${clip.volume !== undefined ? clip.volume : 100}" min="0" max="200" step="1" onchange="videoEditor.updateClip(${index}, 'volume', parseInt(this.value))">
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
                <div class="caption-item" onclick="videoEditor.jumpToClip(${index}, 'text', event)">
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
                        <label>Alt Text (alternate version)</label>
                        <textarea rows="2" placeholder="Optional alternate version of caption text..." onchange="videoEditor.updateCaption(${index}, 'alt', this.value)">${caption.alt || ''}</textarea>
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
                    
                    // Update the open button state if this is the original field
                    if (field === 'original') {
                        this.updateOriginalOpenButton();
                    }
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

    openOriginalUrl() {
        const originalInput = document.getElementById('original');
        const url = originalInput ? originalInput.value.trim() : '';
        
        if (url) {
            // Validate URL format
            try {
                new URL(url);
                window.open(url, '_blank', 'noopener,noreferrer');
                console.log(`🔗 Opened original URL: ${url}`);
            } catch (e) {
                this.showNotification('Invalid URL format', 'error');
                console.error('Invalid URL:', url);
            }
        } else {
            this.showNotification('No URL to open', 'warning');
        }
    }

    updateOriginalOpenButton() {
        const originalInput = document.getElementById('original');
        const openBtn = document.getElementById('originalOpenBtn');
        
        if (originalInput && openBtn) {
            const hasValue = originalInput.value.trim() !== '';
            openBtn.disabled = !hasValue;
        }
    }

    addClip() {
        this.saveToHistory();
        
        if (!this.currentData.clips) this.currentData.clips = [];
        
        // Find next available position that doesn't overlap with existing clips
        const newStart = this.findNextAvailablePosition('video', 5);
        
        this.currentData.clips.push({
            videourl: '', // Use the new structure - default to video
            description: '',
            begin: 0, // NEW: Begin parameter for source video start position
            start: newStart,
            duration: 5,
            volume: 100 // Default volume for video clips
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
            this.saveToHistory();
            this.currentData.clips.splice(index, 1);
            this.calculateTotalDuration();
            this.renderProperties();
            this.renderTimeline();
            this.autoSave();
        }
    }

    addCaption() {
        this.saveToHistory();
        
        if (!this.currentData.captions) this.currentData.captions = [];
        
        // Find next available position that doesn't overlap with existing captions
        const newStart = this.findNextAvailablePosition('text', 3);
        
        this.currentData.captions.push({
            text: 'New Caption',
            alt: '',
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
            this.saveToHistory();
            this.currentData.captions.splice(index, 1);
            this.calculateTotalDuration();
            this.renderProperties();
            this.renderTimeline();
            this.autoSave();
        }
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying && this.currentTime >= this.totalDuration) {
            this.currentTime = 0;
        }
        
        // Control audio playback
        if (this.audioElement && this.audioLoaded) {
            try {
                if (this.isPlaying) {
                    this.audioElement.currentTime = this.currentTime;
                    this.audioElement.play().catch(e => {
                        console.warn('Audio play failed:', e);
                        // If audio fails, continue with visual playback
                    });
                } else {
                    this.audioElement.pause();
                }
            } catch (error) {
                console.warn('Audio control error:', error);
            }
        }
        
        // Control video clip audio playback
        if (!this.isPlaying) {
            // Pause all videos and mute audio when playback stops
            this.pauseAllVideos();
            this.muteAllVideoAudio();
        }
        
        this.updatePlayPauseButtons();
    }
    
    updatePlayPauseButtons() {
        const btn = document.getElementById('playPauseBtn');
        const playbarBtn = document.getElementById('fullscreenPlaybarPlayBtn');
        
        const iconHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        btn.innerHTML = iconHTML;
        if (playbarBtn) {
            playbarBtn.innerHTML = iconHTML;
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
                
                // Sync audio to new time
                if (this.audioElement && this.audioLoaded) {
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
            let newTime = Math.max(0, Math.min(startTime + deltaTime, this.totalDuration));
            
            // Apply magnetic snapping to beats/tones
            newTime = this.snapToNearestMarker(newTime);
            
            this.currentTime = newTime;
            
            // Sync audio to new time
            if (this.audioElement && this.audioLoaded) {
                this.audioElement.currentTime = this.currentTime;
            }
            
            this.updatePlayheadPosition();
            this.updateTimeDisplay();
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
            }
        };

        playhead.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    snapToNearestMarker(time) {
        // Only snap if we have detected beats/tones
        if (!this.detectedBeats || this.detectedBeats.length === 0) {
            return time;
        }
        
        // Snap threshold: 0.2 seconds (200ms)
        const snapThreshold = 0.2;
        
        // Find the nearest marker
        let nearestMarker = null;
        let minDistance = snapThreshold;
        
        for (const marker of this.detectedBeats) {
            const distance = Math.abs(marker.time - time);
            if (distance < minDistance) {
                minDistance = distance;
                nearestMarker = marker;
            }
        }
        
        // Snap to the nearest marker if found
        return nearestMarker ? nearestMarker.time : time;
    }
    
    splitClipAtPlayhead() {
        if (!this.currentData || !this.currentData.clips) {
            this.showNotification('No clips to split!', 'error');
            return;
        }
        
        // Save state before splitting
        this.saveToHistory();
        
        const playheadTime = this.currentTime;
        
        // Find which clip the playhead is over
        let clipToSplit = null;
        let clipIndex = -1;
        
        for (let i = 0; i < this.currentData.clips.length; i++) {
            const clip = this.currentData.clips[i];
            const clipStart = clip.start || 0;
            const clipEnd = clipStart + (clip.duration || 5);
            
            if (playheadTime > clipStart && playheadTime < clipEnd) {
                clipToSplit = clip;
                clipIndex = i;
                break;
            }
        }
        
        if (!clipToSplit) {
            this.showNotification('Playhead is not over any clip!', 'warning');
            return;
        }
        
        // Calculate split point relative to clip start
        const clipStart = clipToSplit.start || 0;
        const splitPoint = playheadTime - clipStart;
        
        // Create first part (before split)
        const firstPart = { ...clipToSplit };
        firstPart.duration = splitPoint;
        
        // Create second part (after split)
        const secondPart = { ...clipToSplit };
        secondPart.start = playheadTime;
        secondPart.duration = (clipToSplit.duration || 5) - splitPoint;
        
        // If it's a video clip with begin time, adjust the second part's begin time
        if (clipToSplit.begin !== undefined) {
            secondPart.begin = (clipToSplit.begin || 0) + splitPoint;
        }
        
        // Replace the original clip with the two new clips
        this.currentData.clips.splice(clipIndex, 1, firstPart, secondPart);
        
        // Update UI
        this.calculateTotalDuration();
        this.renderProperties();
        this.renderTimeline();
        this.autoSave();
        
        this.showNotification(`✂️ Clip split at ${playheadTime.toFixed(2)}s`, 'success');
        console.log('🎬 Clip split:', { clipIndex, splitPoint, firstPart, secondPart });
    }

    saveToHistory() {
        if (!this.currentData) return;
        
        // Create a deep copy of current state
        const state = JSON.parse(JSON.stringify(this.currentData));
        
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add new state
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        console.log(`📝 History saved (${this.historyIndex + 1}/${this.history.length})`);
    }
    
    undo() {
        if (this.historyIndex <= 0) {
            this.showNotification('Nothing to undo', 'info');
            return;
        }
        
        this.historyIndex--;
        this.restoreFromHistory();
        this.showNotification(`↩️ Undo (${this.historyIndex + 1}/${this.history.length})`, 'info');
    }
    
    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            this.showNotification('Nothing to redo', 'info');
            return;
        }
        
        this.historyIndex++;
        this.restoreFromHistory();
        this.showNotification(`↪️ Redo (${this.historyIndex + 1}/${this.history.length})`, 'info');
    }
    
    restoreFromHistory() {
        if (this.historyIndex < 0 || this.historyIndex >= this.history.length) return;
        
        // Restore state from history
        this.currentData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
        
        // Update UI
        this.calculateTotalDuration();
        this.renderProperties();
        this.renderTimeline();
        this.preloadMedia();
        this.autoSave();
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

        if (!this.currentNotionId) {
            this.showNotification('No Notion record loaded. Use "Load from Notion" first.', 'error');
            return;
        }

        try {
            // Show saving notification
            this.showNotification('Saving to database...', 'info');

            // Clean up the data structure before saving
            const cleanedData = this.cleanDataForExport(this.currentData);
            const jsonString = JSON.stringify(cleanedData, null, 2);

            // Save JSON to Supabase via worker
            const workerUrl = 'https://notion-reader.debabratamaitra898.workers.dev';
            const response = await fetch(`${workerUrl}/?formula_id=${this.currentNotionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    json: jsonString
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to save: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('✅ JSON data saved successfully!', 'success');
                console.log('💾 Saved JSON to Supabase:', {
                    id: this.currentNotionId,
                    jsonLength: jsonString.length
                });
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification(`❌ Error saving: ${error.message}`, 'error');
        }
    }

    async updateNotionRecord(cleanedData) {
        if (!this.currentNotionId) {
            throw new Error('No Notion record ID available');
        }

        const jsonString = JSON.stringify(cleanedData, null, 2);
        const workerUrl = 'https://notion-reader.debabratamaitra898.workers.dev';
        
        const response = await fetch(`${workerUrl}/?formula_id=${this.currentNotionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                json: jsonString,
                status: 'Confirmed'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update Notion: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            this.showNotification('✅ Notion record updated and status set to Confirmed!', 'success');
            console.log('💾 Updated Notion record:', {
                id: this.currentNotionId,
                status: 'Confirmed',
                jsonLength: jsonString.length
            });
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
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

        if (!this.currentNotionId) {
            this.showNotification('No Notion record loaded. Use "Load from Notion" first.', 'error');
            return;
        }

        try {
            // Step 1: Save JSON to Supabase
            this.showNotification('Saving to database...', 'info');
            
            const cleanedData = this.cleanDataForExport(this.currentData);
            const jsonString = JSON.stringify(cleanedData, null, 2);
            const workerUrl = 'https://notion-reader.debabratamaitra898.workers.dev';
            
            const saveResponse = await fetch(`${workerUrl}/?formula_id=${this.currentNotionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    json: jsonString
                })
            });

            if (!saveResponse.ok) {
                throw new Error(`Failed to save JSON: ${saveResponse.status}`);
            }

            const saveResult = await saveResponse.json();
            
            if (!saveResult.success) {
                throw new Error(saveResult.error || 'Failed to save JSON');
            }

            console.log('✅ JSON saved to Supabase:', {
                id: this.currentNotionId,
                jsonLength: jsonString.length
            });

            // Step 2: Update Notion status to "Confirmed"
            this.showNotification('Updating status to Confirmed...', 'info');
            
            const statusResponse = await fetch(`${workerUrl}/?formula_id=${this.currentNotionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'Confirmed'
                })
            });

            if (!statusResponse.ok) {
                throw new Error(`Failed to update status: ${statusResponse.status}`);
            }

            const statusResult = await statusResponse.json();
            
            if (!statusResult.success) {
                throw new Error(statusResult.error || 'Failed to update status');
            }

            console.log('✅ Notion status updated to Confirmed:', {
                id: this.currentNotionId
            });

            this.showNotification('✅ Data confirmed and status updated!', 'success');

        } catch (error) {
            console.error('Failed to confirm data:', error);
            this.showNotification(`❌ Failed to confirm: ${error.message}`, 'error');
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

    // Beat Detection Feature
    showBeatDetectionPanel() {
        // Scroll to properties section
        const propertiesContent = document.querySelector('.properties-content');
        if (propertiesContent) {
            propertiesContent.scrollTop = 0;
        }
        
        // Render beat detection UI
        this.renderBeatDetectionUI();
    }
    
    renderBeatDetectionUI() {
        const propertiesContent = document.querySelector('.properties-content');
        if (!propertiesContent) return;
        
        // Remove existing beat detection panel if any
        const existingPanel = document.getElementById('beatDetectionPanel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // Create beat detection panel with shadcn colors
        const panel = document.createElement('div');
        panel.id = 'beatDetectionPanel';
        panel.className = 'form-group';
        panel.style.background = '#18181b';
        panel.style.border = '1px solid #27272a';
        
        const beatsDetected = this.detectedBeats.filter(b => b.type === 'beat').length;
        const tonesDetected = this.detectedBeats.filter(b => b.type === 'tone').length;
        
        const beatsList = this.detectedBeats.length > 0 
            ? this.detectedBeats.slice(0, 20).map(b => {
                const icon = b.type === 'beat' ? '🥁' : '🎵';
                return `${icon} ${b.time.toFixed(2)}s`;
            }).join(', ') + (this.detectedBeats.length > 20 ? '...' : '')
            : 'No markers detected yet';
        
        panel.innerHTML = `
            <h3 style="color: #fafafa; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 14px;">
                <i class="fas fa-waveform-lines"></i> Audio Analysis
            </h3>
            <p style="color: #a1a1aa; font-size: 12px; margin-bottom: 16px; line-height: 1.5;">
                Detect beats and tone changes to sync your video clips with the music
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                <div style="background: #27272a; padding: 12px; border-radius: 6px; border: 1px solid #3f3f46;">
                    <div style="color: #fbbf24; font-size: 20px; font-weight: 700;">${beatsDetected}</div>
                    <div style="color: #a1a1aa; font-size: 11px;">Beats</div>
                </div>
                <div style="background: #27272a; padding: 12px; border-radius: 6px; border: 1px solid #3f3f46;">
                    <div style="color: #60a5fa; font-size: 20px; font-weight: 700;">${tonesDetected}</div>
                    <div style="color: #a1a1aa; font-size: 11px;">Tone Changes</div>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="color: #e4e4e7; font-size: 12px; margin-bottom: 8px; display: block; font-weight: 500;">
                    Detection Sensitivity
                </label>
                <input type="range" id="beatSensitivity" min="0.3" max="0.9" step="0.1" value="0.6" 
                    style="width: 100%; accent-color: #3b82f6;">
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #71717a; margin-top: 4px;">
                    <span>More</span>
                    <span>Fewer</span>
                </div>
            </div>
            
            <button id="detectBeatsBtn" class="btn" style="width: 100%; background: #3b82f6; color: white; font-weight: 500; margin-bottom: 8px; border: none; font-size: 13px;">
                <i class="fas fa-sparkles"></i> Analyze Audio
            </button>
            <button id="clearBeatsBtn" class="btn" style="width: 100%; background: #27272a; color: #e4e4e7; font-weight: 500; border: 1px solid #3f3f46; font-size: 13px; ${this.detectedBeats.length === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                <i class="fas fa-trash"></i> Clear All (${this.detectedBeats.length})
            </button>
            
            <div id="beatsList" style="margin-top: 12px; padding: 10px; background: #09090b; border-radius: 6px; max-height: 120px; overflow-y: auto; border: 1px solid #27272a;">
                <small style="color: #a1a1aa; font-size: 11px; line-height: 1.6;">${beatsList}</small>
            </div>
        `;
        
        // Insert at the top of properties
        propertiesContent.insertBefore(panel, propertiesContent.firstChild);
        
        // Add event listeners
        document.getElementById('detectBeatsBtn').addEventListener('click', () => this.detectBeats());
        document.getElementById('clearBeatsBtn').addEventListener('click', () => this.clearBeats());
    }
    
    async detectBeats() {
        if (!this.audioElement || !this.audioLoaded) {
            this.showNotification('Please load audio first!', 'error');
            return;
        }
        
        const btn = document.getElementById('detectBeatsBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        
        try {
            const audioUrl = this.currentData.audioUrl || this.currentData.instagramUrl;
            const sensitivity = parseFloat(document.getElementById('beatSensitivity').value);
            
            // Fetch and analyze audio
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Detect beats and tone changes
            const beats = this.analyzeBeatsfromAudioBuffer(audioBuffer, sensitivity);
            const toneChanges = this.analyzeToneChanges(audioBuffer, sensitivity);
            
            // Combine and sort by time
            this.detectedBeats = [...beats, ...toneChanges].sort((a, b) => a.time - b.time);
            
            const beatCount = beats.length;
            const toneCount = toneChanges.length;
            this.showNotification(`✅ Found ${beatCount} beats, ${toneCount} tone changes`, 'success');
            this.renderBeatDetectionUI();
            this.renderTimeline(); // Re-render to show markers
            
        } catch (error) {
            console.error('Audio analysis error:', error);
            this.showNotification('Failed to analyze audio', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sparkles"></i> Analyze Audio';
        }
    }
    
    analyzeBeatsfromAudioBuffer(audioBuffer, sensitivity) {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const beats = [];
        
        // High-precision onset detection using energy envelope
        const windowSize = Math.floor(sampleRate * 0.0116); // ~11.6ms (512 samples at 44.1kHz)
        const hopSize = Math.floor(windowSize / 4); // 75% overlap for precision
        
        // Calculate energy envelope
        const energyEnvelope = [];
        for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            let energy = 0;
            for (let j = 0; j < windowSize; j++) {
                energy += channelData[i + j] ** 2;
            }
            energyEnvelope.push({
                time: i / sampleRate,
                energy: Math.sqrt(energy / windowSize) // RMS
            });
        }
        
        // Calculate first-order difference (rate of change)
        const differences = [];
        for (let i = 1; i < energyEnvelope.length; i++) {
            const diff = energyEnvelope[i].energy - energyEnvelope[i - 1].energy;
            differences.push({
                time: energyEnvelope[i].time,
                diff: Math.max(0, diff) // Only positive changes (onsets)
            });
        }
        
        // Calculate global statistics for better threshold
        const allDiffs = differences.map(d => d.diff);
        const sortedDiffs = [...allDiffs].sort((a, b) => a - b);
        const percentile90 = sortedDiffs[Math.floor(sortedDiffs.length * 0.9)];
        const mean = allDiffs.reduce((sum, d) => sum + d, 0) / allDiffs.length;
        
        // Much stricter threshold
        const globalThreshold = Math.max(percentile90, mean * 3);
        const minBeatSpacing = 0.15; // 150ms minimum - prevents too many detections
        let lastBeatTime = -1;
        
        for (let i = 3; i < differences.length - 3; i++) {
            const curr = differences[i];
            const prev1 = differences[i - 1];
            const prev2 = differences[i - 2];
            const prev3 = differences[i - 3];
            const next1 = differences[i + 1];
            const next2 = differences[i + 2];
            
            // Very strict onset detection: must be a strong, clear peak
            const isStrongPeak = curr.diff > globalThreshold * (0.8 + sensitivity * 0.5) &&
                                curr.diff > prev1.diff * 1.8 &&
                                curr.diff > prev2.diff * 1.5 &&
                                curr.diff > prev3.diff * 1.3 &&
                                curr.diff > next1.diff &&
                                curr.diff > next2.diff;
            
            if (isStrongPeak && (lastBeatTime === -1 || curr.time - lastBeatTime >= minBeatSpacing)) {
                beats.push({ time: curr.time, type: 'beat' });
                lastBeatTime = curr.time;
            }
        }
        
        console.log(`🥁 Detected ${beats.length} transients/onsets`);
        return beats;
    }
    
    analyzeToneChanges(audioBuffer, sensitivity) {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const toneChanges = [];
        
        // Use larger windows for spectral analysis
        const windowSize = Math.floor(sampleRate * 0.2); // 200ms windows
        const hopSize = Math.floor(windowSize / 2);
        const spectralCentroids = [];
        
        // Calculate spectral centroid for each window (indicates brightness/tone)
        for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            let weightedSum = 0;
            let magnitudeSum = 0;
            
            for (let j = 0; j < windowSize; j++) {
                const magnitude = Math.abs(channelData[i + j]);
                weightedSum += j * magnitude;
                magnitudeSum += magnitude;
            }
            
            const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
            spectralCentroids.push({ time: i / sampleRate, centroid });
        }
        
        // Find significant changes in spectral centroid
        const avgCentroid = spectralCentroids.reduce((sum, s) => sum + s.centroid, 0) / spectralCentroids.length;
        const minToneSpacing = 1.0; // 1 second minimum between tone changes
        let lastToneTime = -1;
        
        for (let i = 5; i < spectralCentroids.length - 5; i++) {
            const curr = spectralCentroids[i].centroid;
            const prev = spectralCentroids[i - 5].centroid;
            const change = Math.abs(curr - prev) / avgCentroid;
            
            // Detect significant tone changes
            if (change > (0.5 * sensitivity) && 
                (lastToneTime === -1 || spectralCentroids[i].time - lastToneTime >= minToneSpacing)) {
                toneChanges.push({ time: spectralCentroids[i].time, type: 'tone' });
                lastToneTime = spectralCentroids[i].time;
            }
        }
        
        return toneChanges;
    }
    
    clearBeats() {
        this.detectedBeats = [];
        this.renderBeatDetectionUI();
        this.renderTimeline();
        this.showNotification('Beats cleared', 'info');
    }
    
    // Render Modal Methods
    showRenderModal() {
        if (!this.currentData) {
            this.showNotification('No video data loaded! Please load a JSON file first.', 'error');
            return;
        }
        
        // Auto-detect server URL based on current location
        const serverUrlInput = document.getElementById('renderServerUrl');
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // Running on deployed server - use current origin
            const currentOrigin = window.location.origin;
            serverUrlInput.value = currentOrigin;
            console.log('🌐 Auto-detected server URL:', currentOrigin);
        } else {
            // Running locally - keep localhost
            serverUrlInput.value = 'http://localhost:3000';
        }
        
        // Check if endpoint is loaded from Notion
        const endpointSelect = document.getElementById('renderEndpoint');
        const endpointSource = document.getElementById('endpointSource');
        
        if (this.currentEndpoint) {
            // Endpoint loaded from Notion - set it and disable selection
            endpointSelect.value = this.currentEndpoint;
            endpointSelect.disabled = true;
            endpointSource.style.display = 'block';
            console.log('🎬 Using endpoint from Notion:', this.currentEndpoint);
        } else {
            // No endpoint from Notion - allow manual selection
            endpointSelect.disabled = false;
            endpointSource.style.display = 'none';
            // Try to use endpoint from data as fallback
            if (this.currentData.endpoint) {
                endpointSelect.value = this.currentData.endpoint;
            }
        }
        
        // Reset modal state
        document.getElementById('renderStatus').style.display = 'none';
        document.getElementById('renderResult').style.display = 'none';
        document.getElementById('startRenderBtn').disabled = false;
        
        document.getElementById('renderModal').classList.add('active');
        console.log('🎬 Opened render modal');
    }
    
    hideRenderModal() {
        document.getElementById('renderModal').classList.remove('active');
        console.log('🎬 Closed render modal');
    }
    
    async startRender() {
        // Use endpoint from Notion if available, otherwise from dropdown
        const endpoint = this.currentEndpoint || document.getElementById('renderEndpoint').value;
        const serverUrl = document.getElementById('renderServerUrl').value.trim();
        
        if (!endpoint) {
            this.showNotification('Please select an endpoint!', 'error');
            return;
        }
        
        if (!serverUrl) {
            this.showNotification('Please enter a server URL!', 'error');
            return;
        }
        
        // Show status
        const statusDiv = document.getElementById('renderStatus');
        const statusMessage = document.getElementById('renderStatusMessage');
        const progressDiv = document.getElementById('renderProgress');
        const resultDiv = document.getElementById('renderResult');
        
        statusDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        progressDiv.style.display = 'block';
        statusMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rendering video...';
        
        document.getElementById('startRenderBtn').disabled = true;
        
        try {
            // Prepare the payload - remove endpoint field from data if it exists
            const cleanData = { ...this.currentData };
            delete cleanData.endpoint; // Remove endpoint from data to avoid conflicts
            
            const payload = {
                endpoint: endpoint,
                data: cleanData
            };
            
            console.log('🎬 Starting render:', { endpoint, serverUrl, payload });
            
            // Make the API call
            const response = await fetch(`${serverUrl}/master`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText}`);
            }
            
            const result = await response.json();
            
            console.log('✅ Render complete:', result);
            
            // Show success
            statusMessage.innerHTML = '<i class="fas fa-check-circle"></i> Render complete!';
            progressDiv.style.display = 'none';
            
            // Show result
            resultDiv.style.display = 'block';
            const videoUrl = result.videoUrl || result.video_url || result.url;
            
            if (videoUrl) {
                // Handle relative URLs
                const fullVideoUrl = videoUrl.startsWith('http') ? videoUrl : `${serverUrl}/${videoUrl}`;
                document.getElementById('renderResultSource').src = fullVideoUrl;
                document.getElementById('renderResultVideo').load();
                
                // Store for download/copy
                this.lastRenderedVideoUrl = fullVideoUrl;
                
                this.showNotification('✅ Video rendered successfully!', 'success');
            } else {
                throw new Error('No video URL in response');
            }
            
        } catch (error) {
            console.error('❌ Render failed:', error);
            statusMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Render failed: ${error.message}`;
            progressDiv.style.display = 'none';
            this.showNotification(`Render failed: ${error.message}`, 'error');
        } finally {
            document.getElementById('startRenderBtn').disabled = false;
        }
    }
    
    downloadRenderedVideo() {
        if (!this.lastRenderedVideoUrl) {
            this.showNotification('No video to download!', 'error');
            return;
        }
        
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = this.lastRenderedVideoUrl;
        a.download = `rendered-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        this.showNotification('Download started!', 'success');
        console.log('📥 Downloading video:', this.lastRenderedVideoUrl);
    }
    
    copyRenderUrl() {
        if (!this.lastRenderedVideoUrl) {
            this.showNotification('No video URL to copy!', 'error');
            return;
        }
        
        navigator.clipboard.writeText(this.lastRenderedVideoUrl).then(() => {
            this.showNotification('✅ URL copied to clipboard!', 'success');
            console.log('📋 Copied URL:', this.lastRenderedVideoUrl);
        }).catch(err => {
            this.showNotification('Failed to copy URL', 'error');
            console.error('Failed to copy:', err);
        });
    }
    
    // Clip timeline functions removed - feature disabled for now
}

const videoEditor = new VideoEditor();

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
