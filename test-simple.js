console.log('Testing Railway worker...');

const https = require('https');

const url = 'https://lavish-surprise-production.up.railway.app/health';

https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
