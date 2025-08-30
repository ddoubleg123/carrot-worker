const https = require('https');

// Test if Node.js worker is running (should return Node.js response, not Python)
function testServiceType() {
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
        console.log(`✅ Service Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        
        // Check if it's Node.js (should contain "Node.js" or similar) vs Python (Flask)
        if (data.includes('Node.js') || data.includes('Express')) {
          console.log('🟢 Node.js worker detected!');
        } else if (data.includes('Flask') || data.includes('Python')) {
          console.log('🔴 Still running Python worker');
        } else {
          console.log('❓ Unknown service type');
        }
        
        resolve({ status: res.statusCode, data });
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

// Create test ingestion job
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
        console.log(`\n📤 Ingest Status: ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 202) {
          try {
            const response = JSON.parse(data);
            console.log(`✅ Job ID: ${response.job_id}`);
            console.log(`Status: ${response.status}`);
            resolve(response);
          } catch (e) {
            console.log(`Raw response: ${data}`);
            reject(new Error(`Invalid JSON: ${data}`));
          }
        } else {
          console.log(`❌ Error response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ingest request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function testDeployment() {
  console.log('🚀 Testing Railway Deployment After Redeploy\n');
  
  try {
    // Test service type
    await testServiceType();
    
    // Create test job
    console.log('\n📤 Creating test ingestion job...');
    await createTestJob();
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check Railway logs for Firebase initialization messages');
    console.log('2. Look for logs starting with "[ingest]" instead of "INFO:main:"');
    console.log('3. Verify Firebase Storage "ingest/" folder appears');
    console.log('4. Check database for posts with populated mediaUrl');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testDeployment();
