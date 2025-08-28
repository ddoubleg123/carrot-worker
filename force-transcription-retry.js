const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function retryTranscription() {
  try {
    const postId = 'cmeu9j6i400014s1s8ozvf15x';
    
    console.log(`🔄 Resetting transcription status for post ${postId}...`);
    
    // Reset the post to trigger transcription again
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        transcriptionStatus: 'pending',
        audioTranscription: null
      }
    });
    
    console.log('✅ Post reset to pending status');
    console.log('Now manually trigger transcription via your app');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

retryTranscription();
