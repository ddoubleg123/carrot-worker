const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  try {
    console.log('🔍 Checking post cmeu9j6i400014s1s8ozvf15x...');
    
    const post = await prisma.post.findUnique({
      where: { id: 'cmeu9j6i400014s1s8ozvf15x' },
      select: {
        id: true,
        transcriptionStatus: true,
        audioTranscription: true,
        hasVideo: true,
        hasAudio: true,
        videoUrl: true,
        audioUrl: true,
        updatedAt: true,
        createdAt: true
      }
    });

    if (!post) {
      console.log('❌ Post not found');
      return;
    }

    console.log('\n📊 Current Status:');
    console.log('Status:', post.transcriptionStatus);
    console.log('Has Video:', post.hasVideo);
    console.log('Has Audio:', post.hasAudio);
    console.log('Video URL:', post.videoUrl ? 'Present' : 'None');
    console.log('Audio URL:', post.audioUrl ? 'Present' : 'None');
    console.log('Created:', post.createdAt);
    console.log('Updated:', post.updatedAt);
    
    if (post.audioTranscription) {
      console.log('\n✅ Transcription Result:');
      console.log(post.audioTranscription);
    } else {
      console.log('\n⏳ No transcription yet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
