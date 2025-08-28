const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function triggerTranscription() {
  try {
    const postId = 'cmeuco1ju00054s1svtlgr9zm';
    
    console.log('🔍 Checking post:', postId);
    
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      console.log('❌ Post not found');
      return;
    }
    
    console.log('📊 Post Status:');
    console.log('- hasAudio:', post.hasAudio);
    console.log('- hasVideo:', post.hasVideo);
    console.log('- audioUrl:', post.audioUrl ? 'Present' : 'None');
    console.log('- videoUrl:', post.videoUrl ? 'Present' : 'None');
    console.log('- transcriptionStatus:', post.transcriptionStatus);
    
    if (post.videoUrl) {
      console.log('\n🎵 Triggering transcription...');
      console.log('Video URL preview:', post.videoUrl.substring(0, 100) + '...');
      
      const response = await fetch('https://vosk-transcription-591459094147.us-central1.run.app/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId: postId,
          videoUrl: post.videoUrl,
          mediaType: 'video'
        })
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Transcription successful:');
        console.log('- Success:', result.success);
        console.log('- Status:', result.status);
        console.log('- Transcription:', result.transcription);
        
        if (result.success && result.transcription) {
          // Update database
          await prisma.post.update({
            where: { id: postId },
            data: {
              transcriptionStatus: 'completed',
              audioTranscription: result.transcription
            }
          });
          
          console.log('\n✅ Database updated successfully');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Transcription failed:', response.status, response.statusText);
        console.log('Error details:', errorText);
      }
    } else {
      console.log('❌ No video URL available for transcription');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

triggerTranscription();
