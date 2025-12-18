/**
 * Cloudflare Worker - Media Proxy
 * Proxies external video/image URLs to bypass CORS restrictions
 * Handles redirects (like Pexels download links) and adds proper CORS headers
 * 
 * Usage: https://media-proxy.YOUR_SUBDOMAIN.workers.dev/?url=ENCODED_URL
 */

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

  try {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return jsonResponse({ 
        error: 'Missing url parameter',
        usage: 'Add ?url=ENCODED_URL to proxy external media',
        example: '?url=' + encodeURIComponent('https://www.pexels.com/download/video/1093661/')
      }, 400);
    }

    // Decode and validate URL
    let decodedUrl;
    try {
      decodedUrl = decodeURIComponent(targetUrl);
      new URL(decodedUrl); // Validate it's a proper URL
    } catch (e) {
      return jsonResponse({ error: 'Invalid URL provided' }, 400);
    }

    console.log('Proxying:', decodedUrl);

    // Fetch the external resource, following redirects
    const fetchOptions = {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/*,image/*,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': new URL(decodedUrl).origin + '/',
      },
      cf: {
        // Cloudflare-specific options for better compatibility
        cacheTtl: 86400,
        cacheEverything: true,
      }
    };

    // Forward Range header for video streaming
    const range = request.headers.get('Range');
    if (range) {
      fetchOptions.headers['Range'] = range;
    }

    let response;
    try {
      response = await fetch(decodedUrl, fetchOptions);
    } catch (fetchError) {
      // If fetch fails, try without custom headers (some sites block custom User-Agent)
      console.log('First fetch failed, retrying with minimal headers');
      response = await fetch(decodedUrl, {
        method: fetchOptions.method,
        redirect: 'follow'
      });
    }

    if (!response.ok && response.status !== 206) {
      return jsonResponse({
        error: 'Failed to fetch external resource',
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl
      }, response.status);
    }

    // Build response headers with CORS
    const headers = new Headers();
    
    // Copy important headers from the original response
    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'etag',
      'last-modified'
    ];

    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    // Ensure content-type is set for media
    if (!headers.has('content-type')) {
      const contentType = guessContentType(decodedUrl);
      if (contentType) {
        headers.set('content-type', contentType);
      }
    }

    // Add CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

    // Cache successful responses
    if (!headers.has('cache-control')) {
      headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours
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
    console.error('Proxy error:', error);
    return jsonResponse({ 
      error: 'Proxy error',
      message: error.message 
    }, 500);
  }
}

function guessContentType(url) {
  const lowerUrl = url.toLowerCase();
  
  // Video types
  if (lowerUrl.includes('.mp4') || lowerUrl.includes('video')) return 'video/mp4';
  if (lowerUrl.includes('.webm')) return 'video/webm';
  if (lowerUrl.includes('.mov')) return 'video/quicktime';
  if (lowerUrl.includes('.avi')) return 'video/x-msvideo';
  if (lowerUrl.includes('.mkv')) return 'video/x-matroska';
  
  // Image types
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'image/jpeg';
  if (lowerUrl.includes('.png')) return 'image/png';
  if (lowerUrl.includes('.gif')) return 'image/gif';
  if (lowerUrl.includes('.webp')) return 'image/webp';
  if (lowerUrl.includes('.svg')) return 'image/svg+xml';
  
  // Default for Pexels-like URLs
  if (lowerUrl.includes('pexels') || lowerUrl.includes('download/video')) {
    return 'video/mp4';
  }
  
  return null;
}

function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
