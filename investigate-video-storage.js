const { PrismaClient } = require('@prisma/client');

// Check multiple possible database locations
const dbPaths = [
  "file:./carrot/prisma/dev.db",
  "file:./prisma/dev.db", 
  "file:./dev.db"
];

async function investigateVideoStorage() {
  console.log('🔍 Investigating video storage locations...\n');
  
  for (const dbPath of dbPaths) {
    console.log(`\n📁 Checking database: ${dbPath}`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url: dbPath }
      }
    });
    
    try {
      // Check if database is accessible
      const postCount = await prisma.post.count();
      console.log(`  Total posts: ${postCount}`);
      
      if (postCount > 0) {
        // Find posts with videos
        const videoPosts = await prisma.post.findMany({
          where: {
            videoUrl: { not: null }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            content: true,
            videoUrl: true,
            transcriptionStatus: true,
            createdAt: true,
            User: {
              select: { email: true }
            }
          }
        });
        
        console.log(`  Posts with videos: ${videoPosts.length}`);
        
        videoPosts.forEach((post, index) => {
          console.log(`\n  📹 Video Post ${index + 1}:`);
          console.log(`    ID: ${post.id}`);
          console.log(`    Created: ${post.createdAt}`);
          console.log(`    User: ${post.User?.email || 'Unknown'}`);
          console.log(`    Status: ${post.transcriptionStatus || 'none'}`);
          console.log(`    Content: ${post.content?.substring(0, 50) || 'No content'}...`);
          
          if (post.videoUrl) {
            try {
              const url = new URL(post.videoUrl);
              console.log(`    Storage: ${url.hostname}`);
              
              // Parse Firebase Storage URL
              if (url.hostname.includes('firebasestorage')) {
                const pathParts = url.pathname.split('/');
                const objectIndex = pathParts.indexOf('o');
                if (objectIndex !== -1 && objectIndex + 1 < pathParts.length) {
                  const encodedPath = pathParts[objectIndex + 1];
                  const decodedPath = decodeURIComponent(encodedPath);
                  console.log(`    Path: ${decodedPath}`);
                  
                  // Extract folder structure
                  const segments = decodedPath.split('/');
                  if (segments.length >= 2) {
                    console.log(`    Structure: ${segments[0]}/${segments[1]}/...`);
                  }
                }
              }
            } catch (urlError) {
              console.log(`    Invalid URL format`);
            }
          }
        });
        
        // Check for posts without videos but with other media
        const otherMediaPosts = await prisma.post.findMany({
          where: {
            videoUrl: null,
            OR: [
              { content: { contains: 'http' } },
              { content: { contains: 'firebase' } },
              { content: { contains: 'storage' } }
            ]
          },
          take: 3,
          select: {
            id: true,
            content: true,
            createdAt: true
          }
        });
        
        if (otherMediaPosts.length > 0) {
          console.log(`\n  📄 Posts with potential media references: ${otherMediaPosts.length}`);
          otherMediaPosts.forEach(post => {
            console.log(`    ${post.id}: ${post.content?.substring(0, 100)}...`);
          });
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error accessing database: ${error.message}`);
    } finally {
      await prisma.$disconnect();
    }
  }
  
  // Check for Firebase configuration
  console.log('\n🔥 Checking Firebase configuration...');
  const fs = require('fs');
  const path = require('path');
  
  const configFiles = [
    './carrot/firebase.json',
    './firebase.json',
    './carrot/.firebaserc',
    './.firebaserc'
  ];
  
  for (const configFile of configFiles) {
    if (fs.existsSync(configFile)) {
      console.log(`  ✅ Found: ${configFile}`);
      try {
        const content = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(content);
        if (config.storage) {
          console.log(`    Storage config: ${JSON.stringify(config.storage, null, 2)}`);
        }
        if (config.projects) {
          console.log(`    Projects: ${JSON.stringify(config.projects)}`);
        }
      } catch (parseError) {
        console.log(`    Could not parse JSON`);
      }
    }
  }
  
  // Check for storage rules
  const storageRulesFiles = [
    './carrot/storage.rules',
    './storage.rules'
  ];
  
  for (const rulesFile of storageRulesFiles) {
    if (fs.existsSync(rulesFile)) {
      console.log(`  ✅ Found storage rules: ${rulesFile}`);
    }
  }
}

investigateVideoStorage().catch(console.error);
