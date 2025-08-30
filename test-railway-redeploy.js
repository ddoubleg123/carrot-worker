const https = require('https');

console.log('Testing Railway service after redeploy...');

const options = {
  hostname: 'satisfied-commitment-copy-production.up.railway.app',
  port: 443,
  path: '/',
  method: 'GET',
  timeout: 10000
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Response length: ${data.length} bytes`);
    
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        if (json.message && json.message.includes('Video Ingestion Service')) {
          console.log('✅ SUCCESS: Node.js Video Ingestion Service is running!');
          console.log(`   Message: "${json.message}"`);
          console.log(`   Status: "${json.status}"`);
          console.log('\n🎉 Railway is now running the Node.js service!');
        } else {
          console.log('⚠️ Unexpected JSON response:');
          console.log(JSON.stringify(json, null, 2));
        }
      } catch (e) {
        if (data.includes('INFO:') || data.includes('uvicorn')) {
          console.log('❌ Still running Python service');
          console.log('Raw response:', data.substring(0, 200));
        } else {
          console.log('⚠️ Non-JSON response:');
          console.log(data.substring(0, 200));
        }
      }
    } else {
      console.log(`❌ HTTP ${res.statusCode}`);
      console.log('Response:', data.substring(0, 200));
    }
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.log('❌ Connection failed:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('⏱️ Request timeout - service may still be starting');
  req.destroy();
  process.exit(1);
});

req.end();
