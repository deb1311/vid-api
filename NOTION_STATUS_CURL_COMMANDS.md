# Notion Status Updater - Curl Commands

## 🚀 **Recommended Method: Using Page ID (Fastest)**

```bash
curl -X POST "https://notion-status-updater.debabratamaitra898.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{"page_id": "2c151a6d-097f-813d-9ddd-cd26d803cfdd"}'
```

### ✅ **Advantages of Page ID Method:**
- **Faster**: No database search required
- **Direct**: Updates the record immediately
- **Reliable**: No ambiguity about which record to update

## 📋 **How to Get the Page ID**

### Method 1: From Notion URL
When you open a record in Notion, the URL contains the page ID:
```
https://www.notion.so/username-2c151a6d097f813d9dddcd26d803cfdd
                              ↑ This is the page ID ↑
```

### Method 2: From API Response
When you create or fetch records, the page ID is in the response:
```json
{
  "id": "2c151a6d-097f-813d-9ddd-cd26d803cfdd",
  "properties": { ... }
}
```

### Method 3: Get All Page IDs
```bash
curl "https://notion-reader.debabratamaitra898.workers.dev" | jq '.items[] | {id: .id, number_id: .properties.ID}'
```

## 🔄 **Alternative Methods**

### By Number ID (Slower - requires search)
```bash
curl -X POST "https://notion-status-updater.debabratamaitra898.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{"id": 73}'
```

### PATCH Method with Query Parameter
```bash
curl -X PATCH "https://notion-status-updater.debabratamaitra898.workers.dev?id=2c151a6d-097f-813d-9ddd-cd26d803cfdd" \
  -H "Content-Type: application/json" \
  -d '{"status": "Posted"}'
```

## 📊 **Expected Response**

```json
{
  "success": true,
  "message": "Status updated to Posted successfully",
  "page_id": "2c151a6d-097f-813d-9ddd-cd26d803cfdd",
  "new_status": "Posted",
  "updated_time": "2025-12-10T10:51:00.000Z",
  "url": "https://www.notion.so/e3-2c151a6d097f813d9dddcd26d803cfdd"
}
```

## 🎯 **Production Integration Examples**

### JavaScript/Node.js
```javascript
async function markAsPosted(pageId) {
  const response = await fetch('https://notion-status-updater.debabratamaitra898.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_id: pageId })
  });
  
  const result = await response.json();
  return result.success;
}

// Usage
await markAsPosted('2c151a6d-097f-813d-9ddd-cd26d803cfdd');
```

### Python
```python
import requests

def mark_as_posted(page_id):
    response = requests.post(
        'https://notion-status-updater.debabratamaitra898.workers.dev',
        json={'page_id': page_id}
    )
    return response.json()

# Usage
result = mark_as_posted('2c151a6d-097f-813d-9ddd-cd26d803cfdd')
```

### Bash Script
```bash
#!/bin/bash
mark_as_posted() {
  local page_id="$1"
  curl -s -X POST "https://notion-status-updater.debabratamaitra898.workers.dev" \
    -H "Content-Type: application/json" \
    -d "{\"page_id\": \"$page_id\"}" | jq '.success'
}

# Usage
mark_as_posted "2c151a6d-097f-813d-9ddd-cd26d803cfdd"
```

## 🔧 **PowerShell (Windows)**
```powershell
$pageId = "2c151a6d-097f-813d-9ddd-cd26d803cfdd"
$body = @{ page_id = $pageId } | ConvertTo-Json

Invoke-RestMethod -Uri "https://notion-status-updater.debabratamaitra898.workers.dev" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

## 🚀 **Workflow Integration**

### After Video Processing
```bash
# 1. Process video
ffmpeg -i input.mp4 output.mp4

# 2. Upload to storage
aws s3 cp output.mp4 s3://bucket/

# 3. Mark as posted in Notion
curl -X POST "https://notion-status-updater.debabratamaitra898.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{"page_id": "'$NOTION_PAGE_ID'"}'
```

## 📝 **Current Test Records**

```bash
# Record 73 (@e3)
curl -X POST "https://notion-status-updater.debabratamaitra898.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{"page_id": "2c151a6d-097f-813d-9ddd-cd26d803cfdd"}'

# Record 72 (@e2)  
curl -X POST "https://notion-status-updater.debabratamaitra898.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{"page_id": "2c151a6d-097f-8144-8a76-ce46a3858c59"}'
```

---

**✨ The page_id method is the recommended approach for production use!**