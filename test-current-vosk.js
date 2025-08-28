// Test the current Vosk service URL with a real transcription request
const fetch = require('node-fetch');

async function testCurrentVosk() {
  const voskUrl = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app';
  
  console.log(`🔍 Testing current Vosk service: ${voskUrl}`);
  
  try {
    // Test health endpoint first
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${voskUrl}/health`, {
      method: 'GET',
      timeout: 10000
    });
    
    console.log(`Health status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthText = await healthResponse.text();
      console.log(`Health response: ${healthText}`);
    } else {
      console.log('❌ Health check failed');
      return false;
    }
    
    // Test transcribe endpoint with sample audio
    console.log('\n2. Testing transcribe endpoint...');
    const transcribeResponse = await fetch(`${voskUrl}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId: 'test-post-123',
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      }),
      timeout: 30000
    });
    
    console.log(`Transcribe status: ${transcribeResponse.status}`);
    if (transcribeResponse.ok) {
      const transcribeData = await transcribeResponse.json();
      console.log('✅ Transcribe response:', JSON.stringify(transcribeData, null, 2));
      return true;
    } else {
      const errorText = await transcribeResponse.text();
      console.log('❌ Transcribe error:', errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Vosk service test failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Service not found - may need redeployment');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused - service may be down');
    } else if (error.name === 'AbortError') {
      console.log('💡 Request timeout - service may be overloaded');
    }
    return false;
  }
}

testCurrentVosk().then(success => {
  if (success) {
    console.log('\n✅ Vosk service is working! New transcriptions should work.');
  } else {
    console.log('\n❌ Vosk service is not accessible. Use admin script for stuck posts.');
  }
});
