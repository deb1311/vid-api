/**
 * Cloudflare Worker to update Notion Editor database status to "Posted"
 * Simple function to mark records as posted after video processing
 */

// Your Notion integration token (store this as an environment variable in production)
const NOTION_TOKEN = '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';

// Your hardcoded database ID
const DATABASE_ID = '29451a6d097f8008aa06f33a562cfa0b';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      const method = request.method;

      // POST request - Update status (supports both page_id and number id)
      if (method === 'POST') {
        const requestBody = await request.json();
        
        // If page_id is provided, use direct page update (faster)
        if (requestBody.page_id) {
          return await updateStatusByPageId(requestBody.page_id, { status: 'Posted' });
        }
        
        // Otherwise, search by number ID (slower but backward compatible)
        return await updateStatusToPosted(requestBody);
      }
      
      // PATCH request - Update status by page ID (query parameter)
      if (method === 'PATCH') {
        const pageId = url.searchParams.get('id');
        const requestBody = await request.json();
        return await updateStatusByPageId(pageId, requestBody);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed. Use POST with page_id or number ID.',
          usage: {
            'POST (recommended)': '{"page_id": "2c151a6d-097f-813d-9ddd-cd26d803cfdd"}',
            'POST (by number)': '{"id": 123}',
            'PATCH': 'PATCH ?id=page_id with body: {"status": "Posted"}'
          },
          note: 'Using page_id is faster as it skips the search step'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

/**
 * Update status to "Posted" by ID number
 * Finds the record by its ID field value (number type) and updates the status
 */
async function updateStatusToPosted(requestBody) {
  // Validate required fields - accept both 'id' and 'formula_id' for backward compatibility
  const recordId = requestBody.id || requestBody.formula_id;
  
  if (!requestBody || !recordId) {
    return new Response(
      JSON.stringify({ 
        error: 'id is required in request body (ID field value from Notion)',
        example: { id: 123 },
        note: 'Use the number from the ID column in your Notion database'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const formulaId = recordId.toString();

  // First, find the record by formula ID
  const notionResponse = await fetch(
    `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    }
  );

  if (!notionResponse.ok) {
    const errorText = await notionResponse.text();
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch from Notion API',
        details: errorText,
        status: notionResponse.status
      }),
      {
        status: notionResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const data = await notionResponse.json();
  
  // Find the record with matching ID
  const targetRecord = data.results.find(page => {
    const idProperty = page.properties.ID;
    if (idProperty) {
      if (idProperty.type === 'number') {
        return idProperty.number?.toString() === formulaId;
      } else if (idProperty.type === 'formula' && idProperty.formula) {
        return idProperty.formula.string === formulaId;
      }
    }
    return false;
  });

  if (!targetRecord) {
    return new Response(
      JSON.stringify({ 
        error: `Record with ID ${formulaId} not found in Notion`,
        available_ids: data.results.map(page => {
          const idProp = page.properties.ID;
          if (idProp?.type === 'number') {
            return idProp.number?.toString() || 'unknown';
          } else if (idProp?.type === 'formula') {
            return idProp.formula?.string || 'unknown';
          }
          return 'unknown';
        }).slice(0, 10) // Show first 10 for debugging
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Get current status for logging
  const currentStatus = targetRecord.properties.Status?.status?.name || 'unknown';

  // Update the status to "Posted"
  const updateResponse = await fetch(
    `https://api.notion.com/v1/pages/${targetRecord.id}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          Status: {
            status: {
              name: "Posted"
            }
          }
        }
      }),
    }
  );

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update status in Notion',
        details: errorText,
        status: updateResponse.status
      }),
      {
        status: updateResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const updatedPage = await updateResponse.json();
  
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Status updated to Posted successfully',
      id: formulaId,
      page_id: targetRecord.id,
      previous_status: currentStatus,
      new_status: "Posted",
      username: targetRecord.properties.Username?.title?.[0]?.plain_text || '',
      caption: targetRecord.properties.Caption?.rich_text?.[0]?.plain_text || '',
      updated_time: updatedPage.last_edited_time,
      url: updatedPage.url
    }, null, 2),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Update status by page ID directly
 * Alternative method if you have the Notion page ID
 */
async function updateStatusByPageId(pageId, requestBody) {
  // Validate required fields
  if (!pageId) {
    return new Response(
      JSON.stringify({ error: 'Page ID is required. Use ?id=PAGE_ID in the URL.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Default to "Posted" if no status specified
  const newStatus = requestBody?.status || "Posted";

  // Update the status
  const updateResponse = await fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          Status: {
            status: {
              name: newStatus
            }
          }
        }
      }),
    }
  );

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update status in Notion',
        details: errorText,
        status: updateResponse.status
      }),
      {
        status: updateResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const updatedPage = await updateResponse.json();
  
  return new Response(
    JSON.stringify({
      success: true,
      message: `Status updated to ${newStatus} successfully`,
      page_id: pageId,
      new_status: newStatus,
      updated_time: updatedPage.last_edited_time,
      url: updatedPage.url
    }, null, 2),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}