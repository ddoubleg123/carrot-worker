const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVideoPost() {
  try {
    const postId = 'cmeuaq0d000034s1s03e6aqz9';
    
    console.log(`🔍 Checking video post: ${postId}`);
    
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
        audioUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!post) {
      console.log('❌ Post not found');
      return;
    }

    console.log('\n📊 Post Details:');
    console.log('ID:', post.id);
    console.log('Content:', post.content);
    console.log('Has Video:', post.hasVideo);
    console.log('Has Audio:', post.hasAudio);
    console.log('Video URL:', post.videoUrl || 'None');
    console.log('Audio URL:', post.audioUrl || 'None');
    console.log('Transcription Status:', post.transcriptionStatus);
    console.log('Audio Transcription:', post.audioTranscription || 'None');
    console.log('Created:', post.createdAt);
    console.log('Updated:', post.updatedAt);

    // Check if this post needs transcription trigger
    if (post.transcriptionStatus === 'pending' && post.hasVideo && post.videoUrl) {
      console.log('\n⚠️  Post has video but transcription is pending');
      console.log('This suggests transcription was never triggered or failed');
      
      if (!post.audioUrl) {
        console.log('❌ Missing audio URL - video needs audio extraction first');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkVideoPost();
