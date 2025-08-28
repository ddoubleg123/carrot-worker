const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db"
    }
  }
});

async function checkAvatarData() {
  try {
    console.log('=== CHECKING AVATAR DATA ===');
    
    // Find user with username 'daniel'
    const user = await prisma.user.findFirst({
      where: { username: 'daniel' },
      select: {
        id: true,
        email: true,
        username: true,
        profilePhoto: true,
        image: true
      }
    });
    
    if (!user) {
      console.log('❌ No user found with username "daniel"');
      return;
    }
    
    console.log('✅ Found user:', user.email);
    console.log('Username:', user.username);
    console.log('ProfilePhoto exists:', !!user.profilePhoto);
    console.log('Image exists:', !!user.image);
    
    if (user.profilePhoto) {
      console.log('ProfilePhoto type:', typeof user.profilePhoto);
      console.log('ProfilePhoto length:', user.profilePhoto.length);
      console.log('ProfilePhoto starts with:', user.profilePhoto.substring(0, 50));
      
      if (user.profilePhoto.startsWith('data:image')) {
        console.log('✅ ProfilePhoto is base64 data URL');
      } else if (user.profilePhoto.startsWith('http')) {
        console.log('✅ ProfilePhoto is HTTP URL');
      } else {
        console.log('⚠️ ProfilePhoto format unknown');
      }
    } else {
      console.log('❌ No profilePhoto data');
    }
    
    // Check posts for this user
    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        content: true,
        User: {
          select: {
            username: true,
            profilePhoto: true
          }
        }
      }
    });
    
    console.log(`\n=== POSTS FOR USER (${posts.length} found) ===`);
    posts.forEach(post => {
      console.log(`Post ${post.id}:`);
      console.log(`  Content: ${post.content?.substring(0, 50)}...`);
      console.log(`  User.username: ${post.User?.username}`);
      console.log(`  User.profilePhoto exists: ${!!post.User?.profilePhoto}`);
    });
    
  } catch (error) {
    console.error('Error checking avatar data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvatarData();
