const https = require('https');

console.log('Testing Railway service...');

const req = https.get('https://satisfied-commitment-copy-production.up.railway.app/', {
  timeout: 8000
}, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data.substring(0, 200));
    
    if (data.includes('Video Ingestion Service')) {
      console.log('✅ Node.js service running');
    } else if (data.includes('INFO:main:')) {
      console.log('❌ Python service still active');
    } else {
      console.log('⚠️ Unknown response');
    }
    process.exit(0);
  });
});

req.on('error', err => {
  console.log('❌ Error:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('⏱️ Timeout - deployment may be in progress');
  req.destroy();
  process.exit(1);
});
