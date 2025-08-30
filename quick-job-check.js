const https = require('https');

// First check if Railway service is responding
function checkRailwayStatus() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'satisfied-commitment-copy-production.up.railway.app',
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Railway Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 200)}...`);
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.error('Railway connection error:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Then create a simple ingestion job
function createTestJob() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
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
      timeout: 15000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\nIngest Status: ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 202) {
          try {
            const response = JSON.parse(data);
            console.log(`Job ID: ${response.job_id}`);
            console.log(`Status: ${response.status}`);
            resolve(response);
          } catch (e) {
            console.log(`Raw response: ${data}`);
            reject(new Error(`Invalid JSON: ${data}`));
          }
        } else {
          console.log(`Error response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Ingest request error:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ingest request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function quickCheck() {
  console.log('🚀 Quick Railway Service Check\n');
  
  try {
    // Check if service is up
    await checkRailwayStatus();
    
    // Try to create a job
    console.log('\n📤 Creating test ingestion job...');
    const jobResponse = await createTestJob();
    
    console.log('\n✅ Job created successfully!');
    console.log('💡 Check Railway logs to see if Firebase Storage upload works');
    console.log('💡 Look for logs like: "[ingest] Upload configuration check:" and "[ingest] Firebase Admin initialized"');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

quickCheck();
