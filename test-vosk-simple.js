const fetch = require('node-fetch');

async function testVoskSimple() {
  const url = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app/health';
  
  try {
    console.log('Testing Vosk health...');
    const response = await fetch(url, { timeout: 15000 });
    
    if (response.ok) {
      const text = await response.text();
      console.log('✅ VOSK IS READY');
      console.log('Response:', text);
      return true;
    } else {
      console.log('❌ Vosk returned:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Vosk still down:', error.message);
    return false;
  }
}

testVoskSimple();
