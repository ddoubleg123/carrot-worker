// Test Vosk service directly with different URLs
const fetch = require('node-fetch');

async function testVoskUrls() {
  const urls = [
    'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app',
    'https://vosk-transcription-466315-uc.a.run.app',
    'https://vosk-transcription-involuted-river-466315-p0-uc.a.run.app'
  ];
  
  for (const url of urls) {
    console.log(`\n🔍 Testing: ${url}`);
    
    try {
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log(`✅ SUCCESS: ${response.status} - ${text}`);
        console.log(`📝 Working URL: ${url}`);
        return url;
      } else {
        console.log(`❌ Failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ No working Vosk URLs found');
  return null;
}

testVoskUrls();
