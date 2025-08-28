// Test if Vosk service is accessible
const fetch = require('node-fetch');

async function testVoskService() {
  try {
    const voskUrl = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app';
    
    console.log(`🔍 Testing Vosk service: ${voskUrl}`);
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${voskUrl}/health`, {
      method: 'GET',
      timeout: 10000
    });
    
    console.log('Health status:', healthResponse.status);
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('Health response:', healthData);
    } else {
      console.log('Health check failed');
    }
    
    // Test transcribe endpoint with sample data
    console.log('\n2. Testing transcribe endpoint...');
    const testResponse = await fetch(`${voskUrl}/transcribe`, {
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
    
    console.log('Transcribe status:', testResponse.status);
    if (testResponse.ok) {
      const transcribeData = await testResponse.json();
      console.log('Transcribe response:', JSON.stringify(transcribeData, null, 2));
    } else {
      const errorText = await testResponse.text();
      console.log('Transcribe error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Vosk service test failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 DNS resolution failed - service may not be deployed');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused - service may be down');
    } else if (error.name === 'AbortError') {
      console.log('💡 Request timeout - service may be slow to respond');
    }
  }
}

testVoskService();
