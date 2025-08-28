const https = require('https');

// Test Firebase Function endpoints directly
const testEndpoints = async () => {
  const baseUrl = 'us-central1-involuted-river-466315.cloudfunctions.net';
  const functionName = 'fullWorker';
  
  console.log('=== Firebase Function Endpoint Tests ===\n');
  
  // Test 1: Root endpoint
  console.log('1. Testing root endpoint...');
  try {
    const rootResult = await makeRequest({
      hostname: baseUrl,
      path: `/${functionName}`,
      method: 'GET',
      timeout: 10000
    });
    console.log(`   Status: ${rootResult.status}`);
    console.log(`   Body: ${rootResult.body.substring(0, 200)}\n`);
  } catch (err) {
    console.log(`   ERROR: ${err.message}\n`);
  }
  
  // Test 2: Health endpoint
  console.log('2. Testing health endpoint...');
  try {
    const healthResult = await makeRequest({
      hostname: baseUrl,
      path: `/${functionName}/health`,
      method: 'GET',
      timeout: 10000
    });
    console.log(`   Status: ${healthResult.status}`);
    console.log(`   Body: ${healthResult.body.substring(0, 200)}\n`);
  } catch (err) {
    console.log(`   ERROR: ${err.message}\n`);
  }
  
  // Test 3: Ingest endpoint (without auth)
  console.log('3. Testing ingest endpoint (no auth)...');
  try {
    const ingestResult = await makeRequest({
      hostname: baseUrl,
      path: `/${functionName}/ingest`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '2'
      },
      timeout: 10000
    }, '{}');
    console.log(`   Status: ${ingestResult.status}`);
    console.log(`   Body: ${ingestResult.body.substring(0, 200)}\n`);
  } catch (err) {
    console.log(`   ERROR: ${err.message}\n`);
  }
  
  // Test 4: Ingest endpoint (with auth)
  console.log('4. Testing ingest endpoint (with auth)...');
  const testPayload = JSON.stringify({
    url: 'https://www.youtube.com/watch?v=QRsmcE3DKT0',
    postId: 'test123'
  });
  
  try {
    const ingestAuthResult = await makeRequest({
      hostname: baseUrl,
      path: `/${functionName}/ingest`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': 'dev_ingest_secret',
        'Content-Length': Buffer.byteLength(testPayload).toString()
      },
      timeout: 10000
    }, testPayload);
    console.log(`   Status: ${ingestAuthResult.status}`);
    console.log(`   Body: ${ingestAuthResult.body.substring(0, 200)}\n`);
  } catch (err) {
    console.log(`   ERROR: ${err.message}\n`);
  }
  
  console.log('=== Test Complete ===');
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

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) req.write(data);
    req.end();
  });
};

testEndpoints().catch(console.error);
