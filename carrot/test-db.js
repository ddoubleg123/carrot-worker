const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
  });
  
  try {
    console.log('Testing database connection...');
    
    // Test post count
    const postCount = await prisma.post.count();
    console.log(`✅ Posts table exists - count: ${postCount}`);
    
    // Test user count
    const userCount = await prisma.user.count();
    console.log(`✅ Users table exists - count: ${userCount}`);
    
    console.log('🎉 Database is working!');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
