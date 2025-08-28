const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function createTestUserAndPost() {
  const prisma = new PrismaClient();
  
  try {
    // First create a test user
    let testUser;
    try {
      testUser = await prisma.user.create({
        data: {
          id: 'test-user-001',
          email: 'test@example.com',
          name: 'Test User',
          isOnboarded: true
        }
      });
      console.log('TEST_USER_CREATED:', testUser.id);
    } catch (userError) {
      // User might already exist
      testUser = await prisma.user.findUnique({
        where: { id: 'test-user-001' }
      });
      if (!testUser) {
        throw new Error('Could not create or find test user');
      }
      console.log('TEST_USER_EXISTS:', testUser.id);
    }
    
    // Now create a test post with a Firebase video URL
    const testPost = await prisma.post.create({
      data: {
        id: 'test-video-post-001',
        content: 'Test video post for transcription',
        userId: testUser.id,
        videoUrl: 'https://firebasestorage.googleapis.com/v0/b/involuted-river-466315-p0-default-rtdb.firebasestorage.app/o/videos%2Ftest-video.mp4?alt=media',
        transcriptionStatus: 'pending',
        gradientDirection: 'to-br',
        gradientFromColor: '#3b82f6',
        gradientToColor: '#8b5cf6'
      }
    });
    
    console.log('TEST_POST_CREATED:', testPost.id);
    console.log('VIDEO_URL:', testPost.videoUrl);
    console.log('STATUS:', testPost.transcriptionStatus);
    
    // Verify the post was created
    const createdPost = await prisma.post.findUnique({
      where: { id: 'test-video-post-001' }
    });
    
    const result = {
      success: true,
      userId: testUser.id,
      postId: createdPost.id,
      videoUrl: createdPost.videoUrl,
      transcriptionStatus: createdPost.transcriptionStatus,
      createdAt: createdPost.createdAt.toISOString()
    };
    
    fs.writeFileSync('test-post-success.json', JSON.stringify(result, null, 2));
    
    console.log('POST_READY_FOR_TRANSCRIPTION');
    
  } catch (error) {
    console.log('ERROR:', error.message);
    fs.writeFileSync('test-post-error.json', JSON.stringify({ error: error.message }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

createTestUserAndPost();
