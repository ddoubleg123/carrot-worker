const https = require('https');

const RAILWAY_URL = 'https://satisfied-commitment-production.up.railway.app';

console.log('Testing Railway service basic connectivity...');
console.log('URL:', RAILWAY_URL);

// Test basic connectivity without specific endpoint
const req = https.get(RAILWAY_URL, {
  timeout: 15000
}, (res) => {
  console.log('✅ Railway service is reachable!');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response Body:', data);
  });
});

req.on('error', (error) => {
  console.log('❌ Railway service connection failed');
  console.log('Error:', error.message);
  console.log('Error Code:', error.code);
});

req.on('timeout', () => {
  console.log('❌ Railway service request timed out (15s)');
  req.destroy();
});
