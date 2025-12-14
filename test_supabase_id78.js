async function fetchSupabaseRecord(id) {
    console.log(`🔍 Fetching Supabase record ID: ${id}`);
    
    try {
        const workerUrl = 'https://notion-reader.debabratamaitra898.workers.dev';
        const response = await fetch(`${workerUrl}/?json_id=${id}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch record (${response.status}): ${errorText}`);
        }
        
        const recordData = await response.json();
        
        // Check for error in response
        if (recordData.error) {
            throw new Error(recordData.error);
        }
        
        console.log('📊 Record Data Summary:');
        console.log('======================');
        console.log(`ID: ${id}`);
        console.log(`Username: ${recordData.username || 'N/A'}`);
        console.log(`Status: ${recordData.status || 'N/A'}`);
        console.log(`Endpoint: ${recordData.endpoint || 'N/A'}`);
        console.log(`Has JSON: ${recordData.json_parsed ? 'Yes' : 'No'}`);
        
        if (recordData.json_parsed) {
            const jsonData = recordData.json_parsed;
            console.log('\n📝 JSON Data Structure:');
            console.log('=======================');
            console.log(`Quote: "${jsonData.quote || 'N/A'}"`);
            console.log(`Author: "${jsonData.author || 'N/A'}"`);
            console.log(`Watermark: "${jsonData.watermark || 'N/A'}"`);
            console.log(`Audio URL: ${jsonData.audioUrl || 'N/A'}`);
            console.log(`Clips: ${jsonData.clips?.length || 0}`);
            console.log(`Captions: ${jsonData.captions?.length || 0}`);
            
            if (jsonData.clips && jsonData.clips.length > 0) {
                console.log('\n🎬 Clips Details:');
                jsonData.clips.forEach((clip, index) => {
                    console.log(`  Clip ${index + 1}:`);
                    console.log(`    Type: ${clip.imageurl ? 'Image' : 'Video'}`);
                    console.log(`    URL: ${clip.imageurl || clip.videourl || clip.videoUrl || 'N/A'}`);
                    console.log(`    Duration: ${clip.duration || 'N/A'}s`);
                    console.log(`    Start: ${clip.start || 0}s`);
                    if (clip.volume !== undefined) {
                        console.log(`    Volume: ${clip.volume}%`);
                    }
                });
            }
            
            if (jsonData.captions && jsonData.captions.length > 0) {
                console.log('\n📝 Captions Details:');
                jsonData.captions.forEach((caption, index) => {
                    console.log(`  Caption ${index + 1}:`);
                    console.log(`    Text: "${caption.text}"`);
                    console.log(`    Start: ${caption.start || 0}s`);
                    console.log(`    Duration: ${caption.duration || 'N/A'}s`);
                });
            }
            
            // Show full JSON (formatted)
            console.log('\n📄 Full JSON Data:');
            console.log('==================');
            console.log(JSON.stringify(jsonData, null, 2));
        } else {
            console.log('\n⚠️  No JSON data found in this record');
        }
        
        return recordData;
        
    } catch (error) {
        console.error('❌ Error fetching record:', error.message);
        throw error;
    }
}

// Fetch ID 78
fetchSupabaseRecord(78).catch(console.error);