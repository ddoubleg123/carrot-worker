const https = require('https');

// Debug script to test Firebase Storage upload and check for errors
// This will help identify why videos aren't uploading to Firebase Storage

async function testVideoIngestionWithDebug(videoUrl) {
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

async function checkJobStatus(jobId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'satisfied-commitment-copy-production.up.railway.app',
      port: 443,
      path: `/jobs/${jobId}`,
      method: 'GET',
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
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
    
    req.end();
  });
}

async function debugFirebaseStorageIssue() {
  console.log('🔍 Debugging Firebase Storage upload issue...\n');
  
  // Test with a short video
  const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // Me at the zoo - 19 seconds
  
  console.log('1. Creating ingestion job...');
  try {
    const response = await testVideoIngestionWithDebug(testUrl);
    console.log(`   ✅ Job created: ${response.job_id}`);
    console.log(`   Status: ${response.status}\n`);
    
    console.log('2. Waiting for processing (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('3. Checking job status...');
    const jobStatus = await checkJobStatus(response.job_id);
    console.log('   Job Status:', JSON.stringify(jobStatus, null, 2));
    
    console.log('\n🔍 Key things to check in Railway logs:');
    console.log('   - Look for "[ingest] Upload configuration check:" logs');
    console.log('   - Check if FIREBASE_STORAGE_BUCKET is set');
    console.log('   - Look for Firebase Storage upload errors');
    console.log('   - Check if mediaUrl is generated correctly');
    console.log('   - Verify callback completion with mediaUrl');
    
    if (jobStatus.status === 'completed' && jobStatus.mediaUrl) {
      console.log(`\n✅ SUCCESS: Video uploaded to ${jobStatus.mediaUrl}`);
    } else if (jobStatus.status === 'completed' && !jobStatus.mediaUrl) {
      console.log('\n❌ ISSUE: Job completed but no mediaUrl - Firebase Storage upload likely failed');
    } else if (jobStatus.status === 'failed') {
      console.log(`\n❌ FAILED: ${jobStatus.error}`);
    } else {
      console.log(`\n⏳ Status: ${jobStatus.status} (${jobStatus.progress}%)`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

console.log('This script will help identify Firebase Storage upload issues.');
console.log('Check Railway logs for detailed error messages during upload phase.\n');

debugFirebaseStorageIssue();
