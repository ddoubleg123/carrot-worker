const https = require('https');

// Test Firebase Function directly
const testFunction = async () => {
  console.log('Testing Firebase Function...');
  
  // Test health endpoint
  const healthOptions = {
    hostname: 'us-central1-involuted-river-466315.cloudfunctions.net',
    path: '/fullWorker/health',
    method: 'GET',
    timeout: 5000
  };

  try {
    const healthResult = await makeRequest(healthOptions);
    console.log('Health check:', healthResult.status, healthResult.body);
  } catch (err) {
    console.error('Health check failed:', err.message);
  }

  // Test ingest endpoint
  const ingestData = JSON.stringify({
    url: 'https://www.youtube.com/watch?v=QRsmcE3DKT0',
    postId: 'test123'
  });

  const ingestOptions = {
    hostname: 'us-central1-involuted-river-466315.cloudfunctions.net',
    path: '/fullWorker/ingest',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': process.env.INGEST_WORKER_SECRET || 'dev_ingest_secret',
      'Content-Length': Buffer.byteLength(ingestData)
    },
    timeout: 5000
  };

  try {
    const ingestResult = await makeRequest(ingestOptions, ingestData);
    console.log('Ingest test:', ingestResult.status, ingestResult.body);
  } catch (err) {
    console.error('Ingest test failed:', err.message);
  }
};

const makeRequest = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body, headers: res.headers });
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

testFunction();
