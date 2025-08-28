// Set the correct working directory and database path
process.chdir('c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot');

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Change to carrot directory to ensure correct database path
process.chdir(path.join(__dirname, 'carrot'));

const prisma = new PrismaClient();

async function checkUserPhoto() {
  try {
    console.log('=== DATABASE AVATAR DEBUG ===');
    console.log('Current directory:', process.cwd());
    console.log('Database file exists:', fs.existsSync('dev.db'));
    
    const users = await prisma.user.findMany();
    console.log(`\nFound ${users.length} users:`);
    
    users.forEach(user => {
      console.log(`\n--- User: ${user.email} ---`);
      console.log(`Username: ${user.username}`);
      console.log(`ProfilePhoto: ${user.profilePhoto ? `EXISTS (${user.profilePhoto.length} chars)` : 'NULL'}`);
      console.log(`Image: ${user.image ? `EXISTS (${user.image.length} chars)` : 'NULL'}`);
      
      if (user.profilePhoto) {
        console.log(`ProfilePhoto starts with: ${user.profilePhoto.substring(0, 50)}...`);
      }
      if (user.image) {
        console.log(`Image starts with: ${user.image.substring(0, 50)}...`);
      }
    });
    
    const posts = await prisma.post.findMany({
      include: {
        User: true
      }
    });
    
    console.log(`\n=== POSTS (${posts.length}) ===`);
    posts.forEach(post => {
      const user = post.User;
      const avatar = user?.profilePhoto || user?.image || '/avatar-placeholder.svg';
      
      console.log(`\nPost ${post.id}:`);
      console.log(`  Content: ${post.content?.substring(0, 30)}...`);
      console.log(`  UserId: ${post.userId}`);
      console.log(`  User exists: ${!!user}`);
      console.log(`  Username: ${user?.username || 'N/A'}`);
      console.log(`  Avatar source: ${avatar === '/avatar-placeholder.svg' ? 'PLACEHOLDER' : 'USER PHOTO'}`);
      
      if (user?.profilePhoto) {
        console.log(`  ✓ Has profilePhoto (${user.profilePhoto.length} chars)`);
      }
      if (user?.image) {
        console.log(`  ✓ Has OAuth image (${user.image.length} chars)`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPhoto();
