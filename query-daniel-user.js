// Query specific user data from Prisma database
process.chdir('c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot');

const { PrismaClient } = require('@prisma/client');

process.chdir('c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot');

const prisma = new PrismaClient();

async function queryDanielUser() {
  try {
    console.log('=== USER DATA DEBUG ===');
    
    const users = await prisma.user.findMany();
    console.log(`Total users: ${users.length}`);
    
    users.forEach(user => {
      console.log(`\n--- User ${user.id} ---`);
      console.log(`Email: ${user.email}`);
      console.log(`Username: ${user.username}`);
      console.log(`Name: ${user.name}`);
      console.log(`ProfilePhoto: ${user.profilePhoto ? 'YES' : 'NO'}`);
      console.log(`OAuth Image: ${user.image ? 'YES' : 'NO'}`);
      
      if (user.image) {
        console.log(`Image URL: ${user.image}`);
      }
      if (user.profilePhoto) {
        console.log(`ProfilePhoto (first 50 chars): ${user.profilePhoto.substring(0, 50)}...`);
      }
    });
    
    // Check what the API would return
    const posts = await prisma.post.findMany({
      include: { User: true },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log(`\n=== RECENT POSTS ===`);
    posts.forEach(post => {
      const user = post.User;
      console.log(`\nPost ${post.id}:`);
      console.log(`  UserId: ${post.userId}`);
      console.log(`  Username: ${user?.username}`);
      console.log(`  Has profilePhoto: ${!!user?.profilePhoto}`);
      console.log(`  Has OAuth image: ${!!user?.image}`);
      console.log(`  Avatar priority: ${user?.profilePhoto ? 'profilePhoto' : user?.image ? 'OAuth image' : 'placeholder'}`);
      
      if (user?.image) {
        console.log(`  OAuth image URL: ${user.image}`);
      }
    });
    
    // Also check for any user with email containing 'daniel'
    const usersByEmail = await prisma.user.findMany({
      where: {
        email: {
          contains: 'daniel'
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        profilePhoto: true,
        isOnboarded: true,
        createdAt: true
      }
    });
    
    console.log('\n=== Users with email containing "daniel" ===');
    if (usersByEmail.length > 0) {
      usersByEmail.forEach((user, i) => {
        console.log(`User ${i + 1}:`, user);
      });
    } else {
      console.log('No users found with email containing "daniel"');
    }
    
    // Get total user count
    const totalUsers = await prisma.user.count();
    console.log('\n=== Database Stats ===');
    console.log('Total users in database:', totalUsers);
    
    // Get all users if count is small
    if (totalUsers <= 5) {
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          profilePhoto: true,
          isOnboarded: true
        }
      });
      console.log('\n=== All Users (since count is small) ===');
      allUsers.forEach((user, i) => {
        console.log(`User ${i + 1}:`, {
          ...user,
          profilePhoto: user.profilePhoto ? `${user.profilePhoto.substring(0, 50)}...` : null
        });
      });
    }
    
  } catch (error) {
    console.error('Database query error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryDanielUser();
