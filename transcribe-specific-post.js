const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function transcribePost() {
  try {
    const postId = 'cmeuco1ju00054s1svtlgr9zm';
    
    console.log('🔍 Getting post data...');
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      console.log('❌ Post not found');
      return;
    }
    
    console.log('📊 Post found:');
    console.log('- ID:', post.id);
    console.log('- Has video:', post.hasVideo);
    console.log('- Video URL:', post.videoUrl ? 'Present' : 'Missing');
    console.log('- Current status:', post.transcriptionStatus);
    console.log('- Created:', post.createdAt);
    
    if (!post.videoUrl) {
      console.log('❌ No video URL available for transcription');
      return;
    }
    
    console.log('- Firebase URL:', post.videoUrl.substring(0, 80) + '...');
    
    console.log('\n🔄 Setting status to processing...');
    await prisma.post.update({
      where: { id: postId },
      data: { transcriptionStatus: 'processing' }
    });
    
    console.log('🎵 Calling Vosk transcription service...');
    const response = await fetch('https://vosk-transcription-591459094147.us-central1.run.app/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postId: postId,
        videoUrl: post.videoUrl,
        mediaType: 'video'
      }),
      timeout: 120000 // 2 minute timeout
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Service response received');
      console.log('Success:', result.success);
      console.log('Has transcription:', !!result.transcription);
      
      if (result.success && result.transcription) {
        await prisma.post.update({
          where: { id: postId },
          data: {
            transcriptionStatus: 'completed',
            audioTranscription: result.transcription
          }
        });
        
        console.log('\n🎉 SUCCESS: Transcription completed!');
        console.log('📝 Transcription text:');
        console.log(result.transcription);
      } else {
        console.log('❌ Service returned no transcription');
        console.log('Full response:', JSON.stringify(result, null, 2));
        await prisma.post.update({
          where: { id: postId },
          data: { transcriptionStatus: 'failed' }
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Service error:', response.status);
      console.log('Error details:', errorText);
      
      await prisma.post.update({
        where: { id: postId },
        data: { 
          transcriptionStatus: 'failed',
          audioTranscription: `Service error: ${response.status} - ${errorText}`
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Update status to failed
    try {
      await prisma.post.update({
        where: { id: 'cmeuco1ju00054s1svtlgr9zm' },
        data: { 
          transcriptionStatus: 'failed',
          audioTranscription: `Script error: ${error.message}`
        }
      });
    } catch (updateError) {
      console.error('Failed to update error status:', updateError.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

transcribePost();
