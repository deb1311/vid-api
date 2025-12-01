# Google Cloud Run Deployment Guide

## Prerequisites

### 1. Enable Billing
You need to enable billing on your Google Cloud project before deployment:

1. Go to https://console.cloud.google.com/billing
2. Select your project (recommended: `ffmpeg-video-editor-4841`)
3. Link a billing account or create a new one
4. Enable billing for the project

### 2. Enable Required APIs
Once billing is enabled, run:
```bash
gcloud config set project ffmpeg-video-editor-4841
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

## Deployment Steps

### Option 1: Using Cloud Build (Recommended)
```bash
# Deploy using the cloudbuild.yaml configuration
gcloud builds submit --config=cloudbuild.yaml
```

This will:
- Build the Docker container
- Push to Google Container Registry
- Deploy to Cloud Run with 4GB memory, 2 CPUs, 15-minute timeout

### Option 2: Manual Docker Build & Deploy
```bash
# Build the Docker image
docker build -t gcr.io/ffmpeg-video-editor-4841/video-editor-api:latest .

# Push to Container Registry
docker push gcr.io/ffmpeg-video-editor-4841/video-editor-api:latest

# Deploy to Cloud Run
gcloud run deploy video-editor-api \
  --image gcr.io/ffmpeg-video-editor-4841/video-editor-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 900 \
  --max-instances 10
```

## After Deployment

### Get Your Service URL
```bash
gcloud run services describe video-editor-api --region us-central1 --format='value(status.url)'
```

The URL will be something like:
`https://video-editor-api-xxxxx-uc.a.run.app`

### Test the Deployment
Run the comprehensive test script:
```bash
node test_production_deployment.js
```

## Configuration Details

### Resources
- **Memory**: 4GB (needed for FFmpeg video processing)
- **CPU**: 2 vCPUs (for faster encoding)
- **Timeout**: 900 seconds (15 minutes for long videos)
- **Max Instances**: 10 (auto-scales based on traffic)

### Endpoints Available
- `/health` - Health check
- `/master` - Master endpoint (handles all video types)
- `/create-video-style1` - Style 1 (bottom text, two-step)
- `/create-video-style2` - Style 2 (bottom text, single-step)
- `/create-video-style3` - Style 3 (top text, two-step)
- `/create-video-style4` - Style 4 (top text, single-step)
- `/create-video-vid-1` - Vid-1 (video input)
- `/create-video-vid-1.2` - Vid-1.2 (multi-clip)
- `/editor/` - Video editor web interface
- `/webhook-proxy` - Webhook proxy for CORS bypass

## Monitoring

### View Logs
```bash
gcloud run services logs read video-editor-api --region us-central1 --limit 50
```

### View Metrics
```bash
gcloud run services describe video-editor-api --region us-central1
```

## Troubleshooting

### If deployment fails:
1. Check billing is enabled
2. Verify APIs are enabled
3. Check Docker builds locally: `docker build -t test .`
4. Review logs: `gcloud builds log <BUILD_ID>`

### If service crashes:
1. Check memory usage (may need to increase from 4GB)
2. Review logs for FFmpeg errors
3. Verify all dependencies are in Dockerfile

## Cost Optimization

- Service auto-scales to 0 when not in use (no cost)
- Charged only for:
  - Request processing time
  - Memory used during requests
  - Network egress
- Estimated cost: ~$0.10-0.50 per hour of active processing

## Security Notes

- Service is set to `--allow-unauthenticated` for easy testing
- For production, consider adding authentication
- Use Cloud IAM for access control
- Consider adding rate limiting
