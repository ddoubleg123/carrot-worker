# Get the current Vosk service URL
$PROJECT_ID = "involuted-river-466315-p0"
$SERVICE_NAME = "vosk-transcription"
$REGION = "us-central1"

Write-Host "🔍 Getting Vosk service URL..." -ForegroundColor Yellow

try {
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' --project $PROJECT_ID
    
    if ($SERVICE_URL) {
        Write-Host "✅ Vosk service URL: $SERVICE_URL" -ForegroundColor Green
        
        # Test the health endpoint
        Write-Host "🏥 Testing health endpoint..." -ForegroundColor Yellow
        $healthResponse = Invoke-WebRequest -Uri "$SERVICE_URL/health" -Method GET -TimeoutSec 10
        
        if ($healthResponse.StatusCode -eq 200) {
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            Write-Host "Response: $($healthResponse.Content)" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Health check failed: $($healthResponse.StatusCode)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "📝 Add this to your .env.local:" -ForegroundColor Yellow
        Write-Host "TRANSCRIPTION_SERVICE_URL=$SERVICE_URL" -ForegroundColor White
        
    } else {
        Write-Host "❌ Could not get service URL" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
