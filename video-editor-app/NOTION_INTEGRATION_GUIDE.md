# Notion Integration Guide

## Overview
The video editor app now integrates with your Notion database via the Cloudflare Worker, allowing you to load JSON data directly from Notion records.

## Features Added

### 1. **Load from Notion Button**
- New orange "Load from Notion" button in the header
- Opens a modal showing all records from your Notion database

### 2. **Status Filtering**
- Filter records by status: Pending, Scheduled, Confirmed, Completed
- Or view all records at once

### 3. **Record Display**
- Shows username, caption, status badge, and creation date
- Color-coded status badges for easy identification
- Click any record to load its JSON data

### 4. **Automatic JSON Loading**
- Fetches the JSON content from the selected Notion record
- Parses and loads it into the video editor
- Shows success notification with record details

## How to Use

### Step 1: Open the Video Editor
Open `video-editor-app/index.html` in your browser

### Step 2: Click "Load from Notion"
Click the orange "Load from Notion" button in the top header

### Step 3: Browse Records
- View all available records from your Notion database
- Use the status filter dropdown to narrow down results
- Click "Refresh" to reload the list

### Step 4: Select a Record
Click on any record card to load its JSON data into the editor

### Step 5: Edit and Preview
The JSON data is now loaded and ready to edit in the video editor!

## Technical Details

### Cloudflare Worker URL
```
https://notion-reader.debabratamaitra898.workers.dev
```

### API Endpoints Used

1. **Get All Records**
   ```
   GET /
   ```

2. **Filter by Status**
   ```
   GET /?filter=pending
   GET /?filter=scheduled
   GET /?filter=confirmed
   GET /?filter=completed
   ```

3. **Get JSON by ID**
   ```
   GET /?json_id=FORMULA_ID
   ```

### Data Flow
```
Notion Database
    ↓
Cloudflare Worker (notion-reader)
    ↓
Video Editor App (index.html)
    ↓
Canvas Preview & Timeline
```

## Files Modified

### 1. `index.html`
- Added "Load from Notion" button
- Added Notion modal with filters
- Added status filter dropdown

### 2. `app.js`
- Added `showNotionModal()` function
- Added `hideNotionModal()` function
- Added `loadNotionRecords()` function
- Added `loadNotionRecord(formulaId)` function
- Added event listeners for Notion functionality

### 3. `styles.css`
- Added `.btn-notion` styles (orange button)
- Added `.modal-filters` styles
- Added `.notion-record-item` styles
- Added status badge styles (pending, scheduled, confirmed, completed)

## Testing

### Test the Integration
Open `test_notion_integration.html` in your browser to:
1. Test worker connection
2. View all records
3. Filter by status
4. Get JSON by specific ID

### Manual Testing Steps
1. Open the video editor
2. Click "Load from Notion"
3. Verify records are displayed
4. Try filtering by different statuses
5. Click a record to load its JSON
6. Verify the video preview and timeline update

## Troubleshooting

### No Records Showing
- Check that the Cloudflare worker is deployed and accessible
- Verify the worker URL is correct in `app.js`
- Check browser console for error messages

### CORS Errors
- The worker already has CORS enabled
- If you see CORS errors, check the worker deployment

### JSON Not Loading
- Verify the Notion record has JSON data in the "JSON" column
- Check that the JSON is valid
- Look at browser console for parsing errors

### Worker Not Accessible
- Verify the worker is deployed: `wrangler deploy` in the workers folder
- Check the worker URL is correct
- Test the worker directly: visit the URL in your browser

## Status Badge Colors

- **Pending**: Yellow background (#fff3cd)
- **Scheduled**: Blue background (#d1ecf1)
- **Confirmed**: Green background (#d4edda)
- **Completed**: Gray background (#d6d8db)

## Next Steps

### Potential Enhancements
1. Add ability to save edited JSON back to Notion
2. Add search functionality for records
3. Add pagination for large record sets
4. Add endpoint selection in the UI
5. Add record creation from the editor

## Support

If you encounter issues:
1. Check the browser console for errors
2. Test the worker directly using `test_notion_integration.html`
3. Verify your Notion database structure matches the expected schema
4. Check the worker logs: `wrangler tail` in the workers folder

---

**Integration Complete!** 🎉

The video editor can now seamlessly load JSON data from your Notion database.
