const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function fixDatabase() {
  console.log('🔧 Starting database fix...');
  
  // Check if dev.db exists
  const dbPath = path.resolve('./dev.db');
  console.log(`📍 Database path: ${dbPath}`);
  console.log(`📁 Database exists: ${fs.existsSync(dbPath)}`);
  
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`📊 Database size: ${stats.size} bytes`);
  }
  
  // Initialize Prisma
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Try to create tables by running a simple query that will force table creation
    await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
    
    console.log('✅ Database connection successful');
    
    // Try to count users (this will create tables if they don't exist)
    try {
      const userCount = await prisma.user.count();
      console.log(`👥 User count: ${userCount}`);
    } catch (error) {
      console.log('❌ User table error:', error.message);
      
      // Force create tables using raw SQL
      console.log('🔨 Creating tables manually...');
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT,
          "email" TEXT,
          "emailVerified" DATETIME,
          "image" TEXT,
          "profilePhoto" TEXT,
          "username" TEXT,
          "bio" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        )
      `;
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "posts" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "content" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "mediaUrl" TEXT,
          "mediaType" TEXT,
          "transcription" TEXT,
          "transcriptionStatus" TEXT DEFAULT 'pending',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `;
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Account" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "providerAccountId" TEXT NOT NULL,
          "refresh_token" TEXT,
          "access_token" TEXT,
          "expires_at" INTEGER,
          "token_type" TEXT,
          "scope" TEXT,
          "id_token" TEXT,
          "session_state" TEXT,
          CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `;
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionToken" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "expires" DATETIME NOT NULL,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `;
      
      console.log('✅ Tables created manually');
    }
    
    // Test post table
    try {
      const postCount = await prisma.post.count();
      console.log(`📝 Post count: ${postCount}`);
    } catch (error) {
      console.log('❌ Post table error:', error.message);
    }
    
    console.log('🎉 Database fix complete!');
    
  } catch (error) {
    console.error('💥 Database fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase().catch(console.error);
