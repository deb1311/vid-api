# Notion Status Updater - Cloudflare Worker Deployment Guide

## Overview
This Cloudflare Worker provides a simple API to update the status of records in your Notion Editor database to "Posted". It's designed to be called after video processing is complete.

## Files
- `notion-status-updater.js` - Main worker code
- `test_notion_status_update.js` - Test script

## Deployment Steps

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Create wrangler.toml Configuration
Create a `wrangler.toml` file in the workers directory:

```toml
name = "notion-status-updater"
main = "notion-status-updater.js"
compatibility_date = "2024-01-01"

[env.production]
name = "notion-status-updater"

[env.staging]
name = "notion-status-updater-staging"
```

### 4. Deploy the Worker
```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

### 5. Set Environment Variables (Optional - for security)
For production, consider storing the Notion token as an environment variable:

```bash
# Set the Notion token as a secret
wrangler secret put NOTION_TOKEN --env production
```

Then update the worker code to use:
```javascript
const NOTION_TOKEN = env.NOTION_TOKEN || 'fallback-token';
```

## API Usage

### Update Status by Formula ID (Recommended)
```javascript
POST https://your-worker.workers.dev

Body:
{
  "formula_id": "123"
}

Response:
{
  "success": true,
  "message": "Status updated to Posted successfully",
  "formula_id": "123",
  "previous_status": "Processing",
  "new_status": "Posted",
  "username": "john_doe",
  "caption": "My awesome video...",
  "updated_time": "2024-01-01T12:00:00.000Z"
}
```

### Update Status by Page ID
```javascript
PATCH https://your-worker.workers.dev?id=page-id-here

Body:
{
  "status": "Posted"  // Optional, defaults to "Posted"
}
```

## Integration Examples

### After Video Processing
```javascript
async function markVideoAsPosted(videoId) {
  try {
    const response = await fetch('https://your-worker.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formula_id: videoId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Video ${videoId} marked as Posted`);
      return true;
    } else {
      console.error('❌ Failed to update status:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return false;
  }
}
```

### Batch Update Multiple Records
```javascript
async function markMultipleAsPosted(videoIds) {
  const results = [];
  
  for (const videoId of videoIds) {
    const success = await markVideoAsPosted(videoId);
    results.push({ videoId, success });
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
```

### With Error Handling and Retry
```javascript
async function markAsPostedWithRetry(videoId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://your-worker.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula_id: videoId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Video ${videoId} marked as Posted (attempt ${attempt})`);
        return true;
      }
      
      if (attempt === maxRetries) {
        console.error(`❌ Failed to update after ${maxRetries} attempts:`, result.error);
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

## Testing

1. Update the `WORKER_URL` in `test_notion_status_update.js`
2. Replace the test formula ID with an actual ID from your database
3. Run the test:
```bash
node test_notion_status_update.js
```

## Security Considerations

1. **Environment Variables**: Store the Notion token as a Cloudflare Worker secret
2. **CORS**: The worker allows all origins (`*`) - restrict this in production if needed
3. **Rate Limiting**: Consider adding rate limiting for production use
4. **Authentication**: Add API key authentication if the worker will be publicly accessible

## Monitoring

Monitor your worker in the Cloudflare dashboard:
- View request logs
- Monitor error rates
- Check performance metrics
- Set up alerts for failures

## Troubleshooting

### Common Issues

1. **"Record not found"**: Verify the formula ID exists in your Notion database
2. **"Unauthorized"**: Check that the Notion token is valid and has access to the database
3. **"Status not updated"**: Ensure "Posted" is a valid status option in your Notion database

### Debug Mode
Add logging to the worker for debugging:
```javascript
console.log('Received request:', await request.json());
```

View logs with:
```bash
wrangler tail --env production
```