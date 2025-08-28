const { PrismaClient } = require('@prisma/client');

async function checkUserDaniel() {
  console.log('🔍 Checking for user danielgouldman@gmail.com...\n');
  
  // Check the correct database location
  const prisma = new PrismaClient({
    datasources: {
      db: { url: "file:./carrot/prisma/dev.db" }
    }
  });
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: "danielgouldman@gmail.com" },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        isOnboarded: true,
        profilePhoto: true,
        image: true,
        createdAt: true
      }
    });
    
    if (user) {
      console.log('✅ USER FOUND:');
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Username: ${user.username}`);
      console.log(`Is Onboarded: ${user.isOnboarded}`);
      console.log(`Profile Photo: ${user.profilePhoto ? 'Present' : 'Missing'}`);
      console.log(`OAuth Image: ${user.image ? 'Present' : 'Missing'}`);
      console.log(`Created: ${user.createdAt}`);
    } else {
      console.log('❌ USER NOT FOUND');
      
      // Check all users
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isOnboarded: true
        }
      });
      
      console.log(`\n📋 All users in database (${allUsers.length}):`);
      allUsers.forEach(u => {
        console.log(`  ${u.email} - ${u.name} - Onboarded: ${u.isOnboarded}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserDaniel();
