# Webhook Integration Summary

## Overview
Added webhook functionality to the video editor app that triggers when the Confirm button is clicked. The webhook receives the Notion record ID and other relevant data.

## Changes Made

### 1. HTML Updates (`video-editor-app/index.html`)
- Added webhook settings button to the header with gear icon
- Added webhook settings modal with URL input field

### 2. JavaScript Updates (`video-editor-app/app.js`)
- Added webhook URL storage with localStorage persistence
- Default webhook URL: `https://n8n.ncertbot.fun/webhook/90aa23d0-a017-4833-8dee-6fd0a591c1bf`
- Added webhook modal functions (show/hide/save settings)
- Modified `confirmData()` function to call webhook after confirmation
- Added `callWebhook()` function that fetches actual ID column value from Notion via Cloudflare worker
- Enhanced payload to include both formula_id and actual ID column value

### 3. CSS Updates (`video-editor-app/styles.css`)
- Added styling for the webhook settings button

## Webhook Payload Structure

When the Confirm button is clicked, the webhook receives a POST request with this payload:

```json
{
  "timestamp": "2025-10-31T12:00:00.000Z",
  "action": "confirm",
  "data": {
    // Cleaned video editor data
  },
  "notion_record": {
    "formula_id": "unique_notion_id",
    "username": "user_name",
    "page_id": "notion_page_id",
    "status": "original_status",
    "id_column_value": "actual_id_from_notion_database",
    "endpoint": "vid-1.5"
  },
  "notion_id": "actual_id_from_notion_database",
  "notion_username": "user_name",
  "endpoint": "vid-1.5"
}
```

**Note**: 
- The `notion_id` field contains the actual ID column value fetched from the Notion database via the Cloudflare worker
- The `endpoint` field contains the value from the "Endpoint" column in Notion (e.g., "style1", "vid-1.5", "master")
- If the Endpoint column is empty or fetch fails, it defaults to "master"

## Features
- **Configurable Webhook URL**: Users can change the webhook URL via the settings button
- **Notion Record ID**: Automatically includes the Notion record ID (`formula_id`) when available
- **Persistent Settings**: Webhook URL is saved in localStorage
- **Enhanced Error Handling**: Detailed error messages for CORS, timeout, and network issues
- **Webhook Testing**: Test button to verify webhook connectivity before saving
- **Timeout Protection**: 10-second timeout for webhook calls, 5-second for tests
- **Fallback Support**: Works with both Notion records and local files

## Usage
1. Click the gear icon (⚙️) in the header to open webhook settings
2. Enter or modify the webhook URL
3. Click "Test" to verify the webhook is working (optional but recommended)
4. Click "Save" to save the settings
5. When you click "Confirm", the webhook will be called with the Notion record ID

## CORS Solution
The CORS issue has been resolved by implementing a server-side webhook proxy:
- Frontend calls `/webhook-proxy` endpoint on the same domain (no CORS issues)
- Server-side proxy forwards the request to the actual webhook URL
- This bypasses browser CORS restrictions completely

## Troubleshooting
If webhook calls still fail, check:
1. The webhook URL is accessible from the server
2. The webhook endpoint accepts POST requests with JSON content
3. Network connectivity between Cloud Run and the webhook server

## Default Webhook URL
`https://n8n.ncertbot.fun/webhook/90aa23d0-a017-4833-8dee-6fd0a591c1bf`