# Deployment Checklist

## Pre-Deployment

- [ ] **Enable Billing** on Google Cloud project
  - Go to: https://console.cloud.google.com/billing
  - Select project: `ffmpeg-video-editor-4841`
  - Link or create billing account

- [ ] **Enable Required APIs**
  ```bash
  gcloud config set project ffmpeg-video-editor-4841
  gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
  ```

- [ ] **Verify Docker is running** (for local testing)
  ```bash
  docker --version
  ```

- [ ] **Test locally** (optional but recommended)
  ```bash
  npm install
  npm start
  # Test at http://localhost:3000
  ```

## Deployment

- [ ] **Deploy to Cloud Run**
  ```bash
  gcloud builds submit --config=cloudbuild.yaml
  ```
  
  Expected output:
  - ✅ Building Docker image
  - ✅ Pushing to Container Registry
  - ✅ Deploying to Cloud Run
  - ✅ Service URL provided

- [ ] **Get Service URL**
  ```bash
  gcloud run services describe video-editor-api --region us-central1 --format='value(status.url)'
  ```
  
  Save this URL - you'll need it for testing!

## Post-Deployment Testing

- [ ] **Update test script with your URL**
  ```bash
  # Edit test_production_deployment.js
  # Change: const BASE_URL = 'YOUR_CLOUD_RUN_URL_HERE';
  ```

- [ ] **Run comprehensive tests**
  ```bash
  node test_production_deployment.js
  ```

- [ ] **Verify all endpoints work**
  - [ ] Health check: `/health`
  - [ ] Style 1: `/create-video-style1`
  - [ ] Style 2: `/create-video-style2`
  - [ ] Style 3: `/create-video-style3`
  - [ ] Style 4: `/create-video-style4`
  - [ ] Vid-1.2: `/create-video-vid-1.2`
  - [ ] Master: `/master`
  - [ ] Video Editor: `/editor/`
  - [ ] Webhook Proxy: `/webhook-proxy`

- [ ] **Test Video Editor Interface**
  - Open: `https://YOUR-URL/editor/`
  - [ ] Interface loads correctly
  - [ ] Can create new project
  - [ ] Can add clips
  - [ ] Can render video
  - [ ] Can save to Supabase
  - [ ] Can load from URL parameter

- [ ] **Test with real data**
  - [ ] Upload actual image
  - [ ] Use Instagram audio URL
  - [ ] Create multi-clip video
  - [ ] Verify video quality
  - [ ] Check rendering time

## Monitoring

- [ ] **Check logs for errors**
  ```bash
  gcloud run services logs read video-editor-api --region us-central1 --limit 50
  ```

- [ ] **Monitor resource usage**
  ```bash
  gcloud run services describe video-editor-api --region us-central1
  ```

- [ ] **Set up alerts** (optional)
  - Error rate alerts
  - Latency alerts
  - Memory usage alerts

## Integration

- [ ] **Update Notion integration** (if using)
  - Update API endpoint in Notion worker
  - Test Notion → Video Editor flow

- [ ] **Update Supabase configuration** (if using)
  - Verify CORS settings
  - Test save/load functionality

- [ ] **Update webhook URLs** (if using)
  - Update n8n workflows
  - Update Make.com scenarios
  - Update Zapier zaps

## Documentation

- [ ] **Share URLs with team**
  - API Base URL
  - Video Editor URL
  - API Documentation

- [ ] **Update README** with production URLs

- [ ] **Document any issues encountered**

## Rollback Plan

If deployment fails or has issues:

- [ ] **Revert to previous version**
  ```bash
  gcloud run services update-traffic video-editor-api --to-revisions=PREVIOUS_REVISION=100 --region us-central1
  ```

- [ ] **Check previous revisions**
  ```bash
  gcloud run revisions list --service=video-editor-api --region us-central1
  ```

## Cost Management

- [ ] **Set budget alerts**
  - Go to: https://console.cloud.google.com/billing/budgets
  - Set monthly budget limit
  - Configure alert thresholds

- [ ] **Review pricing**
  - Cloud Run: Pay per use
  - Container Registry: Storage costs
  - Network egress: Data transfer costs

## Success Criteria

✅ Deployment is successful when:
- [ ] All API endpoints return 200 OK
- [ ] Video editor interface loads
- [ ] Can create videos successfully
- [ ] Videos are accessible via URLs
- [ ] Response times are acceptable (<30s for simple videos)
- [ ] No errors in logs
- [ ] All integrations work

## Next Steps

After successful deployment:
1. Share production URL with stakeholders
2. Monitor for 24 hours
3. Gather user feedback
4. Plan for scaling if needed
5. Set up CI/CD pipeline for future updates
