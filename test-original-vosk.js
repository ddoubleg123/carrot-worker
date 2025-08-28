const fetch = require('node-fetch');

async function testOriginalVosk() {
  const url = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app/health';
  
  console.log('Testing original Vosk service...');
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, { timeout: 10000 });
    
    if (response.ok) {
      const text = await response.text();
      console.log('✅ ORIGINAL VOSK SERVICE IS UP');
      console.log('Response:', text);
      
      // Test transcription endpoint
      console.log('\nTesting transcription endpoint...');
      const transcribeResponse = await fetch('https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: 'test-123',
          videoUrl: 'https://example.com/test.mp4'
        }),
        timeout: 15000
      });
      
      if (transcribeResponse.ok) {
        const transcribeText = await transcribeResponse.text();
        console.log('✅ TRANSCRIPTION ENDPOINT WORKS');
        console.log('Transcription Response:', transcribeText);
        return true;
      } else {
        console.log('❌ Transcription endpoint failed:', transcribeResponse.status);
        return false;
      }
    } else {
      console.log('❌ Original Vosk service returned:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Original Vosk service is DOWN:', error.message);
    return false;
  }
}

testOriginalVosk();
