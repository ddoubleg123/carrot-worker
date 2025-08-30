const https = require('https');

console.log('Testing Railway service...');

const options = {
  hostname: 'satisfied-commitment-copy-production.up.railway.app',
  port: 443,
  path: '/',
  method: 'GET',
  timeout: 10000
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
    
    if (data.includes('Video Ingestion Service')) {
      console.log('✅ Node.js service detected!');
    } else if (data.includes('INFO:main:') || data.includes('uvicorn')) {
      console.log('❌ Python service still running');
    } else {
      console.log('⚠️ Unknown service type');
    }
  });
});

req.on('error', err => {
  console.error('Error:', err.message);
});

req.on('timeout', () => {
  console.log('Timeout - service may be starting');
  req.destroy();
});

req.end();
