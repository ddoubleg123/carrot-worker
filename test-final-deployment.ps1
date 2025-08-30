# Test final Railway deployment after removing Python services
Write-Host "🚀 Testing Final Railway Deployment..." -ForegroundColor Green

# Test service response
try {
    $response = Invoke-WebRequest -Uri "https://satisfied-commitment-copy-production.up.railway.app/" -Method GET -TimeoutSec 10
    Write-Host "✅ Service Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
    
    # Check if it's Node.js or Python
    if ($response.Content -match "Node\.js|Express") {
        Write-Host "🟢 Node.js worker detected!" -ForegroundColor Green
    } elseif ($response.Content -match "Flask|Python|Uvicorn") {
        Write-Host "🔴 Still running Python worker" -ForegroundColor Red
    } else {
        Write-Host "❓ Service type unclear" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Service connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create test job
Write-Host "`n📤 Creating test ingestion job..." -ForegroundColor Yellow

$body = @{
    url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    callback_url = "https://example.com/callback"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-worker-secret" = "dev_ingest_secret"
}

try {
    $ingestResponse = Invoke-WebRequest -Uri "https://satisfied-commitment-copy-production.up.railway.app/ingest" -Method POST -Body $body -Headers $headers -TimeoutSec 30
    Write-Host "✅ Ingest Status: $($ingestResponse.StatusCode)" -ForegroundColor Green
    
    $jobData = $ingestResponse.Content | ConvertFrom-Json
    Write-Host "Job ID: $($jobData.job_id)" -ForegroundColor Cyan
    Write-Host "Status: $($jobData.status)" -ForegroundColor Cyan
    
    Write-Host "`n📋 Next: Check Railway logs for job $($jobData.job_id)" -ForegroundColor Yellow
    Write-Host "Look for: [ingest] Firebase initialization messages" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Ingest failed: $($_.Exception.Message)" -ForegroundColor Red
}
