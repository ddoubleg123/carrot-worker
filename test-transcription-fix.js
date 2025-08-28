const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTranscriptionFix() {
  try {
    const postId = 'cmeuaq0d000034s1s03e6aqz9';
    
    console.log('🔍 Checking post before transcription...');
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        content: true,
        transcriptionStatus: true,
        audioTranscription: true,
        hasVideo: true,
        hasAudio: true,
        videoUrl: true,
        audioUrl: true
      }
    });

    if (!post) {
      console.log('❌ Post not found');
      return;
    }

    console.log('📊 Current Post Status:');
    console.log('- Status:', post.transcriptionStatus);
    console.log('- Has Video:', post.hasVideo);
    console.log('- Video URL:', post.videoUrl ? 'Present' : 'Missing');
    console.log('- Audio URL:', post.audioUrl ? 'Present' : 'Missing');
    console.log('- Transcription:', post.audioTranscription ? 'Present' : 'Missing');

    // Test transcription with video URL (Vosk service handles video-to-audio extraction)
    if (post.videoUrl) {
      console.log('\n🎵 Triggering transcription with video URL...');
      
      const transcriptionServiceUrl = 'https://vosk-transcription-591459094147.us-central1.run.app';
      
      const response = await fetch(`${transcriptionServiceUrl}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post.id,
          videoUrl: post.videoUrl,
          mediaType: 'video'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Transcription service response:', result);
        
        if (result.success && result.transcription) {
          // Update database with transcription
          await prisma.post.update({
            where: { id: postId },
            data: {
              transcriptionStatus: 'completed',
              audioTranscription: result.transcription
            }
          });
          
          console.log('✅ Database updated with transcription');
          console.log('📝 Transcription text:', result.transcription.substring(0, 200) + '...');
        }
      } else {
        console.log('❌ Transcription service error:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error details:', errorText);
      }
    } else {
      console.log('❌ No video URL available for transcription');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTranscriptionFix();
