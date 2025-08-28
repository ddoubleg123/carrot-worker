// Check the current status of the post after transcription trigger
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPostStatus() {
  try {
    const postId = 'cmervqq7l00094s0wdky56gix';
    
    console.log(`🔄 Checking updated status for post: ${postId}`);
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        transcriptionStatus: true,
        audioTranscription: true,
        videoUrl: true,
        updatedAt: true
      }
    });
    
    if (!post) {
      console.log('❌ Post not found');
      return;
    }
    
    console.log('\n📊 Current Status:');
    console.log('Transcription Status:', post.transcriptionStatus || 'null');
    console.log('Has Video URL:', post.videoUrl ? 'Yes' : 'No');
    console.log('Last Updated:', post.updatedAt);
    
    if (post.audioTranscription) {
      console.log('\n📝 Transcription Text:');
      console.log(post.audioTranscription);
    } else {
      console.log('\n📝 No transcription text yet');
    }
    
    // Check if status changed from processing
    if (post.transcriptionStatus === 'processing') {
      console.log('\n⚠️  Still processing - transcription may be running in background');
    } else if (post.transcriptionStatus === 'completed') {
      console.log('\n✅ Transcription completed successfully!');
    } else if (post.transcriptionStatus === 'failed') {
      console.log('\n❌ Transcription failed');
    }
    
  } catch (error) {
    console.error('❌ Error checking post:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostStatus();
