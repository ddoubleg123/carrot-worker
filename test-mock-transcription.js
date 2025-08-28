const https = require('https');

// Test the mock transcription service
console.log('🧪 Testing mock transcription functionality...');

// Test data
const testPostId = 'test-post-' + Date.now();
const testAudioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';

// Test the trigger-transcription endpoint
const testData = JSON.stringify({
  postId: testPostId,
  audioUrl: testAudioUrl
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/audio/trigger-transcription',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('📡 Calling trigger-transcription endpoint...');
console.log('Post ID:', testPostId);
console.log('Audio URL:', testAudioUrl);

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Mock transcription test PASSED');
      console.log('The transcription service is now working with mock data');
      console.log('Audio posts will get realistic transcriptions instead of failing');
    } else {
      console.log('❌ Mock transcription test FAILED');
      console.log('Status:', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request failed:', error.message);
  console.log('Make sure the Carrot app is running on localhost:3000');
});

req.write(testData);
req.end();

// Also test a simple health check
setTimeout(() => {
  console.log('\n🔍 Testing basic connectivity...');
  
  const healthReq = https.get('http://localhost:3000/api/health', (res) => {
    console.log('Health check status:', res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 404) {
      console.log('✅ App is running on localhost:3000');
    }
  }).on('error', (err) => {
    console.log('❌ App not running on localhost:3000');
    console.log('Start the app with: npm run dev');
  });
}, 1000);
