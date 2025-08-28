const fetch = require('node-fetch');

async function testVoskComprehensive() {
  const baseUrl = 'https://vosk-transcription-lnkmm5qvx3a-uc.a.run.app';
  
  console.log('🔍 Testing Vosk service comprehensively...\n');
  
  // Test 1: Health endpoint
  console.log('1. Testing /health endpoint...');
  try {
    const healthResponse = await fetch(`${baseUrl}/health`, { 
      method: 'GET',
      timeout: 10000 
    });
    
    if (healthResponse.ok) {
      const healthText = await healthResponse.text();
      console.log(`✅ Health: ${healthResponse.status} - ${healthText}`);
    } else {
      console.log(`❌ Health failed: ${healthResponse.status}`);
      const errorText = await healthResponse.text();
      console.log(`Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Health error: ${error.message}`);
  }
  
  // Test 2: Root endpoint
  console.log('\n2. Testing root endpoint...');
  try {
    const rootResponse = await fetch(`${baseUrl}/`, { 
      method: 'GET',
      timeout: 10000 
    });
    
    if (rootResponse.ok) {
      const rootText = await rootResponse.text();
      console.log(`✅ Root: ${rootResponse.status} - ${rootText.substring(0, 100)}...`);
    } else {
      console.log(`❌ Root failed: ${rootResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Root error: ${error.message}`);
  }
  
  // Test 3: Transcribe endpoint structure
  console.log('\n3. Testing /transcribe endpoint (without audio)...');
  try {
    const transcribeResponse = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId: 'test-health-check',
        audioUrl: 'invalid-url-for-testing'
      }),
      timeout: 15000
    });
    
    console.log(`Transcribe response: ${transcribeResponse.status}`);
    const transcribeText = await transcribeResponse.text();
    console.log(`Response body: ${transcribeText.substring(0, 200)}...`);
    
    if (transcribeResponse.status === 500 || transcribeResponse.status === 400) {
      console.log('✅ Transcribe endpoint exists (expected error with invalid URL)');
    } else if (transcribeResponse.ok) {
      console.log('✅ Transcribe endpoint working');
    } else {
      console.log('❌ Transcribe endpoint issue');
    }
    
  } catch (error) {
    console.log(`❌ Transcribe error: ${error.message}`);
  }
  
  console.log('\n📊 Service Status Summary:');
  console.log(`Service URL: ${baseUrl}`);
  console.log('Expected endpoints: /, /health, /transcribe');
}

testVoskComprehensive();
