# Quick Reference - After Deployment

## 🔗 Your URLs (Update after deployment)

```
Base URL: https://video-editor-api-xxxxx-uc.a.run.app
Health: https://video-editor-api-xxxxx-uc.a.run.app/health
Editor: https://video-editor-api-xxxxx-uc.a.run.app/editor/
```

## 🚀 Quick Commands

### Get Service URL
```bash
gcloud run services describe video-editor-api --region us-central1 --format='value(status.url)'
```

### View Logs
```bash
gcloud run services logs read video-editor-api --region us-central1 --limit 50
```

### Update Service
```bash
gcloud builds submit --config=cloudbuild.yaml
```

### Check Status
```bash
gcloud run services describe video-editor-api --region us-central1
```

## 📡 API Examples

### Style 1 (Bottom Text)
```bash
curl -X POST https://YOUR-URL/create-video-style1 \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg",
    "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "quote": "Success is not final",
    "author": "- Winston Churchill",
    "duration": 10
  }'
```

### Master Endpoint (Auto-detect)
```bash
curl -X POST https://YOUR-URL/master \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "audioUrl": "https://instagram.com/reel/...",
    "quote": "Your quote here"
  }'
```

### Multi-clip (Vid-1.2)
```bash
curl -X POST https://YOUR-URL/create-video-vid-1.2 \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/audio.mp3",
    "quote": "Your quote",
    "clips": [
      {"imageurl": "https://example.com/1.jpg", "start": 0, "duration": 3},
      {"imageurl": "https://example.com/2.jpg", "start": 3, "duration": 3}
    ]
  }'
```

## 🧪 Quick Test

```bash
# Test health
curl https://YOUR-URL/health

# Test with Node.js
node test_production_deployment.js
```

## 🔧 Troubleshooting

### Service not responding
```bash
# Check if service is running
gcloud run services list --region us-central1

# Restart service (redeploy)
gcloud builds submit --config=cloudbuild.yaml
```

### Out of memory errors
```bash
# Increase memory to 8GB
gcloud run services update video-editor-api \
  --memory 8Gi \
  --region us-central1
```

### Timeout errors
```bash
# Increase timeout to 20 minutes
gcloud run services update video-editor-api \
  --timeout 1200 \
  --region us-central1
```

### Check logs for errors
```bash
# Real-time logs
gcloud run services logs tail video-editor-api --region us-central1

# Last 100 lines
gcloud run services logs read video-editor-api --region us-central1 --limit 100
```

## 💰 Cost Monitoring

### Check current costs
```bash
# View billing
gcloud billing accounts list

# View project costs
gcloud billing projects describe ffmpeg-video-editor-4841
```

### Set budget alert
1. Go to: https://console.cloud.google.com/billing/budgets
2. Create budget: $20/month
3. Set alerts: 50%, 90%, 100%

## 🔐 Security

### Make service private (require authentication)
```bash
gcloud run services update video-editor-api \
  --no-allow-unauthenticated \
  --region us-central1
```

### Make service public again
```bash
gcloud run services update video-editor-api \
  --allow-unauthenticated \
  --region us-central1
```

## 📊 Monitoring

### Service metrics
```bash
gcloud run services describe video-editor-api --region us-central1
```

### View in console
- Metrics: https://console.cloud.google.com/run/detail/us-central1/video-editor-api/metrics
- Logs: https://console.cloud.google.com/run/detail/us-central1/video-editor-api/logs

## 🔄 Update Workflow

1. Make code changes locally
2. Test locally: `npm start`
3. Deploy: `gcloud builds submit --config=cloudbuild.yaml`
4. Test production: `node test_production_deployment.js`
5. Monitor logs for errors

## 📱 Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('https://YOUR-URL/master', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://example.com/image.jpg',
    audioUrl: 'https://example.com/audio.mp3',
    quote: 'Your quote here'
  })
});
const data = await response.json();
console.log('Video URL:', data.videoUrl);
```

### Python
```python
import requests

response = requests.post('https://YOUR-URL/master', json={
    'imageUrl': 'https://example.com/image.jpg',
    'audioUrl': 'https://example.com/audio.mp3',
    'quote': 'Your quote here'
})
data = response.json()
print('Video URL:', data['videoUrl'])
```

### cURL
```bash
curl -X POST https://YOUR-URL/master \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/image.jpg","audioUrl":"https://example.com/audio.mp3","quote":"Your quote"}'
```

## 🎯 Common Tasks

### Create simple video
```bash
curl -X POST https://YOUR-URL/master \
  -H "Content-Type: application/json" \
  -d @test-payload-simple.json
```

### Test Instagram audio
```bash
curl -X POST https://YOUR-URL/master \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "instagramUrl": "https://www.instagram.com/reel/...",
    "quote": "Your quote"
  }'
```

### Use video editor
```
Open: https://YOUR-URL/editor/
1. Add clips to timeline
2. Adjust durations
3. Add text overlays
4. Click "Render Video"
5. Save to Supabase or download
```

## 📞 Support

### Documentation
- Deployment: `DEPLOYMENT_GUIDE.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
- Billing: `setup_billing.md`
- Full guide: `READY_TO_DEPLOY.md`

### Logs
```bash
# Error logs only
gcloud run services logs read video-editor-api --region us-central1 | grep ERROR

# Specific time range
gcloud run services logs read video-editor-api --region us-central1 --limit 100 --format json
```

### Get help
```bash
gcloud run --help
gcloud run services --help
gcloud run deploy --help
```

---

**Save this file!** You'll reference it often after deployment. 📌
