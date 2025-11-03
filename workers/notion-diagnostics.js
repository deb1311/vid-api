/**
 * Notion API Diagnostics Tool
 * This script helps diagnose issues with Notion API access and data synchronization
 */

const NOTION_TOKEN = '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';
const DATABASE_ID = '29451a6d097f8008aa06f33a562cfa0b';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'diagnose';

    try {
      switch (action) {
        case 'diagnose':
          return await runDiagnostics();
        case 'database_info':
          return await getDatabaseInfo();
        case 'all_pages':
          return await getAllPages();
        case 'search_record':
          const searchId = url.searchParams.get('id');
          return await searchSpecificRecord(searchId);
        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action. Use: diagnose, database_info, all_pages, or search_record' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Diagnostic error', message: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

/**
 * Run comprehensive diagnostics
 */
async function runDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    database_id: DATABASE_ID,
    tests: {}
  };

  // Test 1: Database access
  try {
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
      },
    });
    
    diagnostics.tests.database_access = {
      status: dbResponse.ok ? 'PASS' : 'FAIL',
      status_code: dbResponse.status,
      accessible: dbResponse.ok
    };

    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      diagnostics.database_info = {
        title: dbData.title?.[0]?.plain_text || 'Untitled',
        properties: Object.keys(dbData.properties || {}),
        created_time: dbData.created_time,
        last_edited_time: dbData.last_edited_time
      };
    }
  } catch (error) {
    diagnostics.tests.database_access = {
      status: 'ERROR',
      error: error.message
    };
  }

  // Test 2: Query all records with different approaches
  const queryMethods = [
    { name: 'default', body: { page_size: 100 } },
    { name: 'no_filter', body: { page_size: 100, filter: {} } },
    { name: 'sort_by_created', body: { page_size: 100, sorts: [{ timestamp: 'created_time', direction: 'descending' }] } },
    { name: 'sort_by_edited', body: { page_size: 100, sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }] } }
  ];

  for (const method of queryMethods) {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method.body),
      });

      if (response.ok) {
        const data = await response.json();
        diagnostics.tests[`query_${method.name}`] = {
          status: 'PASS',
          total_results: data.results.length,
          has_more: data.has_more,
          next_cursor: data.next_cursor,
          formula_ids: data.results.map(page => {
            const idProp = page.properties.ID;
            return idProp?.formula?.string || 'unknown';
          })
        };
      } else {
        diagnostics.tests[`query_${method.name}`] = {
          status: 'FAIL',
          status_code: response.status,
          error: await response.text()
        };
      }
    } catch (error) {
      diagnostics.tests[`query_${method.name}`] = {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  // Test 3: Search for specific record
  try {
    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '251023005700',
        filter: {
          value: 'page',
          property: 'object'
        }
      }),
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      diagnostics.tests.search_specific_id = {
        status: 'PASS',
        found_results: searchData.results.length,
        results: searchData.results.map(page => ({
          id: page.id,
          title: page.properties?.Username?.title?.[0]?.plain_text || 'No title',
          url: page.url
        }))
      };
    } else {
      diagnostics.tests.search_specific_id = {
        status: 'FAIL',
        status_code: searchResponse.status,
        error: await searchResponse.text()
      };
    }
  } catch (error) {
    diagnostics.tests.search_specific_id = {
      status: 'ERROR',
      error: error.message
    };
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get detailed database information
 */
async function getDatabaseInfo() {
  const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}`, {
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Database info failed: ${response.status}`);
  }

  const data = await response.json();
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get all pages with pagination
 */
async function getAllPages() {
  let allPages = [];
  let hasMore = true;
  let nextCursor = null;

  while (hasMore) {
    const body = {
      page_size: 100,
      ...(nextCursor && { start_cursor: nextCursor })
    };

    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status}`);
    }

    const data = await response.json();
    allPages = allPages.concat(data.results);
    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }

  const result = {
    total_pages: allPages.length,
    formula_ids: allPages.map(page => {
      const idProp = page.properties.ID;
      return idProp?.formula?.string || 'unknown';
    }),
    pages: allPages.map(page => ({
      id: page.id,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      formula_id: page.properties.ID?.formula?.string || 'unknown',
      username: page.properties.Username?.title?.[0]?.plain_text || '',
      status: page.properties.Status?.status?.name || page.properties.Status?.select?.name || 'unknown'
    }))
  };

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Search for a specific record by ID
 */
async function searchSpecificRecord(searchId) {
  if (!searchId) {
    return new Response(
      JSON.stringify({ error: 'ID parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Try multiple search approaches
  const results = {
    search_id: searchId,
    methods: {}
  };

  // Method 1: Direct search
  try {
    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchId,
        filter: { value: 'page', property: 'object' }
      }),
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      results.methods.direct_search = {
        status: 'success',
        found: searchData.results.length,
        results: searchData.results
      };
    }
  } catch (error) {
    results.methods.direct_search = { status: 'error', error: error.message };
  }

  // Method 2: Filter by formula property
  try {
    const filterResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'ID',
          formula: {
            string: {
              equals: searchId
            }
          }
        }
      }),
    });

    if (filterResponse.ok) {
      const filterData = await filterResponse.json();
      results.methods.formula_filter = {
        status: 'success',
        found: filterData.results.length,
        results: filterData.results
      };
    }
  } catch (error) {
    results.methods.formula_filter = { status: 'error', error: error.message };
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}