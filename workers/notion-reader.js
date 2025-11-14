/**
 * Cloudflare Worker to read and write data to Notion database and Supabase
 * This worker fetches metadata from Notion and JSON data from Supabase
 */

// Your Notion integration token (store this as an environment variable in production)
const NOTION_TOKEN = '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';

// Your hardcoded database ID
const DATABASE_ID = '29451a6d097f8008aa06f33a562cfa0b';

// Supabase configuration
const SUPABASE_URL = 'https://vllxucytucjyflsenjmz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbHh1Y3l0dWNqeWZsc2Vuam16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwMjgyNCwiZXhwIjoyMDc3Njc4ODI0fQ.4Ghk-tZX0bI99hxcysnkaARQ86b5koQ8XYYWAADL3bI';
const SUPABASE_TABLE = 'vid-data';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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

      // GET request - Read data from database
      if (method === 'GET') {
        const filter = url.searchParams.get('filter');
        const jsonId = url.searchParams.get('json_id');
        
        if (filter) {
          return await getRecordsByStatus(filter);
        }
        if (jsonId) {
          return await getJsonContentById(jsonId);
        }
        return await handleGetRequest();
      }
      
      // POST request - Add new record to database
      if (method === 'POST') {
        const requestBody = await request.json();
        return await handlePostRequest(requestBody);
      }
      
      // PATCH request - Update existing record
      if (method === 'PATCH') {
        const requestBody = await request.json();
        const pageId = url.searchParams.get('id');
        const formulaId = url.searchParams.get('formula_id');
        
        if (formulaId) {
          return await handlePatchByFormulaId(formulaId, requestBody);
        } else {
          return await handlePatchRequest(pageId, requestBody);
        }
      }

      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use GET to read, POST to create, or PATCH to update.' }),
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
 * Get records by status and return their ID values
 */
async function getRecordsByStatus(statusFilter) {
  // Capitalize first letter for proper status matching
  const statusName = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase();
  
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
        filter: {
          property: 'Status',
          status: {
            equals: statusName
          }
        },
        page_size: 100
      }),
    }
  );

  if (!notionResponse.ok) {
    const errorText = await notionResponse.text();
    return new Response(
      JSON.stringify({ 
        error: `Failed to fetch ${statusName} records from Notion API`,
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
  
  // Extract ID values from filtered records
  const filteredRecords = data.results.map(page => {
    const idProperty = page.properties.ID;
    // Handle both number and formula types
    let recordId = 'unknown';
    if (idProperty?.type === 'number') {
      recordId = idProperty.number?.toString() || 'unknown';
    } else if (idProperty?.type === 'formula') {
      recordId = idProperty.formula?.string || 'unknown';
    }
    
    return {
      page_id: page.id,
      formula_id: recordId,
      username: page.properties.Username?.title?.[0]?.plain_text || '',
      caption: page.properties.Caption?.rich_text?.[0]?.plain_text || '',
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      url: page.url
    };
  });

  const result = {
    filter: `Status = ${statusName}`,
    total_filtered: filteredRecords.length,
    filtered_ids: filteredRecords.map(record => record.formula_id),
    records: filteredRecords
  };

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get JSON content from a record by its formula ID
 * Fetches metadata from Notion and JSON data from Supabase
 */
async function getJsonContentById(formulaId) {
  // First, fetch metadata from Notion
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
        page_size: 100
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
  
  // Find the record with matching ID (supports both number and formula types)
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
        })
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Now fetch JSON data from Supabase
  const supabaseResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${formulaId}&select=JSON`,
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!supabaseResponse.ok) {
    const errorText = await supabaseResponse.text();
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch JSON from Supabase',
        details: errorText,
        status: supabaseResponse.status
      }),
      {
        status: supabaseResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const supabaseData = await supabaseResponse.json();
  
  let parsedJson = null;
  let jsonContent = '';

  if (supabaseData && supabaseData.length > 0 && supabaseData[0].JSON) {
    jsonContent = supabaseData[0].JSON;
    
    // Try to parse the JSON content if it's a string
    try {
      if (typeof jsonContent === 'string') {
        parsedJson = JSON.parse(jsonContent);
      } else {
        parsedJson = jsonContent;
      }
    } catch (parseError) {
      // If parsing fails, return as is
      parsedJson = jsonContent;
    }
  }

  // Extract endpoint value from Endpoint column
  let endpointValue = 'master'; // Default endpoint
  const endpointProperty = targetRecord.properties.Endpoint;
  if (endpointProperty) {
    if (endpointProperty.select && endpointProperty.select.name) {
      endpointValue = endpointProperty.select.name;
    } else if (endpointProperty.rich_text && endpointProperty.rich_text.length > 0) {
      endpointValue = endpointProperty.rich_text.map(t => t.plain_text).join('');
    } else if (endpointProperty.title && endpointProperty.title.length > 0) {
      endpointValue = endpointProperty.title.map(t => t.plain_text).join('');
    }
  }

  const result = {
    formula_id: formulaId,
    page_id: targetRecord.id,
    username: targetRecord.properties.Username?.title?.[0]?.plain_text || '',
    caption: targetRecord.properties.Caption?.rich_text?.[0]?.plain_text || '',
    status: targetRecord.properties.Status?.status?.name || 'unknown',
    endpoint: endpointValue,
    json_raw: typeof jsonContent === 'string' ? jsonContent : JSON.stringify(jsonContent),
    json_parsed: parsedJson,
    created_time: targetRecord.created_time,
    last_edited_time: targetRecord.last_edited_time,
    url: targetRecord.url
  };

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle GET request - Read data from Notion database
 */
async function handleGetRequest() {
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
        page_size: 100
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
  
  const transformedData = {
    total: data.results.length,
    has_more: data.has_more,
    next_cursor: data.next_cursor,
    items: data.results.map(page => ({
      id: page.id,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      properties: transformProperties(page.properties),
      url: page.url
    }))
  };

  return new Response(JSON.stringify(transformedData, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle POST request - Add new record to Notion database
 */
async function handlePostRequest(requestBody) {
  // Validate required fields
  if (!requestBody) {
    return new Response(
      JSON.stringify({ error: 'Request body is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Build properties object for Notion API
  // Note: JSON is now stored in Supabase, not Notion
  const properties = {};
  
  // Handle Caption field
  if (requestBody.caption) {
    properties.Caption = {
      rich_text: [
        {
          text: {
            content: requestBody.caption
          }
        }
      ]
    };
  }

  // Handle Status field (status type)
  if (requestBody.status) {
    properties.Status = {
      status: {
        name: requestBody.status
      }
    };
  }

  // Handle Output URL field (url type)
  if (requestBody.output_url) {
    properties["Output URL"] = {
      url: requestBody.output_url
    };
  }

  // Handle Username field (title type)
  if (requestBody.username) {
    properties.Username = {
      title: [
        {
          text: {
            content: requestBody.username
          }
        }
      ]
    };
  }

  // Note: JSON field is stored in Supabase, not Notion
  // Note: Editor is now a formula field and cannot be directly updated

  // Create the page in Notion
  const notionResponse = await fetch(
    'https://api.notion.com/v1/pages',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: {
          database_id: DATABASE_ID
        },
        properties: properties
      }),
    }
  );

  if (!notionResponse.ok) {
    const errorText = await notionResponse.text();
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create record in Notion',
        details: errorText,
        status: notionResponse.status
      }),
      {
        status: notionResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const createdPage = await notionResponse.json();
  
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Record created successfully',
      id: createdPage.id,
      url: createdPage.url,
      properties: transformProperties(createdPage.properties)
    }, null, 2),
    {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle PATCH request - Update existing record in Notion database
 */
async function handlePatchRequest(pageId, requestBody) {
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

  if (!requestBody) {
    return new Response(
      JSON.stringify({ error: 'Request body is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Build properties object for Notion API (same as POST but for updates)
  // Note: JSON is now stored in Supabase, not Notion
  const properties = {};
  
  // Handle Caption field
  if (requestBody.caption !== undefined) {
    properties.Caption = {
      rich_text: [
        {
          text: {
            content: requestBody.caption
          }
        }
      ]
    };
  }

  // Handle Status field (status type)
  if (requestBody.status !== undefined) {
    properties.Status = {
      status: {
        name: requestBody.status
      }
    };
  }

  // Handle Output URL field (url type)
  if (requestBody.output_url !== undefined) {
    properties["Output URL"] = {
      url: requestBody.output_url
    };
  }

  // Handle Username field (title type)
  if (requestBody.username !== undefined) {
    properties.Username = {
      title: [
        {
          text: {
            content: requestBody.username
          }
        }
      ]
    };
  }

  // Note: JSON field is stored in Supabase, not Notion
  // Note: Editor is now a formula field and cannot be directly updated

  // Update the page in Notion
  const notionResponse = await fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: properties
      }),
    }
  );

  if (!notionResponse.ok) {
    const errorText = await notionResponse.text();
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update record in Notion',
        details: errorText,
        status: notionResponse.status
      }),
      {
        status: notionResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const updatedPage = await notionResponse.json();
  
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Record updated successfully',
      id: updatedPage.id,
      url: updatedPage.url,
      properties: transformProperties(updatedPage.properties)
    }, null, 2),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle PATCH request by Formula ID - Update JSON in Supabase and optionally update Notion metadata
 */
async function handlePatchByFormulaId(formulaId, requestBody) {
  // If JSON data is being updated, save it to Supabase
  if (requestBody.json !== undefined) {
    const jsonString = typeof requestBody.json === 'string' 
      ? requestBody.json 
      : JSON.stringify(requestBody.json);
    
    // Update JSON in Supabase
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${formulaId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          JSON: jsonString
        })
      }
    );

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update JSON in Supabase',
          details: errorText,
          status: supabaseResponse.status
        }),
        {
          status: supabaseResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // If other properties need to be updated in Notion (like status), handle that
  if (requestBody.status !== undefined || requestBody.caption !== undefined || 
      requestBody.username !== undefined || requestBody.output_url !== undefined) {
    
    // First, get the Notion page ID for this formula ID
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
          })
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update Notion metadata (excluding JSON)
    const notionUpdateBody = { ...requestBody };
    delete notionUpdateBody.json; // Don't try to update JSON in Notion
    
    return await handlePatchRequest(targetRecord.id, notionUpdateBody);
  }

  // If only JSON was updated, return success
  return new Response(
    JSON.stringify({
      success: true,
      message: 'JSON data updated successfully in Supabase',
      formula_id: formulaId
    }, null, 2),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Transform Notion properties to a more readable format
 */
function transformProperties(properties) {
  const transformed = {};
  
  for (const [key, value] of Object.entries(properties)) {
    switch (value.type) {
      case 'title':
        transformed[key] = value.title.map(t => t.plain_text).join('');
        break;
      case 'rich_text':
        transformed[key] = value.rich_text.map(t => t.plain_text).join('');
        break;
      case 'number':
        transformed[key] = value.number;
        break;
      case 'select':
        transformed[key] = value.select?.name || null;
        break;
      case 'multi_select':
        transformed[key] = value.multi_select.map(s => s.name);
        break;
      case 'date':
        transformed[key] = value.date?.start || null;
        break;
      case 'checkbox':
        transformed[key] = value.checkbox;
        break;
      case 'url':
        transformed[key] = value.url;
        break;
      case 'email':
        transformed[key] = value.email;
        break;
      case 'phone_number':
        transformed[key] = value.phone_number;
        break;
      case 'status':
        transformed[key] = value.status?.name || null;
        break;
      case 'formula':
        if (value.formula?.type === 'string') {
          transformed[key] = value.formula.string;
        } else if (value.formula?.type === 'number') {
          transformed[key] = value.formula.number;
        } else {
          transformed[key] = value.formula;
        }
        break;
      default:
        transformed[key] = value;
    }
  }
  
  return transformed;
}