const { PrismaClient } = require('@prisma/client');

process.chdir('c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot');

const prisma = new PrismaClient();

async function debugUserSession() {
  try {
    console.log('=== SESSION vs DATABASE DEBUG ===');
    
    const users = await prisma.user.findMany();
    console.log(`Total users in database: ${users.length}`);
    
    users.forEach(user => {
      console.log(`\n--- User ${user.id} ---`);
      console.log(`Email: ${user.email}`);
      console.log(`Username: ${user.username || 'NULL'}`);
      console.log(`Name: ${user.name || 'NULL'}`);
      console.log(`ProfilePhoto: ${user.profilePhoto ? 'HAS DATA' : 'NULL'}`);
      console.log(`OAuth Image: ${user.image ? 'HAS DATA' : 'NULL'}`);
      
      if (user.image) {
        console.log(`Image URL: ${user.image}`);
      }
    });
    
    // Test what the API returns
    const posts = await prisma.post.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: 2
    });
    
    console.log(`\n=== API POST DATA ===`);
    posts.forEach(post => {
      const user = post.User;
      console.log(`\nPost ${post.id}:`);
      console.log(`  UserId: ${post.userId}`);
      console.log(`  User attached: ${!!user}`);
      
      if (user) {
        console.log(`  User.email: ${user.email}`);
        console.log(`  User.username: ${user.username}`);
        console.log(`  User.profilePhoto: ${user.profilePhoto ? 'EXISTS' : 'NULL'}`);
        console.log(`  User.image: ${user.image ? 'EXISTS' : 'NULL'}`);
        
        // This is what the frontend will see
        const avatarUrl = user.profilePhoto || user.image || '/avatar-placeholder.svg';
        console.log(`  Final avatar URL: ${avatarUrl}`);
        console.log(`  Will show: ${avatarUrl === '/avatar-placeholder.svg' ? 'PLACEHOLDER' : 'REAL PHOTO'}`);
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserSession();
