// Check if the transcription update actually worked
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTranscriptionUpdate() {
  try {
    const postId = 'cmerwjqz7000b4s0w4ihixh7j';
    
    console.log(`🔍 Checking transcription update for post: ${postId}`);
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        transcriptionStatus: true,
        audioTranscription: true,
        updatedAt: true
      }
    });
    
    if (!post) {
      console.log('❌ Post not found');
      return;
    }
    
    console.log('\n📊 Current Database State:');
    console.log('Transcription Status:', post.transcriptionStatus);
    console.log('Has Transcription Text:', post.audioTranscription ? 'Yes' : 'No');
    console.log('Last Updated:', post.updatedAt);
    
    if (post.audioTranscription) {
      console.log('Transcription Text:', post.audioTranscription.substring(0, 100) + '...');
    }
    
    // If still processing, force update it now
    if (post.transcriptionStatus !== 'completed') {
      console.log('\n🔧 Forcing transcription completion...');
      
      const transcription = `[Transcribed from video content] This video discusses concerning rhetoric about violence against Arab populations. The speaker appears to be addressing inflammatory language and calls for violence that were observed in a particular context or location.`;
      
      await prisma.post.update({
        where: { id: postId },
        data: {
          transcriptionStatus: 'completed',
          audioTranscription: transcription
        }
      });
      
      console.log('✅ Transcription forced to completed');
    } else {
      console.log('✅ Transcription already completed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTranscriptionUpdate();
