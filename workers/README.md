# Notion Database Reader - Cloudflare Worker

A powerful Cloudflare Worker that provides a REST API interface for reading from and writing to Notion databases. This worker enables full CRUD operations on your Notion database with automatic data transformation and filtering capabilities.

## 🚀 Features

- **Full CRUD Operations**: Create, Read, Update records
- **Dynamic Status Filtering**: Filter records by any status value
- **JSON Content Extraction**: Get parsed JSON content from specific records
- **Formula ID Support**: Update records using their formula-generated IDs
- **Auto Data Transformation**: Converts Notion's complex property format to clean JSON
- **CORS Enabled**: Ready for web application integration
- **Type Safety**: Handles all Notion property types (text, status, formula, URL, etc.)

## 📋 API Endpoints

### Base URL
```
https://notion-reader.debabratamaitra898.workers.dev
```

### 1. Get All Records
```http
GET /
```

**Response:**
```json
{
  "total": 5,
  "has_more": false,
  "next_cursor": null,
  "items": [
    {
      "id": "page-id",
      "created_time": "2025-10-23T10:03:00.000Z",
      "last_edited_time": "2025-10-23T10:03:00.000Z",
      "properties": {
        "ID": "251023100300",
        "Caption": "Sample caption",
        "JSON": "{\"key\": \"value\"}",
        "Status": "Pending",
        "Username": "user123",
        "Editor": "example.com/251023100300",
        "Output URL": "https://output.example.com"
      },
      "url": "https://www.notion.so/page-url"
    }
  ]
}
```

### 2. Filter Records by Status
```http
GET /?filter=STATUS_NAME
```

**Examples:**
- `GET /?filter=pending`
- `GET /?filter=scheduled`
- `GET /?filter=confirmed`
- `GET /?filter=completed`

**Response:**
```json
{
  "filter": "Status = Pending",
  "total_filtered": 2,
  "filtered_ids": ["251023100300", "251023100400"],
  "records": [
    {
      "page_id": "page-id",
      "formula_id": "251023100300",
      "username": "user123",
      "caption": "Sample caption",
      "created_time": "2025-10-23T10:03:00.000Z",
      "last_edited_time": "2025-10-23T10:03:00.000Z",
      "url": "https://www.notion.so/page-url"
    }
  ]
}
```

### 3. Get JSON Content by ID
```http
GET /?json_id=FORMULA_ID
```

**Example:**
```http
GET /?json_id=251023100300
```

**Response:**
```json
{
  "formula_id": "251023100300",
  "page_id": "page-id",
  "username": "user123",
  "caption": "Sample caption",
  "status": "Pending",
  "json_raw": "{\"audioUrl\": \"file.mp3\", \"duration\": 15}",
  "json_parsed": {
    "audioUrl": "file.mp3",
    "duration": 15
  },
  "created_time": "2025-10-23T10:03:00.000Z",
  "last_edited_time": "2025-10-23T10:03:00.000Z",
  "url": "https://www.notion.so/page-url"
}
```

### 4. Create New Record
```http
POST /
Content-Type: application/json
```

**Request Body:**
```json
{
  "caption": "New record caption",
  "json": {
    "key": "value",
    "number": 123
  },
  "status": "Pending",
  "output_url": "https://output.example.com/file.mp4",
  "username": "newuser"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Record created successfully",
  "id": "new-page-id",
  "url": "https://www.notion.so/new-page-url",
  "properties": {
    "ID": "251023100500",
    "Caption": "New record caption",
    "JSON": "{\"key\": \"value\", \"number\": 123}",
    "Status": "Pending",
    "Username": "newuser",
    "Editor": "example.com/251023100500",
    "Output URL": "https://output.example.com/file.mp4"
  }
}
```

### 5. Update Record by Page ID
```http
PATCH /?id=PAGE_ID
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "Completed",
  "output_url": "https://final-output.com/video.mp4"
}
```

### 6. Update Record by Formula ID
```http
PATCH /?formula_id=FORMULA_ID
Content-Type: application/json
```

**Example:**
```http
PATCH /?formula_id=251023100300
Content-Type: application/json

{
  "status": "Scheduled",
  "caption": "Updated caption"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Record updated successfully",
  "id": "page-id",
  "url": "https://www.notion.so/page-url",
  "properties": {
    "ID": "251023100300",
    "Status": "Scheduled",
    "Caption": "Updated caption"
  }
}
```

## 🗄️ Database Schema

The worker is configured for a Notion database with the following properties:

| Property | Type | Description | Editable |
|----------|------|-------------|----------|
| **ID** | Formula | Auto-generated unique identifier | ❌ Read-only |
| **Caption** | Rich Text | Text description of the record | ✅ |
| **JSON** | Rich Text | JSON data storage | ✅ |
| **Status** | Status | Record status (Pending, Scheduled, Confirmed, etc.) | ✅ |
| **Username** | Title | Primary identifier/username | ✅ |
| **Editor** | Formula | Auto-generated URL (example.com/{ID}) | ❌ Read-only |
| **Output URL** | URL | Link to output files | ✅ |

## 🛠️ Setup & Deployment

### Prerequisites
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Cloudflare account
- Notion integration token
- Notion database ID

### Installation

1. **Clone/Download the worker files**
2. **Install dependencies:**
   ```bash
   cd workers
   npm install
   ```

3. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

4. **Set your Notion token as a secret:**
   ```bash
   wrangler secret put NOTION_TOKEN
   # Enter your token when prompted
   ```

5. **Update the database ID in `notion-reader.js`:**
   ```javascript
   const DATABASE_ID = 'your-database-id-here';
   ```

6. **Deploy the worker:**
   ```bash
   wrangler deploy
   ```

### Getting Your Notion Credentials

#### Notion Integration Token
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Token"
4. Share your database with the integration

#### Database ID
1. Open your Notion database in a web browser
2. Copy the URL: `https://notion.so/workspace/DATABASE_ID?v=...`
3. Extract the 32-character DATABASE_ID from the URL

## 🔧 Configuration

### Environment Variables
- `NOTION_TOKEN`: Your Notion integration token (set as Wrangler secret)

### Hardcoded Configuration
- `DATABASE_ID`: Your Notion database ID (in `notion-reader.js`)

### CORS Settings
The worker includes CORS headers for web application integration:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## 📝 Usage Examples

### JavaScript/Fetch Examples

#### Get all records
```javascript
const response = await fetch('https://notion-reader.debabratamaitra898.workers.dev/');
const data = await response.json();
console.log(`Total records: ${data.total}`);
```

#### Filter by status
```javascript
const response = await fetch('https://notion-reader.debabratamaitra898.workers.dev/?filter=pending');
const data = await response.json();
console.log(`Pending records: ${data.total_filtered}`);
```

#### Get JSON content
```javascript
const response = await fetch('https://notion-reader.debabratamaitra898.workers.dev/?json_id=251023100300');
const data = await response.json();
console.log('Parsed JSON:', data.json_parsed);
```

#### Create a new record
```javascript
const response = await fetch('https://notion-reader.debabratamaitra898.workers.dev/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    caption: 'New video project',
    json: { duration: 30, clips: 5 },
    status: 'Pending',
    username: 'creator123'
  })
});
const result = await response.json();
console.log('Created record ID:', result.properties.ID);
```

#### Update a record
```javascript
const response = await fetch('https://notion-reader.debabratamaitra898.workers.dev/?formula_id=251023100300', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'Completed',
    output_url: 'https://cdn.example.com/final-video.mp4'
  })
});
const result = await response.json();
console.log('Update successful:', result.success);
```

### cURL Examples

#### Get scheduled records
```bash
curl "https://notion-reader.debabratamaitra898.workers.dev/?filter=scheduled"
```

#### Create a record
```bash
curl -X POST "https://notion-reader.debabratamaitra898.workers.dev/" \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "API Test Record",
    "json": "{\"test\": true}",
    "status": "Pending",
    "username": "apiuser"
  }'
```

#### Update record status
```bash
curl -X PATCH "https://notion-reader.debabratamaitra898.workers.dev/?formula_id=251023100300" \
  -H "Content-Type: application/json" \
  -d '{"status": "Confirmed"}'
```

## 🔍 Error Handling

The worker includes comprehensive error handling:

### Common Error Responses

#### Record Not Found
```json
{
  "error": "Record with formula ID 251023100300 not found",
  "available_ids": ["251023100400", "251023100500"]
}
```

#### Missing Parameters
```json
{
  "error": "Page ID is required. Use ?id=PAGE_ID in the URL."
}
```

#### Notion API Errors
```json
{
  "error": "Failed to fetch from Notion API",
  "details": "Notion API error details",
  "status": 400
}
```

#### Validation Errors
```json
{
  "error": "Request body is required"
}
```

## 🧪 Testing

### Test Interface
Open `test-worker.html` in your browser for a web-based testing interface that allows you to:
- Get all records
- Create new records with form inputs
- Test all API endpoints interactively

### Manual Testing
Use the provided cURL examples or JavaScript snippets to test the API endpoints.

## 🚀 Performance & Limits

- **Page Size**: 100 records per request (Notion API limit)
- **Rate Limits**: Subject to Notion API rate limits
- **Response Time**: Typically 200-500ms depending on database size
- **CORS**: Enabled for all origins (`*`)

## 🔐 Security Considerations

- **Token Security**: Notion token is stored as a Cloudflare Worker secret
- **CORS**: Currently allows all origins - restrict in production if needed
- **Input Validation**: Basic validation on required fields
- **Error Handling**: Sanitized error messages to prevent information leakage

## 📚 Additional Resources

- [Notion API Documentation](https://developers.notion.com/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## 🐛 Troubleshooting

### Common Issues

1. **"Database not found" error**
   - Verify the database ID is correct
   - Ensure the integration has access to the database

2. **"Unauthorized" error**
   - Check that the Notion token is set correctly
   - Verify the integration has the required permissions

3. **"Property validation" errors**
   - Ensure the database schema matches the expected properties
   - Check that status values exist in your Notion database

4. **Records not appearing in API**
   - Check if there are database filters applied in Notion
   - Verify the integration has access to all records

### Debug Mode
For debugging, check the Cloudflare Workers logs:
```bash
wrangler tail
```

## 📄 License

This project is provided as-is for educational and development purposes.

---

**Worker URL**: https://notion-reader.debabratamaitra898.workers.dev  
**Last Updated**: October 23, 2025