const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-copy-production.up.railway.app';

// Test videos that are less likely to trigger bot detection
const TEST_VIDEOS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo - first YouTube video
  'https://www.youtube.com/watch?v=hFZFjoX2cGg', // Dramatic Chipmunk - old viral video
  'https://www.youtube.com/watch?v=y6120QOlsfU', // Darude Sandstorm - old music video
  'https://www.youtube.com/watch?v=kffacxfA7G4', // Baby Shark - very popular, might work
];

async function testVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: videoUrl,
      type: 'youtube'
    });

    const options = {
      hostname: 'satisfied-commitment-copy-production.up.railway.app',
      port: 443,
      path: '/ingest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve(response.job_id);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function checkJobStatus(jobId) {
  return new Promise((resolve, reject) => {
    const req = https.get(`${SERVICE_URL}/status/${jobId}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
  });
}

async function testAllVideos() {
  console.log('Testing multiple videos to find one that works...\n');
  
  for (let i = 0; i < TEST_VIDEOS.length; i++) {
    const videoUrl = TEST_VIDEOS[i];
    console.log(`${i + 1}. Testing: ${videoUrl}`);
    
    try {
      const jobId = await testVideo(videoUrl);
      console.log(`   Job created: ${jobId}`);
      
      // Wait a bit then check status
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      const status = await checkJobStatus(jobId);
      console.log(`   Status: ${status.status}`);
      
      if (status.status === 'completed') {
        console.log(`   ✅ SUCCESS! Video processed successfully`);
        console.log(`   Result:`, status.result);
        return;
      } else if (status.status === 'failed') {
        console.log(`   ❌ Failed: ${status.error}`);
      } else {
        console.log(`   ⏳ Still processing: ${status.status} (${status.progress}%)`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('All test videos completed. Check results above.');
}

testAllVideos();
