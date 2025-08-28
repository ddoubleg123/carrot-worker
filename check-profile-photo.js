const { PrismaClient } = require('@prisma/client');

process.chdir('c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot');

const prisma = new PrismaClient();

async function checkProfilePhoto() {
  try {
    console.log('=== PROFILE PHOTO DEBUG ===');
    
    const users = await prisma.user.findMany();
    console.log(`Total users: ${users.length}`);
    
    users.forEach(user => {
      console.log(`\n--- User ${user.id} ---`);
      console.log(`Email: ${user.email}`);
      console.log(`Username: ${user.username}`);
      console.log(`ProfilePhoto exists: ${!!user.profilePhoto}`);
      
      if (user.profilePhoto) {
        console.log(`ProfilePhoto length: ${user.profilePhoto.length} chars`);
        console.log(`ProfilePhoto type: ${user.profilePhoto.startsWith('data:') ? 'base64' : 'URL'}`);
        console.log(`ProfilePhoto preview: ${user.profilePhoto.substring(0, 100)}...`);
      } else {
        console.log(`ProfilePhoto: NULL`);
      }
    });
    
    // Check what posts API returns
    const posts = await prisma.post.findMany({
      include: { 
        User: {
          select: {
            id: true,
            email: true,
            username: true,
            profilePhoto: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });
    
    console.log(`\n=== POST API DATA ===`);
    posts.forEach(post => {
      const user = post.User;
      console.log(`\nPost ${post.id}:`);
      console.log(`  UserId: ${post.userId}`);
      console.log(`  User found: ${!!user}`);
      
      if (user) {
        console.log(`  User.profilePhoto: ${user.profilePhoto ? 'EXISTS' : 'NULL'}`);
        console.log(`  User.image: ${user.image ? 'EXISTS' : 'NULL'}`);
        
        if (user.profilePhoto) {
          console.log(`  ProfilePhoto length: ${user.profilePhoto.length}`);
          console.log(`  ProfilePhoto type: ${user.profilePhoto.startsWith('data:') ? 'base64' : 'URL'}`);
        }
        
        const avatar = user.profilePhoto || user.image || '/avatar-placeholder.svg';
        console.log(`  Avatar will be: ${avatar === '/avatar-placeholder.svg' ? 'PLACEHOLDER' : 'CUSTOM PHOTO'}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfilePhoto();
