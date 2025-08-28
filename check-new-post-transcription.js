// Check if the new post is using real Vosk transcription
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNewPostTranscription() {
  try {
    const postId = 'cmesnyx2w00034s98thet2qp8';
    
    console.log(`🔍 Checking transcription status for post: ${postId}`);
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        transcriptionStatus: true,
        audioTranscription: true,
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
    
    console.log('\n📊 Post Details:');
    console.log('ID:', post.id);
    console.log('Status:', post.transcriptionStatus);
    console.log('Has Video URL:', !!post.videoUrl);
    console.log('Has Audio URL:', !!post.audioUrl);
    console.log('Video URL:', post.videoUrl?.substring(0, 80) + '...');
    console.log('Audio URL:', post.audioUrl?.substring(0, 80) + '...');
    console.log('Created:', post.createdAt);
    console.log('Updated:', post.updatedAt);
    console.log('Transcription:', post.audioTranscription?.substring(0, 100) + '...');
    
    // Check if transcription was triggered
    const timeSinceCreation = Date.now() - new Date(post.createdAt).getTime();
    console.log(`\n⏱️  Time since creation: ${Math.floor(timeSinceCreation / 1000)} seconds`);
    
    if (post.transcriptionStatus === 'processing' && timeSinceCreation > 120000) {
      console.log('⚠️  Post stuck in processing for over 2 minutes');
      console.log('💡 Transcription trigger may have failed or Vosk service unreachable');
    if (post.transcriptionStatus === 'processing') {
      console.log('\n⏳ Still processing, waiting 3 more seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
        select: {
          transcriptionStatus: true,
          audioTranscription: true
        }
      });
      
      console.log('\n🔄 Updated Status:', updatedPost?.transcriptionStatus);
      if (updatedPost?.audioTranscription) {
        console.log('Updated Transcription:', updatedPost.audioTranscription.substring(0, 100) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewPostTranscription();
