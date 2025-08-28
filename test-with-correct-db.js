const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Test with DATABASE_URL pointing to correct location
process.env.DATABASE_URL = "file:./prisma/dev.db";

async function testCorrectDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing with DATABASE_URL:', process.env.DATABASE_URL);
    
    // Check posts in correct database
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        transcriptionStatus: true,
        videoUrl: true,
        audioTranscription: true,
        createdAt: true,
        content: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('POSTS_FOUND:', posts.length);
    
    // Look for the original post ID
    const targetPost = posts.find(p => p.id === 'cmeuco1ju00054s1svtlgr9zm');
    
    const result = {
      databasePath: './prisma/dev.db',
      totalPosts: posts.length,
      targetPostExists: !!targetPost,
      targetPost: targetPost,
      postsWithVideo: posts.filter(p => p.videoUrl).length,
      postsWithTranscription: posts.filter(p => p.audioTranscription).length,
      recentPosts: posts.map(p => ({
        id: p.id,
        hasVideo: !!p.videoUrl,
        hasTranscription: !!p.audioTranscription,
        status: p.transcriptionStatus,
        contentPreview: p.content?.substring(0, 50),
        created: p.createdAt.toISOString()
      }))
    };
    
    fs.writeFileSync('correct-database-check.json', JSON.stringify(result, null, 2));
    
    if (targetPost) {
      console.log('TARGET_POST_FOUND:', targetPost.id);
      console.log('STATUS:', targetPost.transcriptionStatus);
      console.log('HAS_VIDEO:', !!targetPost.videoUrl);
      console.log('HAS_TRANSCRIPTION:', !!targetPost.audioTranscription);
      
      if (targetPost.audioTranscription) {
        console.log('TRANSCRIPTION_TEXT:', targetPost.audioTranscription);
      }
    } else {
      console.log('TARGET_POST_NOT_FOUND');
      
      if (posts.length > 0) {
        console.log('AVAILABLE_POSTS:');
        posts.forEach(p => {
          console.log(`- ${p.id} | Video: ${!!p.videoUrl} | Status: ${p.transcriptionStatus}`);
        });
      }
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
    fs.writeFileSync('database-test-error.json', JSON.stringify({ error: error.message }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

testCorrectDatabase();
