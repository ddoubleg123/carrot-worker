const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-copy-production.up.railway.app';

console.log('Testing Railway root endpoint...');
console.log('Service URL:', SERVICE_URL);

function testRoot() {
  return new Promise((resolve, reject) => {
    const req = https.get(`${SERVICE_URL}/`, {
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
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log('Error:', error.message);
      reject();
    });

    req.on('timeout', () => {
      console.log('Request timed out');
      req.destroy();
      reject();
    });
  });
}

testRoot();
