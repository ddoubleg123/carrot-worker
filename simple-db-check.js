const { PrismaClient } = require('@prisma/client');

process.chdir('c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot');

const prisma = new PrismaClient();

async function simpleCheck() {
  try {
    console.log('Starting database check...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        profilePhoto: true,
        image: true
      }
    });
    
    console.log('=== USERS ===');
    console.log('Found', users.length, 'users');
    users.forEach(user => {
      console.log(`User: ${user.email} (${user.username})`);
      console.log(`  profilePhoto: ${user.profilePhoto ? 'HAS DATA' : 'NULL'}`);
      console.log(`  image: ${user.image ? 'HAS DATA' : 'NULL'}`);
    });
    
    const posts = await prisma.post.findMany({
      include: {
        User: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
            image: true
          }
        }
      }
    });
    
    console.log('\n=== POSTS ===');
    posts.forEach(post => {
      console.log(`Post ${post.id}:`);
      console.log(`  userId: ${post.userId}`);
      console.log(`  User found: ${!!post.User}`);
      if (post.User) {
        console.log(`  User.username: ${post.User.username}`);
        console.log(`  User.profilePhoto: ${post.User.profilePhoto ? 'EXISTS' : 'NULL'}`);
        console.log(`  User.image: ${post.User.image ? 'EXISTS' : 'NULL'}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleCheck();
