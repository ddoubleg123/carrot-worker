const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

async function findPosts() {
  console.log('🔍 Finding posts and database locations...\n');
  
  // Check possible database paths from root directory
  const dbPaths = [
    "file:./carrot/prisma/dev.db",    // carrot/prisma/dev.db
    "file:./prisma/dev.db",           // windsurf-project/prisma/dev.db  
    "file:./dev.db"                   // windsurf-project/dev.db
  ];
  
  console.log('📁 Checking database file existence:');
  const dbFiles = [
    './carrot/prisma/dev.db',
    './prisma/dev.db', 
    './dev.db'
  ];
  
  for (const dbFile of dbFiles) {
    const fullPath = path.resolve(dbFile);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${dbFile} -> ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (exists) {
      const stats = fs.statSync(fullPath);
      console.log(`    Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
    }
  }
  
  console.log('\n🔍 Checking databases for posts...\n');
  
  for (const dbPath of dbPaths) {
    console.log(`📁 Testing: ${dbPath}`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url: dbPath }
      }
    });
    
    try {
      const postCount = await prisma.post.count();
      console.log(`  Total posts: ${postCount}`);
      
      if (postCount > 0) {
        // Check for the specific post
        const targetPost = await prisma.post.findUnique({
          where: { id: "cmeuhi90r00014smsh2xonfht" },
          include: { User: { select: { name: true, email: true } } }
        });
        
        if (targetPost) {
          console.log(`  ✅ FOUND TARGET POST: cmeuhi90r00014smsh2xonfht`);
          console.log(`    Content: ${targetPost.content}`);
          console.log(`    User: ${targetPost.User?.name || targetPost.User?.email}`);
          console.log(`    Created: ${targetPost.createdAt}`);
          console.log(`    Video: ${targetPost.videoUrl ? 'Present' : 'Missing'}`);
          console.log(`    Status: ${targetPost.transcriptionStatus}`);
          
          if (targetPost.videoUrl) {
            console.log(`    Video URL: ${targetPost.videoUrl.substring(0, 100)}...`);
          }
        } else {
          console.log(`  ❌ Target post NOT FOUND`);
        }
        
        // Show recent posts
        const recentPosts = await prisma.post.findMany({
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            content: true,
            videoUrl: true,
            transcriptionStatus: true,
            createdAt: true,
            User: { select: { name: true, email: true } }
          }
        });
        
        console.log(`\n  📋 Recent posts in this database:`);
        recentPosts.forEach((post, index) => {
          console.log(`    ${index + 1}. ${post.id}`);
          console.log(`       User: ${post.User?.name || post.User?.email || 'Unknown'}`);
          console.log(`       Video: ${post.videoUrl ? 'Yes' : 'No'}`);
          console.log(`       Status: ${post.transcriptionStatus || 'None'}`);
          console.log(`       Created: ${post.createdAt}`);
          console.log(`       Content: ${post.content?.substring(0, 50) || 'No content'}...`);
          console.log('');
        });
        
        // This is the correct database - save this info
        if (targetPost || recentPosts.length > 0) {
          console.log(`\n🎯 CORRECT DATABASE FOUND: ${dbPath}`);
          console.log(`   Use this path for transcription service database connections.`);
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } finally {
      await prisma.$disconnect();
    }
  }
}

findPosts().catch(console.error);
