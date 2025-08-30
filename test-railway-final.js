const https = require('https');

async function testRailwayService() {
  console.log('🔍 Testing Railway deployment status...\n');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'satisfied-commitment-copy-production.up.railway.app',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Railway-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`📊 HTTP Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        console.log(`📄 Response Length: ${data.length} bytes\n`);
        
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (json.message && json.message.includes('Video Ingestion Service')) {
              console.log('✅ SUCCESS: Node.js Video Ingestion Service is running!');
              console.log(`   Message: ${json.message}`);
              console.log(`   Status: ${json.status}`);
              resolve('nodejs');
            } else {
              console.log('⚠️  Unknown JSON response format');
              console.log(`   Response: ${JSON.stringify(json, null, 2)}`);
              resolve('unknown');
            }
          } catch (e) {
            // Check for Python service indicators
            if (data.includes('INFO:main:') || data.includes('uvicorn') || data.includes('FastAPI')) {
              console.log('❌ ISSUE: Python service still running');
              console.log('   Railway is still using the old Python deployment');
              resolve('python');
            } else {
              console.log('⚠️  Non-JSON response received');
              console.log(`   First 200 chars: ${data.substring(0, 200)}`);
              resolve('unknown');
            }
          }
        } else if (res.statusCode === 404) {
          console.log('❌ ERROR: Service not found (404)');
          console.log('   Railway deployment may have failed');
          resolve('error');
        } else {
          console.log(`❌ ERROR: HTTP ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 200)}`);
          resolve('error');
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ NETWORK ERROR:', err.message);
      console.log('   Possible causes:');
      console.log('   - Railway service is down');
      console.log('   - Deployment in progress');
      console.log('   - DNS/connectivity issues');
      reject(err);
    });

    req.setTimeout(20000, () => {
      console.log('⏱️  TIMEOUT: No response after 20 seconds');
      console.log('   This suggests Railway deployment is still in progress');
      req.destroy();
      resolve('timeout');
    });

    req.end();
  });
}

// Run the test
testRailwayService()
  .then(result => {
    console.log(`\n🏁 Test Result: ${result}`);
    
    if (result === 'nodejs') {
      console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
      console.log('   The Dockerfile fix worked - Node.js service is running');
      console.log('   Ready to test Firebase Storage uploads');
    } else if (result === 'python') {
      console.log('\n❌ DEPLOYMENT ISSUE PERSISTS');
      console.log('   Railway is still running Python service');
      console.log('   May need to check Railway dashboard or try alternative approaches');
    } else if (result === 'timeout') {
      console.log('\n⏳ DEPLOYMENT IN PROGRESS');
      console.log('   Railway may still be building with the new Dockerfile');
      console.log('   Try testing again in a few minutes');
    }
  })
  .catch(err => {
    console.log('\n❌ TEST FAILED');
    console.log(`   Error: ${err.message}`);
  });
