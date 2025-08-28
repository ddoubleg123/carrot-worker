const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db"
    }
  }
});

async function debugUserSession() {
  try {
    console.log('=== DATABASE DEBUG ===');
    
    // Check all users in database
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        isOnboarded: true,
        createdAt: true
      }
    });
    
    console.log('All users in database:');
    console.log(JSON.stringify(allUsers, null, 2));
    
    // Check accounts table
    const allAccounts = await prisma.account.findMany({
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true
      }
    });
    
    console.log('\nAll accounts in database:');
    console.log(JSON.stringify(allAccounts, null, 2));
    
    // Check sessions table
    const allSessions = await prisma.session.findMany({
      select: {
        id: true,
        userId: true,
        sessionToken: true,
        expires: true
      }
    });
    
    console.log('\nAll sessions in database:');
    console.log(JSON.stringify(allSessions, null, 2));
    
  } catch (error) {
    console.error('Database debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserSession();
