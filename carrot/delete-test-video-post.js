const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Use the same database path as the main app
const databasePath = path.join(__dirname, 'prisma', 'dev.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${databasePath}`
    }
  }
});

async function deleteTestVideoPost() {
  try {
    console.log('🗑️ Attempting to delete test video post with ID: test-video-post-001');
    
    // Check if the post exists first
    const existingPost = await prisma.post.findUnique({
      where: { id: 'test-video-post-001' }
    });
    
    if (!existingPost) {
      console.log('❌ Post with ID "test-video-post-001" not found');
      return;
    }
    
    console.log('📋 Found post:', {
      id: existingPost.id,
      content: existingPost.content?.substring(0, 50) + '...',
      transcriptionStatus: existingPost.transcriptionStatus,
      createdAt: existingPost.createdAt
    });
    
    // Delete the post
    const deletedPost = await prisma.post.delete({
      where: { id: 'test-video-post-001' }
    });
    
    console.log('✅ Successfully deleted test video post:', deletedPost.id);
    
  } catch (error) {
    console.error('❌ Error deleting test video post:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestVideoPost();
