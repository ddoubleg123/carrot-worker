const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get all posts to see what actually exists
    const allPosts = await prisma.post.findMany({
      select: {
        id: true,
        transcriptionStatus: true,
        videoUrl: true,
        audioTranscription: true,
        createdAt: true,
        content: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    const result = {
      totalPosts: allPosts.length,
      posts: allPosts.map(p => ({
        id: p.id,
        status: p.transcriptionStatus,
        hasVideoUrl: !!p.videoUrl,
        hasTranscription: !!p.audioTranscription,
        transcriptionLength: p.audioTranscription?.length || 0,
        contentPreview: p.content?.substring(0, 50) || '',
        created: p.createdAt.toISOString(),
        videoUrlPreview: p.videoUrl ? p.videoUrl.substring(0, 80) + '...' : null
      })),
      postsWithVideo: allPosts.filter(p => p.videoUrl).length,
      postsWithTranscription: allPosts.filter(p => p.audioTranscription).length,
      pendingTranscription: allPosts.filter(p => p.transcriptionStatus === 'pending').length
    };
    
    fs.writeFileSync('real-posts-data.json', JSON.stringify(result, null, 2));
    
    // Check specifically for the target post ID
    const targetPost = await prisma.post.findUnique({
      where: { id: 'cmeuco1ju00054s1svtlgr9zm' }
    });
    
    const targetResult = {
      targetPostExists: !!targetPost,
      targetPostData: targetPost ? {
        id: targetPost.id,
        transcriptionStatus: targetPost.transcriptionStatus,
        audioTranscription: targetPost.audioTranscription,
        videoUrl: targetPost.videoUrl,
        content: targetPost.content,
        createdAt: targetPost.createdAt.toISOString()
      } : null
    };
    
    fs.writeFileSync('target-post-data.json', JSON.stringify(targetResult, null, 2));
    
    console.log('FOUND_POSTS:', allPosts.length);
    console.log('WITH_VIDEO:', allPosts.filter(p => p.videoUrl).length);
    console.log('WITH_TRANSCRIPTION:', allPosts.filter(p => p.audioTranscription).length);
    console.log('TARGET_POST_EXISTS:', !!targetPost);
    
  } catch (error) {
    const errorResult = { error: error.message };
    fs.writeFileSync('posts-error.json', JSON.stringify(errorResult, null, 2));
    console.log('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
