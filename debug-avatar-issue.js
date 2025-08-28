const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db"
    }
  }
});

async function debugAvatarIssue() {
  try {
    console.log('=== DEBUGGING AVATAR ISSUE ===');
    
    // Get the actual API response that the frontend receives
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profilePhoto: true,
            username: true,
          }
        }
      },
    });
    
    console.log(`Found ${posts.length} posts\n`);
    
    posts.forEach((post, i) => {
      console.log(`=== POST ${i + 1} ===`);
      console.log('Post ID:', post.id);
      console.log('User ID:', post.userId);
      console.log('Content:', post.content?.substring(0, 50) + '...');
      
      if (post.User) {
        console.log('User found:');
        console.log('  - Email:', post.User.email);
        console.log('  - Username:', post.User.username);
        console.log('  - Name:', post.User.name);
        console.log('  - ProfilePhoto exists:', !!post.User.profilePhoto);
        console.log('  - Image exists:', !!post.User.image);
        
        if (post.User.profilePhoto) {
          console.log('  - ProfilePhoto type:', typeof post.User.profilePhoto);
          console.log('  - ProfilePhoto preview:', post.User.profilePhoto.substring(0, 100) + '...');
        }
        
        if (post.User.image) {
          console.log('  - Image type:', typeof post.User.image);
          console.log('  - Image preview:', post.User.image.substring(0, 100) + '...');
        }
        
        // Show what the frontend will receive
        const frontendAvatar = post.User.profilePhoto || post.User.image || '/avatar-placeholder.svg';
        console.log('  - Frontend will use:', frontendAvatar === '/avatar-placeholder.svg' ? 'PLACEHOLDER' : 'ACTUAL PHOTO');
        
      } else {
        console.log('❌ NO USER FOUND FOR THIS POST');
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error debugging avatar issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAvatarIssue();
