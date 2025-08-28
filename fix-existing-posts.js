const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db"
    }
  }
});

async function fixExistingPosts() {
  try {
    console.log('=== FIXING EXISTING POSTS ===');
    
    // First, find all users and their correct data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        profilePhoto: true
      }
    });
    
    console.log('Found users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.username}) -> ${user.profilePhoto ? 'Has photo' : 'No photo'}`);
    });
    
    // Find all posts and their current user associations
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        userId: true,
        content: true,
        User: {
          select: {
            id: true,
            email: true,
            username: true,
            profilePhoto: true
          }
        }
      }
    });
    
    console.log('\nFound posts:');
    posts.forEach(post => {
      console.log(`Post ${post.id}: userId=${post.userId}, user=${post.User?.email || 'NOT FOUND'}`);
    });
    
    // Check for orphaned posts (posts with userId that doesn't exist)
    const orphanedPosts = posts.filter(post => !post.User);
    
    if (orphanedPosts.length > 0) {
      console.log(`\nFound ${orphanedPosts.length} orphaned posts (no matching user)`);
      
      // If there's only one user, link orphaned posts to that user
      if (users.length === 1) {
        const targetUser = users[0];
        console.log(`Linking all orphaned posts to user: ${targetUser.email}`);
        
        for (const post of orphanedPosts) {
          await prisma.post.update({
            where: { id: post.id },
            data: { userId: targetUser.id }
          });
          console.log(`✅ Updated post ${post.id} -> user ${targetUser.id}`);
        }
      } else {
        console.log('Multiple users found. Cannot auto-link orphaned posts.');
        console.log('Please manually specify which user should own the orphaned posts.');
      }
    } else {
      console.log('\n✅ All posts are properly linked to existing users');
    }
    
    // Final verification
    const updatedPosts = await prisma.post.findMany({
      select: {
        id: true,
        User: {
          select: {
            email: true,
            username: true,
            profilePhoto: true
          }
        }
      }
    });
    
    console.log('\n=== FINAL STATE ===');
    updatedPosts.forEach(post => {
      const hasPhoto = post.User?.profilePhoto ? '✅ Has photo' : '❌ No photo';
      console.log(`Post ${post.id}: ${post.User?.email} ${hasPhoto}`);
    });
    
  } catch (error) {
    console.error('Error fixing posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingPosts();
