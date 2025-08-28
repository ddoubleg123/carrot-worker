const https = require('https');

// Debug Firebase Function deployment and routing
const debugFunction = async () => {
  const baseUrl = 'us-central1-involuted-river-466315.cloudfunctions.net';
  const functionName = 'fullWorker';
  
  console.log('=== Firebase Function Debug ===\n');
  
  // Test direct function URL
  console.log('Testing function URL structure...');
  console.log(`Expected URL: https://${baseUrl}/${functionName}`);
  console.log(`Ingest endpoint: https://${baseUrl}/${functionName}/ingest\n`);
  
  // Test 1: Function exists check
  console.log('1. Testing if function exists...');
  try {
    const response = await makeRequest({
      hostname: baseUrl,
      path: `/${functionName}`,
      method: 'GET',
      timeout: 15000
    });
    console.log(`   Status: ${response.status}`);
    if (response.status === 200) {
      console.log(`   Response: ${response.body.substring(0, 300)}`);
    } else {
      console.log(`   Error body: ${response.body}`);
    }
  } catch (err) {
    console.log(`   Connection error: ${err.message}`);
  }
  
  console.log('\n2. Testing ingest endpoint directly...');
  try {
    const testData = JSON.stringify({
      url: 'https://www.youtube.com/watch?v=test',
      postId: 'debug-test'
    });
    
    const response = await makeRequest({
      hostname: baseUrl,
      path: `/${functionName}/ingest`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': 'dev_ingest_secret',
        'Content-Length': Buffer.byteLength(testData).toString()
      },
      timeout: 15000
    }, testData);
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${response.body.substring(0, 500)}`);
    
  } catch (err) {
    console.log(`   Connection error: ${err.message}`);
  }
  
  console.log('\n3. Testing without authentication...');
  try {
    const response = await makeRequest({
      hostname: baseUrl,
      path: `/${functionName}/ingest`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }, '{}');
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${response.body}`);
    
  } catch (err) {
    console.log(`   Connection error: ${err.message}`);
  }
  
  console.log('\n=== Debug Complete ===');
};

const makeRequest = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          body, 
          headers: res.headers 
        });
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) req.write(data);
    req.end();
  });
};

debugFunction().catch(console.error);
