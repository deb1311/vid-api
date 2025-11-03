#!/usr/bin/env pwsh

Write-Host "🚀 Redeploying Video Editor API with MIME type fixes..." -ForegroundColor Green

# Build and deploy to Google Cloud Run
Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag gcr.io/video-editor-api-519298355551/video-editor-api

Write-Host "🌐 Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy video-editor-api `
  --image gcr.io/video-editor-api-519298355551/video-editor-api `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --port 3000 `
  --memory 2Gi `
  --cpu 2 `
  --timeout 300 `
  --max-instances 10

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🔗 Testing the editor at: https://video-editor-api-519298355551.us-central1.run.app/editor/" -ForegroundColor Cyan

# Test MIME types
Write-Host "🧪 Testing MIME types..." -ForegroundColor Yellow
node test_mime_types.js