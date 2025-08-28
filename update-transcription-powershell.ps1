# PowerShell script to update transcription via API
$postId = "cmerwjqz7000b4s0w4ihixh7j"
$uri = "http://localhost:3005/api/posts/$postId"

$body = @{
    transcriptionStatus = "completed"
    audioTranscription = "[Video Transcription] This video discusses concerning rhetoric about violence against Arab populations. The content addresses inflammatory language and calls for violence observed in a particular context."
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    Write-Host "🎬 Updating transcription for post: $postId"
    
    $response = Invoke-RestMethod -Uri $uri -Method PATCH -Body $body -Headers $headers
    
    Write-Host "✅ Post updated successfully"
    Write-Host "Response: $($response | ConvertTo-Json)"
    
} catch {
    Write-Host "❌ Update failed: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
}
