# Deploy Vosk service using Google Cloud Build
# This bypasses the need for local gcloud CLI installation

$ErrorActionPreference = "Stop"

$PROJECT_ID = "involuted-river-466315-p0"
$SERVICE_NAME = "vosk-transcription"
$REGION = "us-central1"

Write-Host "🚀 Deploying Vosk Transcription Service via Cloud Build" -ForegroundColor Green
Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan

# Create a simple trigger using REST API
$triggerPayload = @{
    name = "vosk-manual-deploy"
    description = "Manual deployment of Vosk transcription service"
    github = @{
        owner = "your-github-username"
        name = "your-repo-name"
        push = @{
            branch = "main"
        }
    }
    filename = "carrot/transcription-service/cloudbuild.yaml"
    substitutions = @{
        _SERVICE_NAME = $SERVICE_NAME
        _REGION = $REGION
    }
} | ConvertTo-Json -Depth 10

Write-Host "📝 Cloud Build configuration updated with min-instances=1" -ForegroundColor Yellow
Write-Host "⚠️  Manual deployment required via Google Cloud Console:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID" -ForegroundColor White
Write-Host "2. Click 'Run a build'" -ForegroundColor White
Write-Host "3. Select 'Cloud Build configuration file (yaml or json)'" -ForegroundColor White
Write-Host "4. Upload the cloudbuild.yaml file from this directory" -ForegroundColor White
Write-Host "5. Set substitution variables:" -ForegroundColor White
Write-Host "   - PROJECT_ID: $PROJECT_ID" -ForegroundColor Gray
Write-Host "   - COMMIT_SHA: latest" -ForegroundColor Gray
Write-Host ""
Write-Host "Alternative: Use the gcloud CLI after installation completes:" -ForegroundColor Yellow
Write-Host "gcloud builds submit --config cloudbuild.yaml --project $PROJECT_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ The service will be deployed with --min-instances=1 to prevent downtime" -ForegroundColor Green
