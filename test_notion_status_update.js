/**
 * Test script for the Notion Status Updater Cloudflare Worker
 * This demonstrates how to update a record's status to "Posted"
 */

// Replace with your actual Cloudflare Worker URL
const WORKER_URL = 'https://your-worker-name.your-subdomain.workers.dev';

/**
 * Test updating status by formula ID
 */
async function testUpdateByFormulaId(formulaId) {
  console.log(`\n=== Testing Status Update for Formula ID: ${formulaId} ===`);
  
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formula_id: formulaId
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Status updated successfully!');
      console.log('Previous Status:', result.previous_status);
      console.log('New Status:', result.new_status);
      console.log('Username:', result.username);
      console.log('Caption:', result.caption?.substring(0, 50) + '...');
      console.log('Updated Time:', result.updated_time);
    } else {
      console.log('❌ Failed to update status');
      console.log('Error:', result.error);
      if (result.available_ids) {
        console.log('Available IDs:', result.available_ids.slice(0, 5));
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

/**
 * Test updating status by page ID
 */
async function testUpdateByPageId(pageId, status = 'Posted') {
  console.log(`\n=== Testing Status Update for Page ID: ${pageId} ===`);
  
  try {
    const response = await fetch(`${WORKER_URL}?id=${pageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: status
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Status updated successfully!');
      console.log('New Status:', result.new_status);
      console.log('Updated Time:', result.updated_time);
    } else {
      console.log('❌ Failed to update status');
      console.log('Error:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

/**
 * Run tests
 */
async function runTests() {
  console.log('🚀 Starting Notion Status Updater Tests');
  
  // Test with formula ID (replace with actual ID from your database)
  await testUpdateByFormulaId('123');
  
  // Test with page ID (replace with actual page ID from your database)
  // await testUpdateByPageId('your-page-id-here');
  
  console.log('\n✨ Tests completed');
}

// Run the tests
runTests().catch(console.error);

/**
 * Example usage in your application:
 * 
 * // After video processing is complete, update status to Posted
 * async function markAsPosted(videoId) {
 *   const response = await fetch('https://your-worker.workers.dev', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ formula_id: videoId })
 *   });
 *   
 *   const result = await response.json();
 *   if (result.success) {
 *     console.log(`Video ${videoId} marked as Posted`);
 *   }
 * }
 */