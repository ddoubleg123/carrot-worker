const fetch = require('node-fetch');

async function testRailwayWorker() {
  const workerUrl = 'https://lavish-surprise-production.up.railway.app';
  
  console.log('Testing Railway worker...');
  
  // Test health endpoint
  try {
    const healthResponse = await fetch(`${workerUrl}/health`);
    console.log('Health check:', healthResponse.status, await healthResponse.text());
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
  
  // Test ingest endpoint
  try {
    const ingestResponse = await fetch(`${workerUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userId: 'test-user'
      })
    });
    
    console.log('Ingest response status:', ingestResponse.status);
    const responseText = await ingestResponse.text();
    console.log('Ingest response body:', responseText);
    
    if (ingestResponse.ok) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(responseJson, null, 2));
      } catch (e) {
        console.log('Response is not JSON');
      }
    }
  } catch (error) {
    console.error('Ingest test failed:', error.message);
  }
}

testRailwayWorker();
