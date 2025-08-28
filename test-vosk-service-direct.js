const fetch = require('node-fetch');

async function testVoskServiceDirect() {
  const voskUrl = 'https://vosk-transcription-591459094147.us-central1.run.app';
  const testVideoUrl = 'https://firebasestorage.googleapis.com/v0/b/involuted-river-466315-p0.firebasestorage.app/o/users%2F114925503624947485560%2Fposts1756329949304_0_ssstwitter.com_1755207251016%20(1).mp4?alt=media&token=f94695ca-cdb3-486e-88fc-02d6ba27459c';
  
  console.log('Testing Vosk service directly...');
  console.log('Service URL:', voskUrl);
  console.log('Video URL:', testVideoUrl.substring(0, 100) + '...');
  
  try {
    console.log('Sending request to Vosk service...');
    const startTime = Date.now();
    
    const response = await fetch(voskUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: testVideoUrl,
        mediaType: 'video'
      }),
      timeout: 30000 // 30 second timeout
    });
    
    const endTime = Date.now();
    console.log(`Response received in ${endTime - startTime}ms`);
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('SUCCESS - Transcription result:', result);
    } else {
      const errorText = await response.text();
      console.log('ERROR - Response body:', errorText);
    }
    
  } catch (error) {
    console.log('ERROR - Request failed:', error.message);
    if (error.code === 'ECONNRESET') {
      console.log('Connection was reset - service might be timing out');
    }
    if (error.code === 'ETIMEDOUT') {
      console.log('Request timed out - service is taking too long');
    }
  }
}

testVoskServiceDirect();
