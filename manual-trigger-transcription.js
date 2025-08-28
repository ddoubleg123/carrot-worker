const http = require('http');

// Manually trigger transcription for the stuck post
const postId = 'cmesymu0t00054s98wnya4ae5';
const videoUrl = 'https://example.com/video.mp4'; // Replace with actual video URL if known

const postData = JSON.stringify({
  postId: postId,
  audioUrl: videoUrl // API expects audioUrl even for video
});

const options = {
  hostname: 'localhost',
  port: 3005,
  path: '/api/audio/trigger-transcription',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`🔧 Manually triggering transcription for post: ${postId}`);
console.log(`📡 Calling: http://localhost:3005/api/audio/trigger-transcription`);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Transcription triggered successfully');
      console.log('Check the post again - it should now have transcription text');
    } else {
      console.log('❌ Failed to trigger transcription');
      console.log('Make sure the Carrot app is running on localhost:3005');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('Make sure the Carrot app is running on localhost:3005');
});

req.write(postData);
req.end();
