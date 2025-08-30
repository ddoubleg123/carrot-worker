const https = require('https');

console.log('Testing Railway service status...');

const options = {
  hostname: 'satisfied-commitment-copy-production.up.railway.app',
  port: 443,
  path: '/',
  method: 'GET',
  timeout: 8000
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        console.log('✅ Node.js service running:');
        console.log(`   Message: ${json.message}`);
        console.log(`   Status: ${json.status}`);
      } catch (e) {
        console.log('⚠️ Non-JSON response:', data.substring(0, 100));
      }
    } else {
      console.log(`❌ HTTP ${res.statusCode}:`, data.substring(0, 100));
    }
    process.exit(0);
  });
});

req.on('error', err => {
  console.log('❌ Connection failed:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('⏱️ Timeout - service may be deploying');
  req.destroy();
  process.exit(1);
});

req.end();
