const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-copy-production.up.railway.app';

// Test videos that are less likely to trigger bot detection
const TEST_VIDEOS = [
  'https://www.youtube.com/watch?v=9bZkp7q19f0', // PSY - Gangnam Style (very popular, less restricted)
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // Luis Fonsi - Despacito (very popular)
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody (classic, widely available)
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up (meme, widely available)
  'https://www.youtube.com/watch?v=L_jWHffIx5E', // Smash Mouth - All Star (popular meme song)
];

async function testVideoIngestion(videoUrl) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: videoUrl,
      callback_url: 'https://example.com/callback'
    });
    
    const options = {
      hostname: 'satisfied-commitment-copy-production.up.railway.app',
      port: 443,
      path: '/ingest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-worker-secret': 'dev_ingest_secret'
      },
      timeout: 30000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 202) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (e) {
            reject(new Error(`Invalid JSON: ${data}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function testUnrestrictedVideos() {
  console.log('Testing popular YouTube videos less likely to trigger bot detection...\n');
  
  for (let i = 0; i < TEST_VIDEOS.length; i++) {
    const videoUrl = TEST_VIDEOS[i];
    console.log(`${i + 1}. Testing: ${videoUrl}`);
    
    try {
      const response = await testVideoIngestion(videoUrl);
      console.log(`   ✅ Job created: ${response.job_id}`);
      console.log(`   Status: ${response.status}`);
      
      // Only test one at a time to avoid overwhelming
      console.log('   Wait 30 seconds then check Railway logs for this job result.');
      console.log('   If successful, the enhanced client cycling is working!');
      break; // Test one video at a time
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\nAfter deployment, these popular videos should have higher success rates.');
}

testUnrestrictedVideos();
