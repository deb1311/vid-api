# Google Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud CLI** - Install from https://cloud.google.com/sdk/docs/install
2. **Docker** - Install from https://docs.docker.com/get-docker/
3. **Google Cloud Project** - Your project ID: `editor-476018`

## Quick Deployment (Recommended)

### Option 1: Using the deployment script

```bash
# Make the script executable (Linux/Mac)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

### Option 2: Manual deployment commands

```bash
# 1. Set your project
gcloud config set project editor-476018

# 2. Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 3. Build and push the Docker image
docker build -t gcr.io/editor-476018/video-editor-api .
docker push gcr.io/editor-476018/video-editor-api

# 4. Deploy to Cloud Run
gcloud run deploy video-editor-api \
    --image gcr.io/editor-476018/video-editor-api \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 900 \
    --max-instances 10
```

## Authentication Setup

If you haven't authenticated with Google Cloud yet:

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project editor-476018

# Configure Docker to use gcloud as a credential helper
gcloud auth configure-docker
```

## Configuration Details

### Resource Allocation
- **Memory**: 2GB (required for FFmpeg video processing)
- **CPU**: 2 vCPUs (for faster video rendering)
- **Timeout**: 15 minutes (for large video processing)
- **Max Instances**: 10 (adjust based on expected traffic)

### Environment Variables
- `NODE_ENV=production` (automatically set)
- `PORT=8080` (Cloud Run default, configured in server.js)

## Testing Your Deployment

After deployment, you'll get a URL like:
```
https://video-editor-api-[hash]-uc.a.run.app
```

Test the health endpoint:
```bash
curl https://your-cloud-run-url/health
```

Test video creation:
```bash
curl -X POST https://your-cloud-run-url/create-video-style2 \
  -H "Content-Type: application/json" \
  -d '{
    "quote": "Hello from Cloud Run!",
    "author": "Test User",
    "imageUrl": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
    "audioUrl": "https://www.instagram.com/reel/EXAMPLE/"
  }'
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   gcloud auth login
   gcloud auth configure-docker
   ```

2. **Permission Denied**
   ```bash
   # Make sure you have the necessary IAM roles
   gcloud projects add-iam-policy-binding editor-476018 \
       --member="user:your-email@gmail.com" \
       --role="roles/run.admin"
   ```

3. **Build Timeout**
   - The Docker build includes FFmpeg and yt-dlp installation
   - This may take 5-10 minutes on first build
   - Subsequent builds will be faster due to layer caching

4. **Memory Issues**
   - Video processing requires significant memory
   - 2GB is the minimum recommended
   - Increase to 4GB for larger videos if needed

### Viewing Logs

```bash
# View recent logs
gcloud run logs read video-editor-api --region us-central1

# Follow logs in real-time
gcloud run logs tail video-editor-api --region us-central1
```

### Updating the Service

To update your deployment:

```bash
# Rebuild and push new image
docker build -t gcr.io/editor-476018/video-editor-api .
docker push gcr.io/editor-476018/video-editor-api

# Deploy the update
gcloud run deploy video-editor-api \
    --image gcr.io/editor-476018/video-editor-api \
    --region us-central1
```

## Cost Optimization

### Cloud Run Pricing
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GB-second
- **Requests**: $0.40 per million requests
- **Free Tier**: 2 million requests, 400,000 GB-seconds, 200,000 vCPU-seconds per month

### Optimization Tips
1. **Cold Starts**: Keep at least 1 instance warm for better response times
2. **Concurrency**: Adjust `--concurrency` based on your video processing needs
3. **Regions**: Deploy in regions closest to your users
4. **Monitoring**: Use Cloud Monitoring to track usage and optimize

## Security Considerations

1. **Authentication**: Currently set to `--allow-unauthenticated` for easy testing
2. **CORS**: Configured to allow all origins (`*`) - restrict in production
3. **File Uploads**: 50MB limit configured - adjust based on needs
4. **Rate Limiting**: Consider adding rate limiting for production use

## Next Steps

1. **Custom Domain**: Set up a custom domain for your API
2. **SSL Certificate**: Cloud Run provides automatic HTTPS
3. **Monitoring**: Set up Cloud Monitoring and alerting
4. **CI/CD**: Use Cloud Build triggers for automatic deployments
5. **Authentication**: Implement proper authentication for production use

## Support

If you encounter issues:
1. Check the logs: `gcloud run logs read video-editor-api --region us-central1`
2. Verify your project ID: `gcloud config get-value project`
3. Check service status: `gcloud run services list --region us-central1`