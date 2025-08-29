// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

async function testRailwayWorker() {
  // Get the Railway URL from your .env.local
  const workerUrl = 'https://satisfied-commitment-production.up.railway.app'; // Update this with your actual generated domain
  
  console.log('Testing Railway worker...');
  
  // Test health endpoint
  try {
    console.log('Testing /health endpoint...');
    const healthResponse = await fetch(`${workerUrl}/health`);
    console.log('Health check:', healthResponse.status, await healthResponse.text());
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
  
  // Test ingest endpoint with authentication
  try {
    console.log('Testing /ingest endpoint...');
    const ingestResponse = await fetch(`${workerUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': 'dev_ingest_secret' // Make sure this matches your worker secret
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
