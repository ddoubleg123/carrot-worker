// Test transcription trigger manually
const fetch = require('node-fetch');

async function testTranscription() {
  try {
    console.log('🧪 Testing transcription trigger...');
    
    // Test with a sample post ID and audio URL
    const testData = {
      postId: 'test_post_123',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' // Sample audio file
    };
    
    const response = await fetch('http://localhost:3005/api/audio/trigger-transcription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Transcription trigger successful');
    } else {
      console.log('❌ Transcription trigger failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTranscription();
