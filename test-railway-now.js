const https = require('https');

console.log('Testing Railway service after successful deployment...');

const options = {
  hostname: 'satisfied-commitment-copy-production.up.railway.app',
  port: 443,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

const req = https.request(options, (res) => {
  console.log(`\n✅ Connection successful!`);
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`🔗 Headers:`, Object.keys(res.headers).join(', '));
  
  let data = '';
  res.on('data', chunk => data += chunk);
  
  res.on('end', () => {
    console.log(`📄 Response length: ${data.length} bytes\n`);
    
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        if (json.message && json.message.includes('Video Ingestion Service')) {
          console.log('🎉 SUCCESS: Node.js Video Ingestion Service is running!');
          console.log(`   Message: "${json.message}"`);
          console.log(`   Status: "${json.status}"`);
          console.log('\n✅ The Dockerfile fix worked - Railway is now running Node.js!');
        } else {
          console.log('⚠️  Unexpected JSON response:');
          console.log(JSON.stringify(json, null, 2));
        }
      } catch (e) {
        if (data.includes('INFO:main:') || data.includes('uvicorn') || data.includes('FastAPI')) {
          console.log('❌ ISSUE: Python service still running');
          console.log('   Raw response:', data.substring(0, 200));
        } else {
          console.log('⚠️  Non-JSON response received:');
          console.log(data.substring(0, 300));
        }
      }
    } else {
      console.log(`❌ HTTP Error: ${res.statusCode}`);
      console.log('Response:', data.substring(0, 200));
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Connection failed:', err.message);
  console.log('   Error code:', err.code);
});

req.setTimeout(15000, () => {
  console.log('⏱️  Request timeout after 15 seconds');
  req.destroy();
});

req.end();
