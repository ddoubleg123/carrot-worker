const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function forceCreateTables() {
  console.log('🔧 Force creating database tables...');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    // Delete existing database file to start fresh
    const dbPath = path.resolve('./dev.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🗑️ Deleted existing database file');
    }
    
    console.log('🔨 Creating fresh database with tables...');
    
    // Create User table
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
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create posts table (matching schema.prisma @@map("posts"))
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "posts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "content" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "gradientDirection" TEXT,
        "gradientFromColor" TEXT,
        "gradientViaColor" TEXT,
        "gradientToColor" TEXT,
        "imageUrls" TEXT,
        "gifUrl" TEXT,
        "audioUrl" TEXT,
        "audioTranscription" TEXT,
        "transcriptionStatus" TEXT DEFAULT 'pending',
        "emoji" TEXT,
        "carrotText" TEXT,
        "stickText" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "thumbnailUrl" TEXT,
        "videoUrl" TEXT,
        "cf_uid" TEXT,
        "cf_status" TEXT,
        "cf_duration_sec" REAL,
        "cf_width" INTEGER,
        "cf_height" INTEGER,
        "cf_playback_url_hls" TEXT,
        "caption_vtt_url" TEXT,
        CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    
    // Create Account table
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
    
    // Create Session table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionToken" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "expires" DATETIME NOT NULL,
        CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;
    
    console.log('✅ All tables created successfully');
    
    // Test the tables
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    
    console.log(`👥 User count: ${userCount}`);
    console.log(`📝 Post count: ${postCount}`);
    console.log('🎉 Database is ready!');
    
  } catch (error) {
    console.error('💥 Error creating tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceCreateTables().catch(console.error);
