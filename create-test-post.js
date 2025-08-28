const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function createTestPost() {
  const prisma = new PrismaClient();
  
  try {
    // Create a test post with a Firebase video URL
    const testPost = await prisma.post.create({
      data: {
        id: 'test-video-post-001',
        content: 'Test video post for transcription',
        userId: 'test-user-001',
        videoUrl: 'https://firebasestorage.googleapis.com/v0/b/involuted-river-466315-p0-default-rtdb.firebasestorage.app/o/videos%2Ftest-video.mp4?alt=media',
        transcriptionStatus: 'pending',
        gradientDirection: 'to-br',
        gradientFromColor: '#3b82f6',
        gradientToColor: '#8b5cf6'
      }
    });
    
    console.log('TEST_POST_CREATED:', testPost.id);
    
    // Also create a user if needed
    try {
      await prisma.user.create({
        data: {
          id: 'test-user-001',
          email: 'test@example.com',
          name: 'Test User',
          isOnboarded: true
        }
      });
      console.log('TEST_USER_CREATED');
    } catch (userError) {
      console.log('USER_EXISTS_OR_ERROR:', userError.message);
    }
    
    // Verify the post was created
    const createdPost = await prisma.post.findUnique({
      where: { id: 'test-video-post-001' }
    });
    
    const result = {
      success: true,
      postId: createdPost.id,
      videoUrl: createdPost.videoUrl,
      transcriptionStatus: createdPost.transcriptionStatus,
      createdAt: createdPost.createdAt.toISOString()
    };
    
    fs.writeFileSync('test-post-created.json', JSON.stringify(result, null, 2));
    
    console.log('POST_READY_FOR_TRANSCRIPTION');
    
  } catch (error) {
    console.log('CREATE_POST_ERROR:', error.message);
    fs.writeFileSync('create-post-error.json', JSON.stringify({ error: error.message }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

createTestPost();
