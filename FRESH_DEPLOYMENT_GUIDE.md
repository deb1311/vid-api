# Fresh Google Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud CLI installed and authenticated**
   ```bash
   # Install gcloud CLI if not already installed
   # https://cloud.google.com/sdk/docs/install
   
   # Authenticate
   gcloud auth login
   gcloud auth configure-docker
   ```

2. **Docker installed**
   ```bash
   # Verify Docker is running
   docker --version
   ```

## Step 1: Create New Google Cloud Project (Optional)

If you want a completely fresh deployment with a new project:

```bash
# Create new project (replace PROJECT_ID with your desired ID)
gcloud projects create YOUR-NEW-PROJECT-ID

# Set the project
gcloud config set project YOUR-NEW-PROJECT-ID

# Enable billing (required for Cloud Run)
# Go to: https://console.cloud.google.com/billing
```

## Step 2: Update Configuration for Fresh Deployment

Update the project ID in the configuration files:

1. **cloudbuild.yaml** - Update project ID
2. **deploy.sh** - Update PROJECT_ID variable

## Step 3: Deploy Using Cloud Build (Recommended)

```bash
# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml .
```

## Step 4: Alternative - Deploy Using Local Script

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## Step 5: Verify Deployment

After deployment, test your endpoints:

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe video-editor-api --platform managed --region us-central1 --format 'value(status.url)')

# Test health endpoint
curl $SERVICE_URL/health

# Test master endpoint
curl -X POST $SERVICE_URL/master \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Configuration Details

- **Memory**: 4GB
- **CPU**: 2 vCPU
- **Timeout**: 15 minutes (900 seconds)
- **Max Instances**: 10
- **Region**: us-central1
- **Authentication**: Public (unauthenticated)

## Available Endpoints

- `/health` - Health check
- `/master` - Main video processing endpoint
- `/style1`, `/style2`, `/style3`, `/style4` - Style-specific endpoints
- `/vid-1`, `/vid-1.2`, `/vid-1.3`, `/vid-1.4`, `/vid-1.5` - Video processing versions

## Troubleshooting

1. **Build fails**: Check Docker syntax and dependencies
2. **Deployment fails**: Verify project permissions and billing
3. **Service errors**: Check Cloud Run logs:
   ```bash
   gcloud logs read --service video-editor-api --limit 50
   ```

## Cost Optimization

- Service scales to zero when not in use
- Pay only for actual usage
- Consider setting max instances based on expected load