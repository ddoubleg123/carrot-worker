const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-copy-production.up.railway.app';

// Test videos that are less likely to trigger bot detection
const TEST_VIDEOS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo - first YouTube video
  'https://www.youtube.com/watch?v=hFZFjoX2cGg', // Dramatic Chipmunk - old viral video
];

async function testVideoSimple(videoUrl) {
  return new Promise((resolve, reject) => {
    const testUrl = `${SERVICE_URL}/ingest/test?url=${encodeURIComponent(videoUrl)}&type=youtube`;
    
    const req = https.get(testUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 202) {
          const response = JSON.parse(data);
          resolve(response);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
  });
}

async function testSimpleIngestion() {
  console.log('Testing Railway ingestion with simple test endpoint...\n');
  
  for (let i = 0; i < TEST_VIDEOS.length; i++) {
    const videoUrl = TEST_VIDEOS[i];
    console.log(`${i + 1}. Testing: ${videoUrl}`);
    
    try {
      const response = await testVideoSimple(videoUrl);
      console.log(`   ✅ Job accepted: ${response.jobId}`);
      console.log(`   Note: Job will process in background. Check Railway logs for results.`);
      
      // Wait a bit before next test
      if (i < TEST_VIDEOS.length - 1) {
        console.log('   Waiting 5 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\nTest completed. Check Railway deployment logs to see processing results.');
  console.log('If jobs fail with bot detection, apply the cookies solution.');
}

testSimpleIngestion();
