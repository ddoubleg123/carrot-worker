const https = require('https');

const testData = {
  id: 'test-play-dl-123',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  postId: 'post-play-dl-123',
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
    'x-worker-secret': 'your-secret-here',
    'Content-Length': data.length
  },
  timeout: 60000
};

console.log('Testing play-dl implementation...');
console.log('URL:', testData.url);
console.log('Timestamp:', new Date().toISOString());

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', body);
    console.log('Request completed at:', new Date().toISOString());
    
    try {
      const parsed = JSON.parse(body);
      console.log('Parsed Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response is not valid JSON');
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.on('timeout', () => {
  console.error('Request Timeout after 60 seconds');
  req.destroy();
});

req.write(data);
req.end();
