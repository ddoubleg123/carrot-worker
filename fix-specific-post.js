// Fix the specific post with old fake transcription
const fetch = require('node-fetch');

async function fixSpecificPost() {
  const postId = 'cmes0n4ou00014s98lqnu93gj';
  
  console.log(`🔧 Fixing post ${postId} with proper fallback message...`);
  
  try {
    const response = await fetch('http://localhost:3005/api/admin/update-transcription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId: postId,
        transcriptionStatus: 'completed',
        audioTranscription: '[Transcription unavailable] Vosk service is currently being redeployed. Real speech-to-text will be available once service is restored.'
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Post updated successfully');
      console.log('New transcription:', result.post?.audioTranscription);
    } else {
      console.log('❌ Update failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixSpecificPost();
