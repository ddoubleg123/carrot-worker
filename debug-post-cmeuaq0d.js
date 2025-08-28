const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPost() {
  try {
    const postId = 'cmeuaq0d000034s1s03e6aqz9';
    
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      console.log('Post not found');
      return;
    }

    console.log('=== POST DEBUG INFO ===');
    console.log('ID:', post.id);
    console.log('Content:', post.content);
    console.log('Status:', post.transcriptionStatus);
    console.log('Has Video:', post.hasVideo);
    console.log('Has Audio:', post.hasAudio);
    console.log('Video URL:', post.videoUrl ? 'YES' : 'NO');
    console.log('Audio URL:', post.audioUrl ? 'YES' : 'NO');
    console.log('Transcription:', post.audioTranscription ? 'YES' : 'NO');
    console.log('Created:', post.createdAt);
    console.log('Updated:', post.updatedAt);
    
    if (post.videoUrl) {
      console.log('Video URL:', post.videoUrl.substring(0, 100) + '...');
    }
    if (post.audioUrl) {
      console.log('Audio URL:', post.audioUrl.substring(0, 100) + '...');
    }
    if (post.audioTranscription) {
      console.log('Transcription Text:', post.audioTranscription.substring(0, 200) + '...');
    }

    // Analysis
    console.log('\n=== ANALYSIS ===');
    if (post.transcriptionStatus === 'pending' && post.hasVideo && !post.audioTranscription) {
      console.log('❌ ISSUE: Video post stuck in pending status');
      console.log('   - Has video but no transcription');
      console.log('   - Transcription was never triggered or failed');
      
      if (!post.audioUrl && post.videoUrl) {
        console.log('   - Missing audio URL (needs extraction from video)');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPost();
