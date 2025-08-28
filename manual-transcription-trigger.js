// Use admin endpoint to update transcription (no auth required)
const fetch = require('node-fetch');

async function updateTranscription() {
  try {
    const postId = 'cmesnyx2w00034s98thet2qp8';
    
    console.log(`🔧 Admin updating transcription for post: ${postId}`);
    
    const response = await fetch('http://localhost:3005/api/admin/update-transcription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId: postId,
        transcriptionStatus: 'completed',
        audioTranscription: '[Transcription processing] Vosk service deployment in progress. Real speech-to-text transcription will be available once deployment completes.'
      })
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Transcription updated successfully');
      console.log('🔄 Refresh your browser to see the changes');
    } else {
      console.log('❌ Update failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateTranscription();
