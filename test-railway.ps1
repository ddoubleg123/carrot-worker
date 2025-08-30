# Test Railway service and create ingestion job
Write-Host "🚀 Testing Railway Service..." -ForegroundColor Green

# Test if service is responding
try {
    $response = Invoke-WebRequest -Uri "https://satisfied-commitment-copy-production.up.railway.app/" -Method GET -TimeoutSec 10
    Write-Host "✅ Railway Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))..."
} catch {
    Write-Host "❌ Railway connection error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create test ingestion job
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
    
    Write-Host "`n💡 Job created successfully!" -ForegroundColor Green
    Write-Host "💡 Check Railway logs to verify Firebase Storage upload" -ForegroundColor Yellow
    Write-Host "💡 Look for logs: '[ingest] Upload configuration check:' and '[ingest] Firebase Admin initialized'" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Ingest error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error response: $errorContent" -ForegroundColor Red
    }
}
