const https = require('https');

console.log('Testing simple Firebase Function request...');

const options = {
  hostname: 'us-central1-involuted-river-466315-p0.cloudfunctions.net',
  port: 443,
  path: '/fullWorker/health',
  method: 'GET',
  timeout: 10000
};

const req = https.request(options, (res) => {
  console.log('Health check - Status Code:', res.statusCode);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Health check response:', body);
    
    // Now test the ingest endpoint
    testIngest();
  });
});

req.on('error', (e) => {
  console.error('Health check error:', e.message);
});

req.on('timeout', () => {
  console.error('Health check timeout');
  req.destroy();
});

req.end();

function testIngest() {
  console.log('\nTesting ingest endpoint...');
  
  const testData = {
    id: 'test-123',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    postId: 'post-123',
    sourceType: 'youtube',
    callbackUrl: 'https://example.com/callback',
    callbackSecret: 'callback-secret'
  };

  const data = JSON.stringify(testData);

  const ingestOptions = {
    hostname: 'us-central1-involuted-river-466315-p0.cloudfunctions.net',
    port: 443,
    path: '/fullWorker/ingest',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': 'dev_ingest_secret',
      'Content-Length': data.length
    },
    timeout: 30000
  };

  const ingestReq = https.request(ingestOptions, (res) => {
    console.log('Ingest - Status Code:', res.statusCode);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('Ingest response:', body);
      
      try {
        const parsed = JSON.parse(body);
        console.log('Parsed response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Response is not valid JSON');
      }
    });
  });

  ingestReq.on('error', (e) => {
    console.error('Ingest error:', e.message);
  });

  ingestReq.on('timeout', () => {
    console.error('Ingest timeout');
    ingestReq.destroy();
  });

  ingestReq.write(data);
  ingestReq.end();
}
