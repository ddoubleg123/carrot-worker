const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPost() {
  try {
    const postId = 'cmeu9j6i400014s1s8ozvf15x';
    
    console.log(`🔍 Checking post: ${postId}`);
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        content: true,
        videoUrl: true,
        audioUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true,
        User: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });
    
    if (!post) {
      console.log('❌ Post not found');
      return;
    }
    
    console.log('\n📊 Post Details:');
    console.log('ID:', post.id);
    console.log('Content:', post.content?.substring(0, 100) + '...');
    console.log('User:', post.User?.username || post.User?.email || 'Unknown');
    console.log('Created:', post.createdAt);
    console.log('Video URL:', post.videoUrl ? 'Yes' : 'No');
    console.log('Audio URL:', post.audioUrl ? 'Yes' : 'No');
    console.log('Transcription Status:', post.transcriptionStatus || 'null');
    console.log('Transcription Text:', post.audioTranscription || 'null');
    
    if (post.audioTranscription) {
      console.log('\n📝 Full Transcription:');
      console.log(post.audioTranscription);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPost();
