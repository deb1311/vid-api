#!/bin/bash

# Deploy the fixed version with working Notion confirm functionality
# This script deploys to Google Cloud Run with the confirmed working code

set -e

# Configuration
PROJECT_ID="editor-476018"
SERVICE_NAME="video-editor-api-fixed"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying Fixed Video Editor API to Google Cloud Run"
echo "Project ID: $PROJECT_ID"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first:"
    echo "https://docs.docker.com/get-docker/"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the image
echo "🏗️  Building Docker image with fixed Notion functionality..."
docker build -t $IMAGE_NAME .

echo "📤 Pushing image to Container Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "🚀 Deploying fixed version to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 4Gi \
    --cpu 2 \
    --timeout 900 \
    --max-instances 10 \
    --set-env-vars NODE_ENV=production

echo "✅ Fixed deployment complete!"
echo ""
echo "🌐 Your fixed API is now available at:"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
echo ""
echo "🧪 Test your deployment:"
echo "curl \$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')/health"
echo ""
echo "🔧 The fixed version includes:"
echo "- ✅ Working Notion confirm functionality"
echo "- ✅ Proper PATCH method implementation"
echo "- ✅ Correct formula_id parameter handling"
echo "- ✅ Enhanced error handling and logging"