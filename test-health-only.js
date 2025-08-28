const https = require('https');

console.log('Testing Firebase Function health endpoint only...');

const options = {
  hostname: 'us-central1-involuted-river-466315-p0.cloudfunctions.net',
  port: 443,
  path: '/fullWorker/health',
  method: 'GET',
  timeout: 5000
};

const req = https.request(options, (res) => {
  console.log('Health Status Code:', res.statusCode);
  console.log('Health Headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Health Response:', body);
    
    // Now test YouTube blocking
    testYouTubeBlocking();
  });
});

req.on('error', (e) => {
  console.error('Health Error:', e.message);
});

req.on('timeout', () => {
  console.error('Health Timeout');
  req.destroy();
});

req.end();

function testYouTubeBlocking() {
  console.log('\nTesting YouTube blocking...');
  
  const testData = {
    id: 'test-youtube-block',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    postId: 'post-youtube-block',
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
    timeout: 5000
  };

  const ingestReq = https.request(ingestOptions, (res) => {
    console.log('YouTube Block Test - Status Code:', res.statusCode);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('YouTube Block Response:', body);
      
      try {
        const parsed = JSON.parse(body);
        console.log('Parsed YouTube Block Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Response is not valid JSON');
      }
    });
  });

  ingestReq.on('error', (e) => {
    console.error('YouTube Block Test Error:', e.message);
  });

  ingestReq.on('timeout', () => {
    console.error('YouTube Block Test Timeout');
    ingestReq.destroy();
  });

  ingestReq.write(data);
  ingestReq.end();
}
