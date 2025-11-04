# 🚀 Quick Start - URL Loading Feature

## What's New?

The video editor now loads JSON data directly from Notion using URL parameters!

## 🎯 Quick Examples

### Load Specific Video
```
http://localhost/video-editor-app/?id=251023100300
```
→ Opens editor with that video loaded automatically

### Empty Editor
```
http://localhost/video-editor-app/
```
→ Opens empty editor, click "Load from Notion" to browse

## 🔧 Changes Made

### ❌ Removed
- "Load JSON" button (gray button)
- Local JSON file loading
- Test files dropdown

### ✅ Added
- URL parameter support: `?id=NOTION_ID`
- Automatic loading from Notion
- Silent loading (no popups)

## 📋 How to Use

### Method 1: Direct URL
1. Get a Notion Formula ID (e.g., `251023100300`)
2. Add to URL: `?id=251023100300`
3. Open URL → Video loads automatically!

### Method 2: From Notion
1. Add formula column in Notion:
   ```
   "https://your-domain.com/video-editor-app/?id=" + prop("ID")
   ```
2. Click the generated link
3. Editor opens with that video!

### Method 3: Manual Browse
1. Open editor without ID
2. Click "Load from Notion" button
3. Browse and select a record

## 🧪 Test It

Open: `video-editor-app/test_url_loading.html`

Try these:
- Enter a Notion ID
- Click "Open Editor with ID"
- See it load automatically!

## 📊 What Happens

```
URL with ?id=251023100300
    ↓
Page loads
    ↓
Detects ID parameter
    ↓
Fetches from Notion
    ↓
Loads JSON silently
    ↓
Video renders!
```

## ✨ Benefits

- 🔗 **Shareable Links** - Send direct links to videos
- 📌 **Bookmarks** - Save favorite projects
- 🤝 **Team Collaboration** - Easy sharing
- 🔄 **Notion Integration** - Direct links from database
- ⚡ **Fast Access** - No manual searching

## 🎨 UI Before & After

**Before:**
```
[Load JSON] [Load from Notion] [Save] [Confirm]
```

**After:**
```
[Load from Notion] [Save] [Confirm]
```

Cleaner and simpler!

## 📝 Summary

- ✅ URL parameter support added
- ✅ Automatic loading from Notion
- ✅ "Load JSON" button removed
- ✅ Cleaner interface
- ✅ Better sharing capabilities

**Try it now:**
```
http://localhost/video-editor-app/?id=YOUR_NOTION_ID
```

---

**That's it!** The editor now supports direct URL access to Notion videos. 🎉
