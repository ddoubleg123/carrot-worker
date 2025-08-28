const http = require('http');

// Simple test for the transcription API
const testAPI = () => {
  console.log('🧪 Testing transcription API on localhost:3005...');
  
  // Test GET request first
  const getOptions = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/transcribe?postId=test-123',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 5000
  };
  
  const getReq = http.request(getOptions, (res) => {
    console.log(`✅ GET Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ GET Response:', data);
      
      // Now test POST request
      testPOST();
    });
  });
  
  getReq.on('error', (error) => {
    console.error('❌ GET Request failed:', error.message);
    process.exit(1);
  });
  
  getReq.on('timeout', () => {
    console.error('❌ GET Request timed out');
    getReq.destroy();
    process.exit(1);
  });
  
  getReq.end();
};

const testPOST = () => {
  console.log('\n🧪 Testing POST transcription...');
  
  const postData = JSON.stringify({
    postId: 'test-post-' + Date.now(),
    audioUrl: 'https://example.com/test-audio.mp3',
    mediaType: 'audio'
  });
  
  const postOptions = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/transcribe',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 10000
  };
  
  const postReq = http.request(postOptions, (res) => {
    console.log(`✅ POST Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ POST Response:', data);
      console.log('\n🎉 API tests completed!');
      process.exit(0);
    });
  });
  
  postReq.on('error', (error) => {
    console.error('❌ POST Request failed:', error.message);
    process.exit(1);
  });
  
  postReq.on('timeout', () => {
    console.error('❌ POST Request timed out');
    postReq.destroy();
    process.exit(1);
  });
  
  postReq.write(postData);
  postReq.end();
};

// Start the test
testAPI();
