# How to Run the Video Editor

## Static Site - No Server Required!

The video editor is now a **completely static site** that works without any backend server. You just need to serve the files over HTTP (not file://) for JSON loading to work.

## Quick Start Options

### Option 1: Using http-server (Recommended)

1. Install http-server globally (one time):
   ```bash
   npm install -g http-server
   ```

2. Navigate to the video-editor-app directory:
   ```bash
   cd video-editor-app
   ```

3. Start the server:
   ```bash
   http-server -p 8080
   ```

4. Open your browser and go to:
   ```
   http://localhost:8080/
   ```

### Option 2: Using Python (If you have Python installed)

1. Navigate to the video-editor-app directory:
   ```bash
   cd video-editor-app
   ```

2. Start the server:
   
   **Python 3:**
   ```bash
   python -m http.server 8080
   ```
   
   **Python 2:**
   ```bash
   python -m SimpleHTTPServer 8080
   ```

3. Open your browser and go to:
   ```
   http://localhost:8080/
   ```

### Option 3: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Features Available

### ✅ All Features Work Offline:
- Full timeline editing
- Drag and drop clips
- Resize clips by dragging margins
- Real-time canvas preview with animations
- JSON import/export
- Cross-layer snapping
- Fade animations (where applicable)
- Completely client-side - no backend needed!

## Troubleshooting

### JSON Files Won't Load
- **Cause**: Running from file:// protocol
- **Solution**: Use one of the web server options above

### Port Already in Use
- **Solution**: Change the port number in the command
  ```bash
  http-server -p 8081
  ```

### CORS Errors
- **Cause**: Browser security restrictions
- **Solution**: Make sure you're accessing via http://localhost, not file://

## Backend API Integration

For production video rendering, use the backend API endpoints:
- `/vid-1.2` - Image-based videos
- `/vid-1.3` - Videos with captions
- `/vid-1.4` - Multi-clip videos

The editor exports JSON that can be sent directly to these endpoints.
