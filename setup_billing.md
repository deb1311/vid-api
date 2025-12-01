# How to Enable Billing for Google Cloud Run Deployment

## Current Issue
Your Google Cloud projects have billing disabled. You need to enable billing before deploying to Cloud Run.

## Quick Fix - Enable Billing

### Option 1: Using Google Cloud Console (Easiest)

1. **Go to Billing Page**
   - Visit: https://console.cloud.google.com/billing
   - Sign in with: debabratamaitra898@gmail.com

2. **Select Your Project**
   - Choose: `ffmpeg-video-editor-4841` (recommended)
   - Or any other project you prefer

3. **Link Billing Account**
   - Click "Link a billing account"
   - If you don't have one, click "Create billing account"
   - Follow the prompts to add payment method

4. **Verify Billing is Active**
   - Go to: https://console.cloud.google.com/billing/projects
   - Confirm your project shows "Billing enabled"

### Option 2: Using gcloud CLI

```bash
# List available billing accounts
gcloud billing accounts list

# Link billing account to project
gcloud billing projects link ffmpeg-video-editor-4841 --billing-account=BILLING_ACCOUNT_ID
```

## After Enabling Billing

### 1. Enable Required APIs
```bash
gcloud config set project ffmpeg-video-editor-4841
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

### 2. Deploy Your Application
```bash
gcloud builds submit --config=cloudbuild.yaml
```

### 3. Get Your Service URL
```bash
gcloud run services describe video-editor-api --region us-central1 --format='value(status.url)'
```

## Cost Estimates

### Cloud Run Pricing (as of 2024)
- **Free Tier**: 2 million requests/month
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests

### Your Configuration
- 2 vCPUs
- 4GB memory
- 15-minute timeout

### Estimated Costs
- **Light usage** (10 videos/day): ~$5-10/month
- **Medium usage** (50 videos/day): ~$20-30/month
- **Heavy usage** (200 videos/day): ~$80-100/month

**Note**: Service scales to zero when not in use, so you only pay for actual usage!

## Budget Protection

### Set Up Budget Alerts
1. Go to: https://console.cloud.google.com/billing/budgets
2. Click "Create Budget"
3. Set amount: $50/month (or your preference)
4. Set alerts at: 50%, 90%, 100%
5. Add your email for notifications

### Enable Billing Limits
1. Go to: https://console.cloud.google.com/billing
2. Select your billing account
3. Click "Budgets & alerts"
4. Set up automatic billing limits

## Alternative: Free Tier Options

If you want to test without billing:

### 1. Local Development
```bash
npm install
npm start
# Access at http://localhost:3000
```

### 2. Docker Local Testing
```bash
docker build -t video-editor-api .
docker run -p 8080:8080 video-editor-api
# Access at http://localhost:8080
```

### 3. Free Hosting Alternatives
- **Render.com**: Free tier available
- **Railway.app**: $5 credit/month free
- **Fly.io**: Free tier with limitations
- **Heroku**: Free tier (with limitations)

## Recommended Approach

1. **Enable billing** on `ffmpeg-video-editor-4841`
2. **Set budget alert** at $20/month
3. **Deploy to Cloud Run**
4. **Test thoroughly** using the test script
5. **Monitor costs** for first week
6. **Adjust resources** if needed

## Need Help?

If you encounter issues:
1. Check billing status: https://console.cloud.google.com/billing
2. Verify APIs are enabled: https://console.cloud.google.com/apis
3. Review Cloud Run quotas: https://console.cloud.google.com/iam-admin/quotas
4. Check service logs: `gcloud run services logs read video-editor-api --region us-central1`

## Ready to Deploy?

Once billing is enabled, run:
```bash
# 1. Verify project
gcloud config get-value project

# 2. Deploy
gcloud builds submit --config=cloudbuild.yaml

# 3. Test
node test_production_deployment.js
```

That's it! Your video editor API will be live on Google Cloud Run! 🚀
