const { PrismaClient } = require('@prisma/client');

async function checkLatestPost() {
  console.log('🔍 Checking latest post in both databases...\n');
  
  // Check carrot/prisma/dev.db (where frontend reads from)
  console.log('📁 Frontend database (carrot/prisma/dev.db):');
  const frontendPrisma = new PrismaClient({
    datasources: {
      db: { url: "file:./carrot/prisma/dev.db" }
    }
  });
  
  try {
    const frontendPost = await frontendPrisma.post.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        videoUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true
      }
    });
    
    if (frontendPost) {
      console.log(`  Latest post: ${frontendPost.id}`);
      console.log(`  Content: ${frontendPost.content?.substring(0, 50)}...`);
      console.log(`  Video URL: ${frontendPost.videoUrl ? 'Present' : 'Missing'}`);
      console.log(`  Transcription Status: ${frontendPost.transcriptionStatus}`);
      console.log(`  Transcription Text: ${frontendPost.audioTranscription ? frontendPost.audioTranscription.substring(0, 100) + '...' : 'Missing'}`);
    } else {
      console.log('  No posts found');
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  } finally {
    await frontendPrisma.$disconnect();
  }
  
  // Check ../dev.db (where transcription was saved)
  console.log('\n📁 Transcription database (../dev.db):');
  const transcriptionPrisma = new PrismaClient({
    datasources: {
      db: { url: "file:../dev.db" }
    }
  });
  
  try {
    const transcriptionPost = await transcriptionPrisma.post.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        videoUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true
      }
    });
    
    if (transcriptionPost) {
      console.log(`  Latest post: ${transcriptionPost.id}`);
      console.log(`  Content: ${transcriptionPost.content?.substring(0, 50)}...`);
      console.log(`  Video URL: ${transcriptionPost.videoUrl ? 'Present' : 'Missing'}`);
      console.log(`  Transcription Status: ${transcriptionPost.transcriptionStatus}`);
      console.log(`  Transcription Text: ${transcriptionPost.audioTranscription ? transcriptionPost.audioTranscription.substring(0, 100) + '...' : 'Missing'}`);
    } else {
      console.log('  No posts found');
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  } finally {
    await transcriptionPrisma.$disconnect();
  }
}

checkLatestPost();
