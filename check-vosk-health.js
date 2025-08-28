const https = require('https');

const VOSK_URL = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app/health';

console.log('Checking Vosk service health...');
console.log('URL:', VOSK_URL);

const req = https.get(VOSK_URL, {
  timeout: 10000
}, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Vosk service is HEALTHY and ready');
    } else {
      console.log('❌ Vosk service returned non-200 status');
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Vosk service is DOWN or unreachable');
  console.log('Error:', error.message);
});

req.on('timeout', () => {
  console.log('❌ Vosk service request timed out');
  req.destroy();
});
