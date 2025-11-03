#!/bin/bash

echo "🚀 Redeploying Video Editor API with MIME type fixes..."

# Build and deploy to Google Cloud Run
echo "📦 Building Docker image..."
gcloud builds submit --tag gcr.io/video-editor-api-519298355551/video-editor-api

echo "🌐 Deploying to Cloud Run..."
gcloud run deploy video-editor-api \
  --image gcr.io/video-editor-api-519298355551/video-editor-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10

echo "✅ Deployment complete!"
echo "🔗 Testing the editor at: https://video-editor-api-519298355551.us-central1.run.app/editor/"

# Test MIME types
echo "🧪 Testing MIME types..."
node test_mime_types.js