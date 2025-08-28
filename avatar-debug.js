const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./carrot/dev.db"
    }
  }
});

async function debugAvatar() {
  try {
    console.log('=== AVATAR DEBUG ===');
    
    const users = await prisma.user.findMany();
    console.log(`Users found: ${users.length}`);
    
    users.forEach(user => {
      console.log(`\nUser: ${user.email}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  ProfilePhoto: ${user.profilePhoto ? 'HAS DATA (' + user.profilePhoto.length + ' chars)' : 'NULL'}`);
      console.log(`  Image: ${user.image ? 'HAS DATA (' + user.image.length + ' chars)' : 'NULL'}`);
      
      if (user.profilePhoto) {
        console.log(`  ProfilePhoto preview: ${user.profilePhoto.substring(0, 80)}...`);
      }
    });
    
    const posts = await prisma.post.findMany({
      include: {
        User: true
      }
    });
    
    console.log(`\n=== POSTS (${posts.length}) ===`);
    posts.forEach(post => {
      const avatar = post.User?.profilePhoto || post.User?.image || '/avatar-placeholder.svg';
      console.log(`Post ${post.id}:`);
      console.log(`  Content: ${post.content?.substring(0, 40)}...`);
      console.log(`  User: ${post.User?.username || 'NO USER'}`);
      console.log(`  Avatar will be: ${avatar === '/avatar-placeholder.svg' ? 'PLACEHOLDER' : 'ACTUAL PHOTO'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugAvatar();
