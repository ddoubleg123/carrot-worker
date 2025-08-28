const https = require('https');

const testFirebaseFunction = async () => {
  console.log('Testing Firebase Function health endpoint...');
  
  const options = {
    hostname: 'us-central1-involuted-river-466315.cloudfunctions.net',
    path: '/fullWorker/health',
    method: 'GET',
    timeout: 10000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error('Request timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

const testIngestEndpoint = async () => {
  console.log('\nTesting Firebase Function ingest endpoint...');
  
  const postData = JSON.stringify({
    url: 'https://www.youtube.com/watch?v=QRsmcE3DKT0',
    postId: 'test123'
  });

  const options = {
    hostname: 'us-central1-involuted-river-466315.cloudfunctions.net',
    path: '/fullWorker/ingest',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': 'dev_ingest_secret',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 10000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error('Request timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
};

// Run tests
(async () => {
  try {
    await testFirebaseFunction();
    await testIngestEndpoint();
  } catch (error) {
    console.error('Test failed:', error.message);
  }
})();
