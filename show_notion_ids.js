/**
 * Show the mapping between Notion ID field values and records
 */

async function showIdMapping() {
  try {
    const response = await fetch('https://notion-reader.debabratamaitra898.workers.dev');
    const data = await response.json();
    
    console.log('📋 Notion Database Records:');
    console.log('');
    
    data.items.slice(0, 5).forEach((item, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  ID Field Value: ${item.properties.ID}`);
      console.log(`  Username: ${item.properties.Username || 'N/A'}`);
      console.log(`  Status: ${item.properties.Status || 'N/A'}`);
      console.log(`  Notion Page ID: ${item.id}`);
      console.log('');
    });
    
    console.log('🎯 To update status, use the ID Field Value as formula_id');
    console.log('');
    console.log('Example curl commands:');
    
    data.items.slice(0, 3).forEach((item) => {
      console.log(`curl -X POST "https://notion-status-updater.debabratamaitra898.workers.dev" \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"formula_id": "${item.properties.ID}"}'`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

showIdMapping();