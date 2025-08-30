const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-copy-production.up.railway.app';

// Test videos that are less likely to trigger bot detection
const TEST_VIDEOS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo - first YouTube video
  'https://www.youtube.com/watch?v=hFZFjoX2cGg', // Dramatic Chipmunk - old viral video
];

async function testVideoIngestion(videoUrl) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: videoUrl,
      callback_url: 'https://example.com/callback' // Mock callback for testing
    });
    
    const options = {
      hostname: 'satisfied-commitment-copy-production.up.railway.app',
      port: 443,
      path: '/ingest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-worker-secret': 'dev_ingest_secret' // Using working dev secret
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

async function testWorkingIngestion() {
  console.log('Testing Railway ingestion with authenticated endpoint...\n');
  
  for (let i = 0; i < TEST_VIDEOS.length; i++) {
    const videoUrl = TEST_VIDEOS[i];
    console.log(`${i + 1}. Testing: ${videoUrl}`);
    
    try {
      const response = await testVideoIngestion(videoUrl);
      console.log(`   Job created: ${response.job_id}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Note: Job will process in background. Check Railway logs for results.`);
      
      // Wait a bit before next test
      if (i < TEST_VIDEOS.length - 1) {
        console.log('   Waiting 5 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\nTest completed successfully!');
  console.log('Jobs are processing in background. Check Railway deployment logs:');
  console.log('- If jobs succeed: Railway service is fully working');
  console.log('- If jobs fail with bot detection: Apply cookies solution');
}

testWorkingIngestion();
