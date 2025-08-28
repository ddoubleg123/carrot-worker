const fetch = require('node-fetch');

async function testVoskHealth() {
  const url = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app/health';
  
  try {
    console.log('Testing Vosk health...');
    const response = await fetch(url, { timeout: 10000 });
    
    if (response.ok) {
      const text = await response.text();
      console.log('✅ Vosk service is UP');
      console.log('Response:', text);
      return true;
    } else {
      console.log('❌ Vosk service returned:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Vosk service is DOWN:', error.message);
    return false;
  }
}

testVoskHealth();
