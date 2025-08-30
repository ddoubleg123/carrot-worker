const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-copy-production.up.railway.app';

const ENDPOINTS_TO_TEST = [
  '/',
  '/health',
  '/healthz',
  '/livez', 
  '/readyz',
  '/tools',
  '/ingest/test',
  '/routes'
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const req = https.get(`${SERVICE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data.slice(0, 200) // First 200 chars
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        status: 'ERROR',
        error: error.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        path,
        status: 'TIMEOUT'
      });
    });
  });
}

async function testAllEndpoints() {
  console.log('Testing available endpoints on Railway service...\n');
  
  for (const endpoint of ENDPOINTS_TO_TEST) {
    console.log(`Testing ${endpoint}:`);
    const result = await testEndpoint(endpoint);
    
    if (result.status === 200) {
      console.log(`  ✅ ${result.status} - Available`);
      if (result.body) {
        console.log(`  Response: ${result.body}`);
      }
    } else if (result.status === 404) {
      console.log(`  ❌ ${result.status} - Not Found`);
    } else if (result.status === 'ERROR') {
      console.log(`  ❌ Error: ${result.error}`);
    } else {
      console.log(`  ⚠️  ${result.status}`);
      if (result.body) {
        console.log(`  Response: ${result.body}`);
      }
    }
    console.log('');
  }
}

testAllEndpoints();
