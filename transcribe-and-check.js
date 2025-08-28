const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const postId = 'cmeuco1ju00054s1svtlgr9zm';
    
    // Get the post
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      console.log('POST_NOT_FOUND');
      return;
    }
    
    console.log('POST_FOUND');
    console.log('STATUS:', post.transcriptionStatus);
    console.log('HAS_VIDEO:', post.hasVideo);
    console.log('HAS_VIDEO_URL:', !!post.videoUrl);
    
    if (post.videoUrl) {
      console.log('VIDEO_URL_PREVIEW:', post.videoUrl.substring(0, 100));
      
      // Update to processing
      await prisma.post.update({
        where: { id: postId },
        data: { transcriptionStatus: 'processing' }
      });
      console.log('STATUS_UPDATED_TO_PROCESSING');
      
      // Call Vosk service
      const fetch = require('node-fetch');
      const response = await fetch('https://vosk-transcription-591459094147.us-central1.run.app/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          videoUrl: post.videoUrl,
          mediaType: 'video'
        })
      });
      
      console.log('VOSK_RESPONSE_STATUS:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('VOSK_SUCCESS:', result.success);
        console.log('HAS_TRANSCRIPTION:', !!result.transcription);
        
        if (result.success && result.transcription) {
          await prisma.post.update({
            where: { id: postId },
            data: {
              transcriptionStatus: 'completed',
              audioTranscription: result.transcription
            }
          });
          console.log('TRANSCRIPTION_SAVED');
          console.log('TRANSCRIPTION_TEXT:', result.transcription);
        } else {
          console.log('NO_TRANSCRIPTION_RETURNED');
          await prisma.post.update({
            where: { id: postId },
            data: { transcriptionStatus: 'failed' }
          });
        }
      } else {
        const errorText = await response.text();
        console.log('VOSK_ERROR:', response.status, errorText);
        await prisma.post.update({
          where: { id: postId },
          data: { transcriptionStatus: 'failed' }
        });
      }
    } else {
      console.log('NO_VIDEO_URL');
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
