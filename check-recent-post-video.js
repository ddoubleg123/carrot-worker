const { PrismaClient } = require('@prisma/client');

// Use correct DATABASE_URL
process.env.DATABASE_URL = "file:./prisma/dev.db";

async function checkRecentPostVideo() {
  const prisma = new PrismaClient();
  
  try {
    // Get the most recent post with video
    const recentPost = await prisma.post.findFirst({
      where: {
        videoUrl: {
          not: null
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        videoUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
    
    if (recentPost) {
      console.log('RECENT POST FOUND:');
      console.log('Post ID:', recentPost.id);
      console.log('Content:', recentPost.content);
      console.log('Created:', recentPost.createdAt);
      console.log('User:', recentPost.User?.email);
      console.log('Transcription Status:', recentPost.transcriptionStatus);
      console.log('Has Transcription:', !!recentPost.audioTranscription);
      console.log('');
      console.log('VIDEO URL:');
      console.log(recentPost.videoUrl);
      console.log('');
      
      // Parse the Firebase Storage URL to understand the path
      if (recentPost.videoUrl) {
        const url = new URL(recentPost.videoUrl);
        const pathParts = url.pathname.split('/');
        const bucketName = url.hostname.split('.')[0];
        
        console.log('FIREBASE STORAGE DETAILS:');
        console.log('Bucket:', bucketName);
        console.log('Full path:', url.pathname);
        
        // Extract the object path (after /v0/b/bucket/o/)
        const objectPathIndex = pathParts.indexOf('o');
        if (objectPathIndex !== -1 && objectPathIndex + 1 < pathParts.length) {
          const encodedPath = pathParts[objectPathIndex + 1];
          const decodedPath = decodeURIComponent(encodedPath);
          console.log('Object path:', decodedPath);
          
          // Break down the path
          const pathSegments = decodedPath.split('/');
          console.log('Path segments:', pathSegments);
          
          if (pathSegments.length >= 2) {
            console.log('Storage structure:');
            console.log('- Root folder:', pathSegments[0]);
            console.log('- User folder:', pathSegments[1]);
            console.log('- File name:', pathSegments[pathSegments.length - 1]);
          }
        }
        
        // Extract token
        const urlParams = new URLSearchParams(url.search);
        const token = urlParams.get('token');
        console.log('Access token:', token ? token.substring(0, 20) + '...' : 'None');
      }
      
    } else {
      console.log('NO POSTS WITH VIDEO FOUND');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentPostVideo();
