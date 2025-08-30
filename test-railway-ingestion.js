const https = require('https');

const SERVICE_URL = 'https://satisfied-commitment-copy-production.up.railway.app';
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - short video for testing

console.log('Testing Railway ingestion service...');
console.log('Service URL:', SERVICE_URL);
console.log('Test Video URL:', TEST_VIDEO_URL);

// First test health endpoint
function testHealth() {
  return new Promise((resolve, reject) => {
    console.log('\n1. Testing /health endpoint...');
    
    const req = https.get(`${SERVICE_URL}/health`, {
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Health Status: ${res.statusCode}`);
        console.log(`Health Response: ${data}`);
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Health check failed:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('❌ Health check timed out');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Test ingestion endpoint
function testIngestion() {
  return new Promise((resolve, reject) => {
    console.log('\n2. Testing /ingest endpoint...');
    
    const postData = JSON.stringify({
      url: TEST_VIDEO_URL,
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
        'x-worker-secret': 'dev_ingest_secret' // Using dev secret for testing
      },
      timeout: 30000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Ingestion Status: ${res.statusCode}`);
        console.log(`Ingestion Response: ${data}`);
        
        try {
          const response = JSON.parse(data);
          if (response.job_id) {
            console.log(`✅ Job created: ${response.job_id}`);
            resolve(response.job_id);
          } else {
            console.log('❌ No job_id in response');
            resolve(null);
          }
        } catch (e) {
          console.log('❌ Invalid JSON response');
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Ingestion failed:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('❌ Ingestion request timed out');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Check job status
function checkJobStatus(jobId) {
  return new Promise((resolve, reject) => {
    console.log(`\n3. Checking job status for: ${jobId}`);
    
    const req = https.get(`${SERVICE_URL}/jobs/${jobId}`, {
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Status Check: ${res.statusCode}`);
        console.log(`Status Response: ${data}`);
        
        try {
          const response = JSON.parse(data);
          console.log(`Job Status: ${response.status}`);
          
          if (response.result && response.result.media_url) {
            console.log(`Media URL: ${response.result.media_url}`);
            
            // Check if it's a Firebase Storage URL
            if (response.result.media_url.includes('storage.googleapis.com')) {
              console.log('✅ SUCCESS: Firebase Storage URL returned!');
            } else if (response.result.media_url.includes('googlevideo.com')) {
              console.log('❌ ISSUE: Still returning Google Video URL');
            } else {
              console.log('⚠️  Unknown URL format');
            }
          }
          
          resolve(response);
        } catch (e) {
          console.log('❌ Invalid JSON response');
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Status check failed:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('❌ Status check timed out');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Run tests
async function runTests() {
  try {
    // Test health
    const healthOk = await testHealth();
    if (!healthOk) {
      console.log('❌ Health check failed, aborting tests');
      return;
    }
    
    // Test ingestion
    const jobId = await testIngestion();
    if (!jobId) {
      console.log('❌ Ingestion failed, aborting status check');
      return;
    }
    
    // Wait a bit for processing
    console.log('\nWaiting 5 seconds for initial processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check status multiple times
    for (let i = 0; i < 5; i++) {
      const status = await checkJobStatus(jobId);
      
      if (status && status.status === 'completed') {
        console.log('\n✅ Job completed successfully!');
        break;
      } else if (status && status.status === 'failed') {
        console.log('\n❌ Job failed');
        break;
      } else {
        console.log(`Job still processing... (attempt ${i + 1}/5)`);
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
  }
}

runTests();
