// Quick fixes for common video editor issues
// Run this in the browser console if the editor isn't working

console.log('🔧 Running Video Editor Quick Fixes...');

// Fix 1: Ensure all required elements exist
function checkRequiredElements() {
    const requiredIds = [
        'playPauseBtn', 'fullscreenBtn', 'audioTestBtn',
        'previewCanvas', 'previewTimeDisplay',
        'globalPlayhead', 'videoTimeline', 'textTimeline', 'audioTimeline',
        'propertiesContent', 'jsonModal', 'webhookModal'
    ];
    
    const missing = [];
    requiredIds.forEach(id => {
        if (!document.getElementById(id)) {
            missing.push(id);
        }
    });
    
    if (missing.length > 0) {
        console.error('❌ Missing required elements:', missing);
        return false;
    }
    
    console.log('✅ All required elements found');
    return true;
}

// Fix 2: Re-enable play button if it's disabled
function enablePlayButton() {
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) {
        playBtn.disabled = false;
        playBtn.style.opacity = '1';
        playBtn.style.cursor = 'pointer';
        console.log('✅ Play button enabled');
    }
}

// Fix 3: Reset canvas if it's corrupted
function resetCanvas() {
    const canvas = document.getElementById('previewCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw placeholder
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#666';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Video Preview', canvas.width/2, canvas.height/2);
        
        console.log('✅ Canvas reset');
    }
}

// Fix 4: Clear any stuck modals
function clearModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    console.log('✅ Modals cleared');
}

// Fix 5: Reset video editor state
function resetEditorState() {
    if (window.videoEditor) {
        window.videoEditor.isPlaying = false;
        window.videoEditor.currentTime = 0;
        
        // Update play button
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        console.log('✅ Editor state reset');
    }
}

// Fix 6: Check for JavaScript errors
function checkForErrors() {
    // Override console.error to catch errors
    const originalError = console.error;
    let errorCount = 0;
    
    console.error = function(...args) {
        errorCount++;
        originalError.apply(console, args);
    };
    
    setTimeout(() => {
        console.error = originalError;
        if (errorCount === 0) {
            console.log('✅ No JavaScript errors detected');
        } else {
            console.warn(`⚠️ ${errorCount} JavaScript errors detected`);
        }
    }, 2000);
}

// Run all fixes
function runAllFixes() {
    console.log('🔧 Running comprehensive fixes...');
    
    checkRequiredElements();
    enablePlayButton();
    resetCanvas();
    clearModals();
    resetEditorState();
    checkForErrors();
    
    console.log('✅ All fixes applied!');
    console.log('💡 If issues persist, check the browser console for specific error messages');
}

// Auto-run fixes
runAllFixes();

// Make functions available globally for manual use
window.editorFixes = {
    checkRequiredElements,
    enablePlayButton,
    resetCanvas,
    clearModals,
    resetEditorState,
    checkForErrors,
    runAllFixes
};

console.log('🔧 Quick fixes loaded! Use window.editorFixes.runAllFixes() to run again');