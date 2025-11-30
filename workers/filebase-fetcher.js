/**
 * Cloudflare Worker to fetch images/videos from Filebase S3
 * Handles S3 authentication and CORS
 */

const S3_ENDPOINT = 'https://s3.filebase.com';
const S3_ACCESS_KEY = 'E234F4F851C48943BE64';
const S3_SECRET_KEY = 'PNrYfAS81syqS4gO0GBXq2gje3OJYG2khzHGMTq1';
const IPFS_GATEWAY = 'outstanding-white-mite.myfilebase.com';

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

    // Build S3 URL with proper encoding
    const encodedFileName = fileName.split('/').map(part => encodeURIComponent(part)).join('/');
    const s3Url = `${S3_ENDPOINT}/${bucketName}/${encodedFileName}`;

    // Create AWS Signature V4
    const date = new Date();
    const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');

    // Forward Range header if present (critical for video streaming)
    const fetchHeaders = {
      'Host': 's3.filebase.com',
      'x-amz-date': amzDate,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    };

    const range = request.headers.get('Range');
    if (range) {
      fetchHeaders['Range'] = range;
    }

    // Create canonical request
    const canonicalHeaders = Object.keys(fetchHeaders)
      .sort()
      .map(key => `${key.toLowerCase()}:${fetchHeaders[key]}`)
      .join('\n');

    const signedHeaders = Object.keys(fetchHeaders)
      .map(key => key.toLowerCase())
      .sort()
      .join(';');

    // Canonical URI must be URI-encoded
    const canonicalUri = `/${bucketName}/${encodedFileName}`;

    const canonicalRequest = [
      method,
      canonicalUri,
      '', // query string
      canonicalHeaders + '\n',
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/us-east-1/s3/aws4_request`;
    const canonicalRequestHash = await sha256(canonicalRequest);
    
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash
    ].join('\n');

    // Calculate signature
    const signature = await getSignature(S3_SECRET_KEY, dateStamp, 'us-east-1', 's3', stringToSign);

    // Add authorization header
    fetchHeaders['Authorization'] = `${algorithm} Credential=${S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(s3Url, {
      method: method,
      headers: fetchHeaders
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse({
        error: 'Failed to fetch from Filebase',
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        url: s3Url
      }, response.status);
    }

    // Return the media file with CORS headers
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Range');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
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

async function listBucketFiles(bucketName, prefix = '') {
  try {
    const date = new Date();
    const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const queryParams = new URLSearchParams({
      'list-type': '2',
      'max-keys': '1000'
    });

    if (prefix) {
      queryParams.set('prefix', prefix);
    }

    const queryString = queryParams.toString();
    const s3Url = `${S3_ENDPOINT}/${bucketName}?${queryString}`;

    const fetchHeaders = {
      'Host': 's3.filebase.com',
      'x-amz-date': amzDate,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    };

    // Create canonical request
    const canonicalHeaders = Object.keys(fetchHeaders)
      .sort()
      .map(key => `${key.toLowerCase()}:${fetchHeaders[key]}`)
      .join('\n');

    const signedHeaders = Object.keys(fetchHeaders)
      .map(key => key.toLowerCase())
      .sort()
      .join(';');

    const canonicalRequest = [
      'GET',
      `/${bucketName}`,
      queryString,
      canonicalHeaders + '\n',
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/us-east-1/s3/aws4_request`;
    const canonicalRequestHash = await sha256(canonicalRequest);
    
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash
    ].join('\n');

    // Calculate signature
    const signature = await getSignature(S3_SECRET_KEY, dateStamp, 'us-east-1', 's3', stringToSign);

    // Add authorization header
    fetchHeaders['Authorization'] = `${algorithm} Credential=${S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(s3Url, {
      method: 'GET',
      headers: fetchHeaders
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse({
        error: 'Failed to list files',
        status: response.status,
        details: errorText
      }, response.status);
    }

    const xmlText = await response.text();
    
    // Parse XML response
    const files = parseS3ListResponse(xmlText, bucketName);

    // Fetch CID and duration for each file
    const filesWithMetadata = await Promise.all(
      files.map(async (file) => {
        const metadata = await getFileMetadata(bucketName, file.name);
        return {
          ...file,
          cid: metadata.cid,
          ipfsUrl: metadata.cid ? `https://${IPFS_GATEWAY}/ipfs/${metadata.cid}` : null,
          duration: metadata.duration
        };
      })
    );

    return jsonResponse({
      bucket: bucketName,
      fileCount: filesWithMetadata.length,
      files: filesWithMetadata
    });

  } catch (error) {
    return jsonResponse({
      error: 'List operation failed',
      message: error.message,
      stack: error.stack
    }, 500);
  }
}

function parseS3ListResponse(xmlText, bucketName) {
  const files = [];
  const contentRegex = /<Contents>(.*?)<\/Contents>/gs;
  const matches = xmlText.matchAll(contentRegex);

  for (const match of matches) {
    const content = match[1];
    const key = content.match(/<Key>(.*?)<\/Key>/)?.[1];
    const size = content.match(/<Size>(.*?)<\/Size>/)?.[1];
    const lastModified = content.match(/<LastModified>(.*?)<\/LastModified>/)?.[1];

    if (key) {
      files.push({
        name: key,
        size: parseInt(size || '0'),
        sizeFormatted: formatBytes(parseInt(size || '0')),
        lastModified: lastModified,
        url: `${S3_ENDPOINT}/${bucketName}/${key}`
      });
    }
  }

  return files;
}

async function getFileMetadata(bucketName, fileName) {
  try {
    const date = new Date();
    const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const encodedFileName = fileName.split('/').map(part => encodeURIComponent(part)).join('/');
    const s3Url = `${S3_ENDPOINT}/${bucketName}/${encodedFileName}`;

    // First, get CID from HEAD request
    const headHeaders = {
      'Host': 's3.filebase.com',
      'x-amz-date': amzDate,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    };

    const headCanonicalHeaders = Object.keys(headHeaders)
      .sort()
      .map(key => `${key.toLowerCase()}:${headHeaders[key]}`)
      .join('\n');

    const headSignedHeaders = Object.keys(headHeaders)
      .map(key => key.toLowerCase())
      .sort()
      .join(';');

    const canonicalUri = `/${bucketName}/${encodedFileName}`;

    const headCanonicalRequest = [
      'HEAD',
      canonicalUri,
      '',
      headCanonicalHeaders + '\n',
      headSignedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/us-east-1/s3/aws4_request`;
    const headCanonicalRequestHash = await sha256(headCanonicalRequest);
    
    const headStringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      headCanonicalRequestHash
    ].join('\n');

    const headSignature = await getSignature(S3_SECRET_KEY, dateStamp, 'us-east-1', 's3', headStringToSign);

    headHeaders['Authorization'] = `${algorithm} Credential=${S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${headSignedHeaders}, Signature=${headSignature}`;

    const headResponse = await fetch(s3Url, {
      method: 'HEAD',
      headers: headHeaders
    });

    let cid = null;
    if (headResponse.ok) {
      cid = headResponse.headers.get('x-amz-meta-cid');
    }

    // Get duration for video files
    let duration = null;
    if (fileName.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
      duration = await getVideoDuration(bucketName, fileName, encodedFileName, canonicalUri, dateStamp, amzDate);
    }

    return { cid, duration };
  } catch (error) {
    console.error(`Failed to get metadata for ${fileName}:`, error);
    return { cid: null, duration: null };
  }
}

async function getVideoDuration(bucketName, fileName, encodedFileName, canonicalUri, dateStamp, amzDate) {
  try {
    const s3Url = `${S3_ENDPOINT}/${bucketName}/${encodedFileName}`;

    // Fetch first 100KB to parse MP4 metadata
    const rangeHeaders = {
      'Host': 's3.filebase.com',
      'x-amz-date': amzDate,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'Range': 'bytes=0-102399'
    };

    const rangeCanonicalHeaders = Object.keys(rangeHeaders)
      .sort()
      .map(key => `${key.toLowerCase()}:${rangeHeaders[key]}`)
      .join('\n');

    const rangeSignedHeaders = Object.keys(rangeHeaders)
      .map(key => key.toLowerCase())
      .sort()
      .join(';');

    const rangeCanonicalRequest = [
      'GET',
      canonicalUri,
      '',
      rangeCanonicalHeaders + '\n',
      rangeSignedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/us-east-1/s3/aws4_request`;
    const rangeCanonicalRequestHash = await sha256(rangeCanonicalRequest);
    
    const rangeStringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      rangeCanonicalRequestHash
    ].join('\n');

    const rangeSignature = await getSignature(S3_SECRET_KEY, dateStamp, 'us-east-1', 's3', rangeStringToSign);

    rangeHeaders['Authorization'] = `${algorithm} Credential=${S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${rangeSignedHeaders}, Signature=${rangeSignature}`;

    const response = await fetch(s3Url, {
      method: 'GET',
      headers: rangeHeaders
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const duration = parseMP4Duration(new Uint8Array(buffer));
      return duration;
    }

    return null;
  } catch (error) {
    console.error(`Failed to get duration for ${fileName}:`, error);
    return null;
  }
}

function parseMP4Duration(data) {
  try {
    // Look for 'mvhd' atom which contains duration
    let mvhdIndex = -1;
    
    // Search for mvhd atom
    for (let i = 0; i < data.length - 8; i++) {
      if (data[i] === 0x6D && data[i + 1] === 0x76 && 
          data[i + 2] === 0x68 && data[i + 3] === 0x64) {
        mvhdIndex = i;
        break;
      }
    }
    
    if (mvhdIndex === -1) return null;

    // mvhd atom structure:
    // Starts at 'mvhd' (4 bytes)
    // 1 byte: version
    // 3 bytes: flags
    // Then creation time, modification time, timescale, duration
    
    const version = data[mvhdIndex + 4];
    let timescale, duration;

    if (version === 1) {
      // Version 1: 64-bit values
      // Skip creation time (8 bytes) and modification time (8 bytes)
      timescale = readUint32(data, mvhdIndex + 24);
      duration = readUint64(data, mvhdIndex + 28);
    } else {
      // Version 0: 32-bit values
      // Skip creation time (4 bytes) and modification time (4 bytes)
      timescale = readUint32(data, mvhdIndex + 16);
      duration = readUint32(data, mvhdIndex + 20);
    }

    if (timescale && timescale > 0 && duration && duration > 0) {
      const durationInSeconds = duration / timescale;
      return Math.round(durationInSeconds * 100) / 100; // Round to 2 decimals
    }

    return null;
  } catch (error) {
    return null;
  }
}

function findAtom(data, atomName) {
  const atomBytes = new TextEncoder().encode(atomName);
  
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === atomBytes[0] &&
        data[i + 1] === atomBytes[1] &&
        data[i + 2] === atomBytes[2] &&
        data[i + 3] === atomBytes[3]) {
      return i - 4; // Return position of size field
    }
  }
  
  return -1;
}

function readUint32(data, offset) {
  return (data[offset] << 24) |
         (data[offset + 1] << 16) |
         (data[offset + 2] << 8) |
         data[offset + 3];
}

function readUint64(data, offset) {
  // JavaScript can't handle full 64-bit integers safely
  // Read high 32 bits and low 32 bits separately
  const high = readUint32(data, offset);
  const low = readUint32(data, offset + 4);
  
  // For durations, we typically don't need the full 64-bit precision
  // This will work for videos up to ~49 days long
  return high * 4294967296 + low;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key, message) {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(message)
  );
  
  return new Uint8Array(signature);
}

async function getSignature(secretKey, dateStamp, region, service, stringToSign) {
  const kDate = await hmac('AWS4' + secretKey, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = await hmac(kSigning, stringToSign);
  
  return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
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
