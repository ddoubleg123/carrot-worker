const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const postId = 'cmeuco1ju00054s1svtlgr9zm';

async function directTranscribe() {
  try {
    // Get post with video URL
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post || !post.videoUrl) {
      console.log('No post or video URL found');
      process.exit(1);
    }
    
    console.log('Found post with video URL');
    
    // Set to processing
    await prisma.post.update({
      where: { id: postId },
      data: { transcriptionStatus: 'processing' }
    });
    
    console.log('Status set to processing');
    
    // Call Vosk service directly
    const response = await fetch('https://vosk-transcription-591459094147.us-central1.run.app/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: postId,
        videoUrl: post.videoUrl,
        mediaType: 'video'
      }),
      timeout: 180000
    });
    
    console.log('Vosk service response:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success && result.transcription) {
        await prisma.post.update({
          where: { id: postId },
          data: {
            transcriptionStatus: 'completed',
            audioTranscription: result.transcription
          }
        });
        
        console.log('SUCCESS - Transcription completed');
        console.log('Text:', result.transcription);
      } else {
        console.log('Service returned no transcription');
        await prisma.post.update({
          where: { id: postId },
          data: { transcriptionStatus: 'failed' }
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Service error:', response.status, errorText);
      
      await prisma.post.update({
        where: { id: postId },
        data: { transcriptionStatus: 'failed' }
      });
    }
    
  } catch (error) {
    console.log('Script error:', error.message);
    
    await prisma.post.update({
      where: { id: postId },
      data: { transcriptionStatus: 'failed' }
    }).catch(() => {});
  } finally {
    await prisma.$disconnect();
  }
}

directTranscribe();
