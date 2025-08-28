const https = require('https');

console.log('Direct test of Firebase Function...');

const testData = {
  id: 'test-direct-123',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  postId: 'post-direct-123',
  sourceType: 'youtube',
  callbackUrl: 'https://example.com/callback',
  callbackSecret: 'callback-secret'
};

const data = JSON.stringify(testData);

const options = {
  hostname: 'us-central1-involuted-river-466315-p0.cloudfunctions.net',
  port: 443,
  path: '/fullWorker/ingest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-worker-secret': 'dev_ingest_secret',
    'Content-Length': data.length
  },
  timeout: 120000 // 2 minutes
};

console.log('Sending request at:', new Date().toISOString());

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Response Headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
    process.stdout.write('.');
  });
  
  res.on('end', () => {
    console.log('\nResponse received at:', new Date().toISOString());
    console.log('Full Response Body:', body);
    
    try {
      const parsed = JSON.parse(body);
      console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response is not valid JSON');
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.on('timeout', () => {
  console.error('Request Timeout after 2 minutes');
  req.destroy();
});

req.write(data);
req.end();

console.log('Request sent, waiting for response...');
