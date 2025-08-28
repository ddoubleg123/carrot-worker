const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get the specific post
    const post = await prisma.post.findUnique({
      where: { id: 'cmeuco1ju00054s1svtlgr9zm' }
    });
    
    const result = {
      postExists: !!post,
      postId: post?.id || null,
      transcriptionStatus: post?.transcriptionStatus || null,
      hasAudioTranscription: !!post?.audioTranscription,
      audioTranscriptionLength: post?.audioTranscription?.length || 0,
      audioTranscriptionText: post?.audioTranscription || null,
      hasVideo: post?.hasVideo || false,
      hasVideoUrl: !!post?.videoUrl,
      videoUrlPreview: post?.videoUrl ? post.videoUrl.substring(0, 100) + '...' : null,
      createdAt: post?.createdAt?.toISOString() || null,
      updatedAt: post?.updatedAt?.toISOString() || null
    };
    
    // Write to file
    fs.writeFileSync('transcription-check-result.json', JSON.stringify(result, null, 2));
    
    // Also get all posts to see what exists
    const allPosts = await prisma.post.findMany({
      select: {
        id: true,
        transcriptionStatus: true,
        hasVideo: true,
        audioTranscription: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    const allPostsResult = {
      totalPosts: allPosts.length,
      posts: allPosts.map(p => ({
        id: p.id,
        status: p.transcriptionStatus,
        hasVideo: p.hasVideo,
        hasTranscription: !!p.audioTranscription,
        transcriptionLength: p.audioTranscription?.length || 0,
        created: p.createdAt.toISOString()
      }))
    };
    
    fs.writeFileSync('all-posts-check.json', JSON.stringify(allPostsResult, null, 2));
    
    console.log('Results written to files');
    
  } catch (error) {
    const errorResult = { error: error.message, stack: error.stack };
    fs.writeFileSync('transcription-error.json', JSON.stringify(errorResult, null, 2));
    console.log('Error written to file');
  } finally {
    await prisma.$disconnect();
  }
}

main();
