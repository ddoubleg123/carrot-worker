const https = require('https');

const workerUrl = 'https://satisfied-commitment-production.up.railway.app';

console.log('Testing Railway debug endpoints...');

// Test debug endpoint
https.get(`${workerUrl}/debug`, (res) => {
  console.log('Debug endpoint status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Debug response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Debug response (raw):', data);
    }
  });
}).on('error', (err) => {
  console.error('Debug test failed:', err.message);
});

// Test routes endpoint
setTimeout(() => {
  https.get(`${workerUrl}/routes`, (res) => {
    console.log('\nRoutes endpoint status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Available routes:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Routes response (raw):', data);
      }
    });
  }).on('error', (err) => {
    console.error('Routes test failed:', err.message);
  });
}, 1000);
