const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTranscriptionInDb() {
  try {
    const postId = 'cmes0n4ou00014s98lqnu93gj';
    
    console.log(`🔍 Checking database transcription for post: ${postId}`);
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        transcriptionStatus: true,
        audioTranscription: true,
        updatedAt: true,
        createdAt: true
      }
    });
    
    if (!post) {
      console.log('❌ Post not found in database');
      return;
    }
    
    console.log('\n📊 Database Content:');
    console.log('Post ID:', post.id);
    console.log('Transcription Status:', post.transcriptionStatus);
    console.log('Created:', post.createdAt);
    console.log('Updated:', post.updatedAt);
    console.log('\n📝 Raw Transcription Text:');
    console.log('Length:', post.audioTranscription?.length || 0);
    console.log('Content:', post.audioTranscription);
    
    // Check if it's the old placeholder text
    if (post.audioTranscription?.includes('This video discusses concerning rhetoric')) {
      console.log('\n⚠️  ISSUE: Still showing old placeholder text from manual admin update');
      console.log('This is NOT from Vosk service - it\'s the fake transcription we added manually');
    } else if (post.audioTranscription?.includes('Transcription unavailable')) {
      console.log('\n✅ Showing new fallback message (Vosk service down)');
    } else if (post.audioTranscription && !post.audioTranscription.includes('[')) {
      console.log('\n✅ Real transcription from Vosk service!');
    } else {
      console.log('\n❓ Unknown transcription format');
    }
    
  } catch (error) {
    console.error('❌ Database check error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTranscriptionInDb();
