// Check recent ingestion jobs to see if Firebase Storage uploads are working
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentJobs() {
  try {
    console.log('🔍 Checking recent ingestion jobs...\n');
    
    // Get the 5 most recent posts
    const recentPosts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        videoUrl: true,
        mediaUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (recentPosts.length === 0) {
      console.log('❌ No posts found in database');
      return;
    }
    
    console.log(`📊 Found ${recentPosts.length} recent posts:\n`);
    
    recentPosts.forEach((post, index) => {
      console.log(`${index + 1}. Post ID: ${post.id}`);
      console.log(`   Created: ${post.createdAt}`);
      console.log(`   Updated: ${post.updatedAt}`);
      console.log(`   Video URL: ${post.videoUrl ? 'Yes' : 'No'}`);
      console.log(`   Media URL (Firebase): ${post.mediaUrl ? '✅ YES' : '❌ NO'}`);
      console.log(`   Transcription Status: ${post.transcriptionStatus || 'null'}`);
      console.log(`   Has Transcription: ${post.audioTranscription ? 'Yes' : 'No'}`);
      
      if (post.mediaUrl) {
        console.log(`   🔥 Firebase Storage URL: ${post.mediaUrl}`);
      }
      
      console.log('');
    });
    
    // Summary
    const withMediaUrl = recentPosts.filter(p => p.mediaUrl).length;
    const withTranscription = recentPosts.filter(p => p.audioTranscription).length;
    
    console.log('📈 Summary:');
    console.log(`   Posts with Firebase Storage URL: ${withMediaUrl}/${recentPosts.length}`);
    console.log(`   Posts with transcription: ${withTranscription}/${recentPosts.length}`);
    
    if (withMediaUrl > 0) {
      console.log('\n✅ Firebase Storage uploads are working!');
    } else {
      console.log('\n❌ No Firebase Storage uploads found - check Railway logs');
    }
    
  } catch (error) {
    console.error('❌ Error checking jobs:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentJobs();
