#!/bin/bash
# Deploy Vosk transcription service using Google Cloud Shell
# This bypasses local Docker Desktop issues

set -e

PROJECT_ID="involuted-river-466315-p0"
SERVICE_NAME="vosk-transcription"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying Vosk Transcription Service via Cloud Shell"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"

# Set project
gcloud config set project $PROJECT_ID

# Clone or use existing source code
if [ ! -d "windsurf-project" ]; then
    echo "📥 Cloning source code..."
    git clone https://github.com/your-username/windsurf-project.git
fi

cd windsurf-project/carrot/transcription-service

# Build and push Docker image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

echo "📤 Pushing to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run with always-on configuration
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 900 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars MODEL_PATH=/app/models/vosk-model-small-en-us-0.15

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo ""
echo "🎉 Deployment completed successfully!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "✅ Testing service health..."
curl -f "$SERVICE_URL/health" && echo "Service is healthy!" || echo "Service health check failed"

echo ""
echo "📝 Add this to your .env.local:"
echo "TRANSCRIPTION_SERVICE_URL=$SERVICE_URL"
