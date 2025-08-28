const { PrismaClient } = require('@prisma/client');

// Check multiple possible database locations
const dbPaths = [
  "file:./carrot/prisma/dev.db",
  "file:./prisma/dev.db", 
  "file:./dev.db"
];

async function checkSpecificPost() {
  const targetPostId = "cmeuhi90r00014smsh2xonfht";
  console.log(`🔍 Searching for post: ${targetPostId}\n`);
  
  for (const dbPath of dbPaths) {
    console.log(`📁 Checking database: ${dbPath}`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url: dbPath }
      }
    });
    
    try {
      // Check if database is accessible
      const postCount = await prisma.post.count();
      console.log(`  Total posts in database: ${postCount}`);
      
      if (postCount > 0) {
        // Search for the specific post
        const specificPost = await prisma.post.findUnique({
          where: { id: targetPostId },
          include: {
            User: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        });
        
        if (specificPost) {
          console.log(`  ✅ FOUND POST: ${targetPostId}`);
          console.log(`    Content: ${specificPost.content}`);
          console.log(`    Created: ${specificPost.createdAt}`);
          console.log(`    User: ${specificPost.User?.name || specificPost.User?.email || 'Unknown'}`);
          console.log(`    Video URL: ${specificPost.videoUrl ? 'Present' : 'Missing'}`);
          console.log(`    Transcription Status: ${specificPost.transcriptionStatus || 'none'}`);
          console.log(`    Audio Transcription: ${specificPost.audioTranscription ? 'Present' : 'Missing'}`);
          
          if (specificPost.videoUrl) {
            console.log(`    Video URL: ${specificPost.videoUrl.substring(0, 100)}...`);
          }
          
          return specificPost;
        } else {
          console.log(`  ❌ Post ${targetPostId} NOT FOUND in this database`);
        }
        
        // Also check recent posts to see what's actually in the database
        const recentPosts = await prisma.post.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            content: true,
            videoUrl: true,
            transcriptionStatus: true,
            createdAt: true,
            User: {
              select: { name: true, email: true }
            }
          }
        });
        
        console.log(`\n  📋 Recent posts in this database:`);
        recentPosts.forEach((post, index) => {
          const hasVideo = !!post.videoUrl;
          const user = post.User?.name || post.User?.email || 'Unknown';
          console.log(`    ${index + 1}. ${post.id} - ${user} - ${hasVideo ? 'Video' : 'No Video'} - ${post.transcriptionStatus || 'No Status'}`);
          console.log(`       Created: ${post.createdAt}`);
          console.log(`       Content: ${post.content?.substring(0, 50) || 'No content'}...`);
        });
      }
      
    } catch (error) {
      console.log(`  ❌ Error accessing database: ${error.message}`);
    } finally {
      await prisma.$disconnect();
    }
  }
  
  console.log(`\n❌ Post ${targetPostId} was not found in any database location.`);
}

checkSpecificPost().catch(console.error);
