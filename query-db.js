const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function queryDatabase() {
  try {
    console.log('🔍 Querying database for post cmesymu0t00054s98wnya4ae5...\n');
    
    const post = await prisma.post.findUnique({
      where: { id: 'cmesymu0t00054s98wnya4ae5' },
      select: {
        id: true,
        content: true,
        transcriptionStatus: true,
        audioTranscription: true,
        hasAudio: true,
        hasVideo: true,
        audioUrl: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (post) {
      console.log('✅ Post found:');
      console.log(JSON.stringify(post, null, 2));
      
      console.log('\n📊 Summary:');
      console.log(`Status: ${post.transcriptionStatus}`);
      console.log(`Has transcription: ${!!post.audioTranscription}`);
      if (post.audioTranscription) {
        console.log(`Transcription text: "${post.audioTranscription}"`);
      }
    } else {
      console.log('❌ Post not found');
    }

    // Also check all posts to see what's in the database
    console.log('\n🗂️ All posts in database:');
    const allPosts = await prisma.post.findMany({
      select: {
        id: true,
        content: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    allPosts.forEach(p => {
      console.log(`- ${p.id}: "${p.content}" (${p.transcriptionStatus}) ${p.audioTranscription ? '[HAS_TRANSCRIPTION]' : '[NO_TRANSCRIPTION]'}`);
    });

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryDatabase();
