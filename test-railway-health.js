const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-production-c529.up.railway.app';

console.log('Checking Railway service health...');
console.log('Service URL:', SERVICE_URL);

function testHealth() {
  return new Promise((resolve, reject) => {
    const req = https.get(`${SERVICE_URL}/health`, {
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
          console.log(' Railway service is HEALTHY and ready');
          resolve();
        } else {
          console.log(' Railway service returned non-200 status');
          reject();
        }
      });
    });

    req.on('error', (error) => {
      console.log(' Railway service is DOWN or unreachable');
      console.log('Error:', error.message);
      reject();
    });

    req.on('timeout', () => {
      console.log(' Railway service request timed out');
      req.destroy();
      reject();
    });
  });
}

testHealth();
