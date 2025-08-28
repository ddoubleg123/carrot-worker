const fetch = require('node-fetch');

async function testRailwayWorker() {
    const RAILWAY_URL = 'https://powerful-heart-production-6559.up.railway.app';
    const SECRET = 'dev_ingest_secret';
    
    console.log('Testing Railway worker directly...\n');
    
    try {
        // Test health endpoint
        console.log('1. Health check...');
        const healthRes = await fetch(`${RAILWAY_URL}/health`);
        const health = await healthRes.json();
        console.log('Health:', health);
        
        // Test root endpoint to see what's deployed
        console.log('\n2. Testing root endpoint...');
        const rootRes = await fetch(`${RAILWAY_URL}/`);
        const rootText = await rootRes.text();
        console.log('Root response:', rootText.substring(0, 200) + '...');
        
        // Test ingest endpoint with correct format
        console.log('\n3. Testing ingest with JSON...');
        const ingestRes = await fetch(`${RAILWAY_URL}/ingest`, {
            method: 'POST',
            headers: {
                'x-worker-secret': SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: 'test-job-123',
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                type: 'youtube'
            })
        });
        
        console.log('Ingest response status:', ingestRes.status);
        const ingestText = await ingestRes.text();
        console.log('Ingest response:', ingestText);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testRailwayWorker();
