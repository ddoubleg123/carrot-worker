const fetch = require('node-fetch');

async function checkVoskStatus() {
  const url = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app/health';
  
  try {
    const response = await fetch(url, { timeout: 5000 });
    
    if (response.ok) {
      const text = await response.text();
      console.log('✅ VOSK IS READY NOW!');
      console.log('Response:', text);
      return true;
    } else {
      console.log(`❌ Still deploying (${response.status})`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.name === 'FetchError') {
      console.log('⏳ Still deploying...');
    } else {
      console.log('❌ Error:', error.message);
    }
    return false;
  }
}

checkVoskStatus();
