const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Initialize Prisma with the correct database path
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, 'carrot', 'prisma', 'dev.db')}`
    }
  }
});

async function checkPostTranscription() {
  try {
    const postId = 'cmeu9j6i400014s1s8ozvf15x';
    
    console.log(`🔍 Checking transcription for post: ${postId}`);
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        content: true,
        transcriptionStatus: true,
        audioTranscription: true,
        hasAudio: true,
        hasVideo: true,
        audioUrl: true,
        videoUrl: true,
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
    console.log('Has Audio:', post.hasAudio);
    console.log('Has Video:', post.hasVideo);
    console.log('Audio URL:', post.audioUrl);
    console.log('Video URL:', post.videoUrl);
    console.log('Transcription Status:', post.transcriptionStatus);
    console.log('Audio Transcription:', post.audioTranscription);
    console.log('Created At:', post.createdAt);
    console.log('Updated At:', post.updatedAt);

    if (post.transcriptionStatus === 'completed' && post.audioTranscription) {
      console.log('\n✅ Transcription is completed');
      console.log('Transcribed text:', post.audioTranscription);
    } else if (post.transcriptionStatus === 'processing') {
      console.log('\n⏳ Transcription is still processing');
    } else {
      console.log('\n❌ No transcription found');
    }

  } catch (error) {
    console.error('❌ Error checking post:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostTranscription();
