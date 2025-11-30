/**
 * Cloudflare Worker to fetch images/videos from Backblaze B2
 * Handles B2 authentication and CORS
 */

const B2_KEY_ID = 'c442f8065795';
const B2_APPLICATION_KEY = '005d9056d7785528fbc17999040ef4631abfa67e7b';

// Cache B2 authorization token
let authCache = null;

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  // Support HEAD requests (used by FFmpeg and other tools)
  const method = request.method === 'HEAD' ? 'GET' : request.method;

  try {
    const url = new URL(request.url);

    // Extract bucket and file path: /bucket/path/to/file.mp4
    const pathParts = url.pathname.split('/').filter(p => p);

    if (pathParts.length === 0) {
      return jsonResponse({ error: 'Invalid path. Use: /bucket/file or /bucket?list' }, 400);
    }

    const bucketName = pathParts[0];

    // Check if this is a list request
    if (url.searchParams.has('list') || pathParts.length === 1) {
      return await listBucketFiles(bucketName, url.searchParams.get('prefix') || '');
    }

    const fileName = decodeURIComponent(pathParts.slice(1).join('/'));

    // Get B2 authorization
    const auth = await getB2Authorization();

    // Use b2_download_file_by_name API endpoint with authorization
    // The B2 API expects the file name to be URL-encoded in the path
    const encodedFileName = fileName.split('/').map(part => encodeURIComponent(part)).join('/');
    // Use the downloadUrl from auth response for file downloads
    // Format: https://f000.backblazeb2.com/file/bucket-name/file-name
    const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${encodedFileName}`;

    // Forward Range header if present (critical for video streaming)
    const fetchHeaders = {
      'Authorization': auth.authorizationToken
    };

    const range = request.headers.get('Range');
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const response = await fetch(downloadUrl, {
      method: method,
      headers: fetchHeaders
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse({
        error: 'Failed to fetch from B2',
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        url: downloadUrl
      }, response.status);
    }

    // Return the media file with CORS headers
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Range');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
    // Don't override cache control if B2 already set it
    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'public, max-age=31536000');
    }

    // For HEAD requests, return without body
    if (request.method === 'HEAD') {
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

  } catch (error) {
    return jsonResponse({ error: error.message, stack: error.stack }, 500);
  }
}

async function getB2Authorization() {
  // Return cached auth if still valid
  if (authCache && authCache.expiresAt > Date.now()) {
    return authCache;
  }

  // Authorize with B2
  const authString = btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`);

  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${authString}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`B2 authorization failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // Cache for 23 hours (tokens valid for 24 hours)
  authCache = {
    authorizationToken: data.authorizationToken,
    downloadUrl: data.downloadUrl,
    apiUrl: data.apiUrl,
    accountId: data.accountId,
    expiresAt: Date.now() + (23 * 60 * 60 * 1000)
  };

  return authCache;
}

async function listBucketFiles(bucketName, prefix = '') {
  try {
    const auth = await getB2Authorization();

    // First, get bucket ID
    const bucketsResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId: auth.accountId,
        bucketName: bucketName
      })
    });

    if (!bucketsResponse.ok) {
      const errorText = await bucketsResponse.text();
      return jsonResponse({
        error: 'Failed to get bucket info',
        status: bucketsResponse.status,
        details: errorText
      }, bucketsResponse.status);
    }

    const bucketsData = await bucketsResponse.json();

    if (!bucketsData.buckets || bucketsData.buckets.length === 0) {
      return jsonResponse({ error: `Bucket '${bucketName}' not found` }, 404);
    }

    const bucketId = bucketsData.buckets[0].bucketId;

    // List files in bucket
    const listResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucketId,
        maxFileCount: 1000,
        prefix: prefix
      })
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      return jsonResponse({
        error: 'Failed to list files',
        status: listResponse.status,
        details: errorText
      }, listResponse.status);
    }

    const listData = await listResponse.json();

    // Format file list
    const files = listData.files.map(file => ({
      name: file.fileName,
      size: file.contentLength,
      sizeFormatted: formatBytes(file.contentLength),
      contentType: file.contentType,
      uploadTimestamp: file.uploadTimestamp,
      url: `${auth.downloadUrl}/file/${bucketName}/${file.fileName}`
    }));

    return jsonResponse({
      bucket: bucketName,
      fileCount: files.length,
      files: files
    });

  } catch (error) {
    return jsonResponse({
      error: 'List operation failed',
      message: error.message,
      stack: error.stack
    }, 500);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}



function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
