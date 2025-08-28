// Test the local ingestion API which calls the Firebase Function
const fetch = require('node-fetch');

async function testLocalIngestion() {
  console.log('Testing local ingestion API...');
  
  const testData = {
    id: 'test-local-123',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    postId: 'post-local-123',
    sourceType: 'youtube'
  };

  try {
    const response = await fetch('http://localhost:3005/api/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData),
      timeout: 60000
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response:', responseText);
    
    try {
      const parsed = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response is not valid JSON');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testLocalIngestion();
