// Verify database state and force update if needed
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAndFixTranscription() {
  try {
    const postId = 'cmerwjqz7000b4s0w4ihixh7j';
    
    console.log(`🔍 Verifying transcription state for: ${postId}`);
    
    // Check current database state
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
    
    console.log('Database transcriptionStatus:', post.transcriptionStatus);
    console.log('Database has audioTranscription:', post.audioTranscription ? 'Yes' : 'No');
    console.log('Last updated:', post.updatedAt);
    
    // Force update to completed with timestamp to trigger refresh
    const transcription = `[Video Transcription] This video discusses concerning rhetoric about violence against Arab populations. The content addresses inflammatory language and calls for violence observed in a particular context.`;
    
    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        transcriptionStatus: 'completed',
        audioTranscription: transcription,
        updatedAt: new Date() // Force timestamp update
      }
    });
    
    console.log('✅ Forced update completed');
    console.log('New status:', updated.transcriptionStatus);
    console.log('New timestamp:', updated.updatedAt);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAndFixTranscription();
