const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Check if target post exists
    const targetPost = await prisma.post.findUnique({
      where: { id: 'cmeuco1ju00054s1svtlgr9zm' }
    });
    
    if (targetPost) {
      console.log('TARGET POST FOUND:');
      console.log('ID:', targetPost.id);
      console.log('Status:', targetPost.transcriptionStatus);
      console.log('Has Video:', targetPost.hasVideo);
      console.log('Video URL:', targetPost.videoUrl ? 'Present' : 'Missing');
      console.log('Audio Transcription:', targetPost.audioTranscription ? 'Present' : 'Missing');
      console.log('Created:', targetPost.createdAt);
      console.log('Updated:', targetPost.updatedAt);
    } else {
      console.log('TARGET POST NOT FOUND');
      
      // List all posts to see what we have
      const allPosts = await prisma.post.findMany({
        select: {
          id: true,
          transcriptionStatus: true,
          hasVideo: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      console.log('\nRECENT POSTS:');
      allPosts.forEach(post => {
        console.log(`${post.id} | ${post.transcriptionStatus} | Video: ${post.hasVideo} | ${post.createdAt.toISOString().split('T')[0]}`);
      });
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
