const https = require('https');

const RAILWAY_URL = 'https://satisfied-commitment-production.up.railway.app';

console.log('Testing Railway service basic connectivity...');
console.log('URL:', RAILWAY_URL);

// Test basic connectivity without specific endpoint
const req = https.get(RAILWAY_URL, {
  timeout: 15000
}, (res) => {
  console.log(' Railway service is reachable!');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response Body:', data);
  });
});

req.on('error', (error) => {
  console.log(' Railway service connection failed');
  console.log('Error:', error.message);
  console.log('Error Code:', error.code);
});

req.on('timeout', () => {
  console.log(' Railway service request timed out (15s)');
  req.destroy();
});

const url = 'https://satisfied-commitment-copy-production.up.railway.app/';

console.log(' Testing Railway service deployment...');
console.log('URL:', url);

const req2 = https.get(url, (res) => {
  console.log(`\n Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(' Response Body:', data);
    
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        if (json.message && json.status) {
          console.log('\n SUCCESS: Node.js video ingestion service is running!');
          console.log('   Message:', json.message);
          console.log('   Status:', json.status);
        } else {
          console.log('\n WARNING: Unexpected JSON format');
          console.log('   Expected: {message, status}');
          console.log('   Got:', json);
        }
      } catch (e) {
        console.log('\n WARNING: Non-JSON response');
        console.log('   This might indicate Python service is still running');
        console.log('   Raw response:', data.substring(0, 200));
      }
    } else if (res.statusCode === 404) {
      console.log('\n ERROR: Service not found (404)');
    } else {
      console.log(`\n ERROR: HTTP ${res.statusCode}`);
    }
  });
});

req2.on('error', (err) => {
  console.error('\n NETWORK ERROR:', err.message);
  console.error('   This could indicate:');
  console.error('   - Service is down');
  console.error('   - DNS resolution failed');
  console.error('   - Network connectivity issues');
});

req2.setTimeout(15000, () => {
  console.error('\n TIMEOUT: Request took longer than 15 seconds');
  console.error('   This could indicate:');
  console.error('   - Service is starting up (cold start)');
  console.error('   - Service is overloaded');
  console.error('   - Network latency issues');
  req2.destroy();
});
