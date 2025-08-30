const https = require('https');

const options = {
  hostname: 'satisfied-commitment-copy-production.up.railway.app',
  port: 443,
  path: '/',
  method: 'GET',
  timeout: 5000
};

console.log('Testing Railway service...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response received:', data.length, 'bytes');
    
    if (res.statusCode === 200) {
      if (data.includes('Video Ingestion Service')) {
        console.log('✅ Node.js service is running');
      } else if (data.includes('INFO:main:') || data.includes('uvicorn')) {
        console.log('❌ Python service still active');
      } else {
        console.log('⚠️ Unknown service type');
        console.log('First 100 chars:', data.substring(0, 100));
      }
    } else {
      console.log('❌ HTTP error:', res.statusCode);
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Request failed:', err.code || err.message);
});

req.on('timeout', () => {
  console.log('⏱️ Request timeout - service may be deploying');
  req.destroy();
});

req.end();
