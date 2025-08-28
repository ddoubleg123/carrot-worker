const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const fs = require('fs');

async function testTranscriptionPipeline() {
  const prisma = new PrismaClient();
  
  try {
    const postId = 'test-video-post-001';
    
    // Get the test post
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      console.log('TEST_POST_NOT_FOUND');
      return;
    }
    
    console.log('TESTING_POST:', post.id);
    console.log('VIDEO_URL:', post.videoUrl);
    console.log('CURRENT_STATUS:', post.transcriptionStatus);
    
    // Update to processing
    await prisma.post.update({
      where: { id: postId },
      data: { transcriptionStatus: 'processing' }
    });
    
    console.log('STATUS_UPDATED_TO_PROCESSING');
    
    // Call the Vosk transcription service
    console.log('CALLING_VOSK_SERVICE...');
    const response = await fetch('https://vosk-transcription-591459094147.us-central1.run.app/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: postId,
        videoUrl: post.videoUrl,
        mediaType: 'video'
      }),
      timeout: 120000
    });
    
    console.log('VOSK_RESPONSE_STATUS:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('VOSK_SUCCESS:', result.success);
      
      if (result.success && result.transcription) {
        // Update with transcription
        await prisma.post.update({
          where: { id: postId },
          data: {
            transcriptionStatus: 'completed',
            audioTranscription: result.transcription
          }
        });
        
        console.log('TRANSCRIPTION_COMPLETED');
        console.log('TRANSCRIPTION_TEXT:', result.transcription);
        
        const successResult = {
          success: true,
          postId: postId,
          transcriptionStatus: 'completed',
          transcriptionText: result.transcription,
          transcriptionLength: result.transcription.length
        };
        
        fs.writeFileSync('transcription-test-success.json', JSON.stringify(successResult, null, 2));
        
      } else {
        console.log('NO_TRANSCRIPTION_RETURNED');
        await prisma.post.update({
          where: { id: postId },
          data: { transcriptionStatus: 'failed' }
        });
        
        fs.writeFileSync('transcription-test-failed.json', JSON.stringify({
          error: 'No transcription returned',
          response: result
        }, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('VOSK_SERVICE_ERROR:', response.status, errorText);
      
      await prisma.post.update({
        where: { id: postId },
        data: { transcriptionStatus: 'failed' }
      });
      
      fs.writeFileSync('transcription-test-error.json', JSON.stringify({
        error: `Service error: ${response.status}`,
        details: errorText
      }, null, 2));
    }
    
  } catch (error) {
    console.log('SCRIPT_ERROR:', error.message);
    
    fs.writeFileSync('transcription-test-error.json', JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

testTranscriptionPipeline();
