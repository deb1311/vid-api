// Quick diagnostic and fix for playback issues
// Add this to check playback status

console.log('🔧 Playback diagnostic loaded');

// Check if videoEditor exists
setTimeout(() => {
    if (typeof videoEditor !== 'undefined') {
        console.log('✅ VideoEditor instance found');
        console.log('Current state:', {
            isPlaying: videoEditor.isPlaying,
            currentTime: videoEditor.currentTime,
            totalDuration: videoEditor.totalDuration,
            hasData: !!videoEditor.currentData,
            hasCanvas: !!videoEditor.canvas,
            hasCtx: !!videoEditor.ctx
        });
        
        // Add a manual test function
        window.testPlayback = function() {
            console.log('🧪 Testing playback manually...');
            videoEditor.isPlaying = true;
            console.log('Set isPlaying to true');
            
            // Force a few frames
            let testFrames = 0;
            const testInterval = setInterval(() => {
                videoEditor.currentTime += 0.033; // ~30fps
                videoEditor.updatePlayheadPosition();
                videoEditor.updateTimeDisplay();
                console.log(`Frame ${testFrames}: time = ${videoEditor.currentTime.toFixed(3)}s`);
                
                testFrames++;
                if (testFrames >= 10) {
                    clearInterval(testInterval);
                    videoEditor.isPlaying = false;
                    console.log('✅ Test complete - if you saw the playhead move, the issue is in togglePlayPause()');
                }
            }, 33);
        };
        
        console.log('💡 Run testPlayback() in console to test if playhead can move');
    } else {
        console.log('❌ VideoEditor instance not found');
    }
}, 1000);
