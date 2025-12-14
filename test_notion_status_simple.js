/**
 * Simple test for Notion Status Updater
 * First gets available records, then tests status update
 */

// Test configuration
const NOTION_READER_URL = 'https://notion-reader.debabratamaitra898.workers.dev';
const STATUS_UPDATER_URL = 'https://notion-status-updater.debabratamaitra898.workers.dev'; // ✅ Deployed!

/**
 * Get available records from Notion
 */
async function getAvailableRecords() {
  console.log('🔍 Fetching available records from Notion...');
  
  try {
    const response = await fetch(`${NOTION_READER_URL}?filter=ready`);
    const data = await response.json();
    
    console.log('✅ Found records:');
    console.log('Total Ready records:', data.total_filtered);
    console.log('Available Formula IDs:', data.filtered_ids?.slice(0, 5) || []);
    
    if (data.records && data.records.length > 0) {
      console.log('\n📋 Sample record:');
      const record = data.records[0];
      console.log('- Formula ID:', record.formula_id);
      console.log('- Username:', record.username);
      console.log('- Caption:', record.caption?.substring(0, 50) + '...');
      console.log('- Page ID:', record.page_id);
      
      return record.formula_id;
    } else {
      console.log('⚠️ No Ready records found. Let\'s check all records...');
      
      // Try getting all records
      const allResponse = await fetch(NOTION_READER_URL);
      const allData = await allResponse.json();
      
      if (allData.items && allData.items.length > 0) {
        console.log('📋 Available records (any status):');
        allData.items.slice(0, 3).forEach((item, index) => {
          console.log(`${index + 1}. ID: ${item.properties.ID || 'unknown'}, Status: ${item.properties.Status || 'unknown'}`);
        });
        
        // Return first available ID
        const firstId = allData.items[0].properties.ID;
        if (firstId) {
          console.log(`\n🎯 Using first available ID: ${firstId}`);
          return firstId;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching records:', error.message);
    return null;
  }
}

/**
 * Test status update (simulated - will fail until worker is deployed)
 */
async function testStatusUpdate(formulaId) {
  console.log(`\n🧪 Testing status update for Formula ID: ${formulaId}`);
  
  try {
    // This will fail until the worker is deployed, but shows the expected request
    const response = await fetch(STATUS_UPDATER_URL, {
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
      console.log('- Previous Status:', result.previous_status);
      console.log('- New Status:', result.new_status);
      console.log('- Username:', result.username);
      console.log('- Updated Time:', result.updated_time);
    } else {
      console.log('❌ Status update failed');
      console.log('- Error:', result.error);
      console.log('- Status Code:', response.status);
    }
    
    return result;
  } catch (error) {
    console.log('⚠️ Worker not deployed yet or network error:', error.message);
    console.log('📝 Expected request would be:');
    console.log(`POST ${STATUS_UPDATER_URL}`);
    console.log('Body:', JSON.stringify({ formula_id: formulaId }, null, 2));
    return null;
  }
}

/**
 * Test using the existing notion-reader worker to simulate status update
 */
async function testWithExistingWorker(formulaId) {
  console.log(`\n🔄 Testing status update using existing notion-reader worker...`);
  
  try {
    // Use the existing worker's PATCH functionality
    const response = await fetch(`${NOTION_READER_URL}?formula_id=${formulaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'Posted'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Status updated successfully using existing worker!');
      console.log('- Message:', result.message);
      console.log('- Formula ID:', result.formula_id);
    } else {
      console.log('❌ Status update failed');
      console.log('- Error:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error with existing worker:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🚀 Starting Notion Status Update Test\n');
  
  // Step 1: Get available records
  const formulaId = await getAvailableRecords();
  
  if (!formulaId) {
    console.log('❌ No records found to test with');
    return;
  }
  
  // Step 2: Test with new worker (will show expected behavior)
  await testStatusUpdate(formulaId);
  
  // Step 3: Test with existing worker as fallback
  await testWithExistingWorker(formulaId);
  
  console.log('\n✨ Test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Deploy the notion-status-updater worker to Cloudflare');
  console.log('2. Update STATUS_UPDATER_URL in this test file');
  console.log('3. Run the test again to verify the deployed worker');
}

// Run the test
runTest().catch(console.error);