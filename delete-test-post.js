const { PrismaClient } = require('@prisma/client');

async function deleteTestPost() {
  console.log('🗑️ Deleting test video post...\n');
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url: "file:./carrot/prisma/dev.db" }
    }
  });
  
  try {
    // First check if the post exists
    const post = await prisma.post.findUnique({
      where: { id: "test-video-post-001" },
      select: {
        id: true,
        content: true,
        transcriptionStatus: true,
        createdAt: true
      }
    });
    
    if (post) {
      console.log('📋 Found post to delete:');
      console.log(`  ID: ${post.id}`);
      console.log(`  Content: ${post.content}`);
      console.log(`  Status: ${post.transcriptionStatus}`);
      console.log(`  Created: ${post.createdAt}\n`);
      
      // Delete the post
      await prisma.post.delete({
        where: { id: "test-video-post-001" }
      });
      
      console.log('✅ Test post deleted successfully!');
    } else {
      console.log('❌ Post with ID "test-video-post-001" not found');
    }
  } catch (error) {
    console.error('❌ Error deleting post:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestPost();
