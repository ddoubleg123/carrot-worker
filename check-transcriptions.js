const { PrismaClient } = require('@prisma/client');

async function checkTranscriptions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database for transcriptions...\n');
    
    // Get all posts with transcription data
    const postsWithTranscription = await prisma.post.findMany({
      where: {
        OR: [
          { audioTranscription: { not: null } },
          { transcriptionStatus: { not: null } }
        ]
      },
      select: {
        id: true,
        content: true,
        audioUrl: true,
        videoUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true,
        User: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${postsWithTranscription.length} posts with transcription data\n`);
    
    if (postsWithTranscription.length === 0) {
      console.log('❌ No transcriptions found in database');
      console.log('💡 This means either:');
      console.log('   - No audio/video posts have been uploaded');
      console.log('   - Transcription system is not triggering');
      console.log('   - Database updates are failing');
    } else {
      postsWithTranscription.forEach((post, index) => {
        console.log(`=== POST ${index + 1} ===`);
        console.log(`ID: ${post.id}`);
        console.log(`User: ${post.User?.username || post.User?.email || 'Unknown'}`);
        console.log(`Content: ${post.content?.substring(0, 50) || 'No content'}...`);
        console.log(`Audio URL: ${post.audioUrl ? 'Present' : 'None'}`);
        console.log(`Video URL: ${post.videoUrl ? 'Present' : 'None'}`);
        console.log(`Transcription Status: ${post.transcriptionStatus || 'null'}`);
        console.log(`Transcription Text: ${post.audioTranscription?.substring(0, 100) || 'null'}...`);
        console.log(`Created: ${post.createdAt}`);
        console.log('');
      });
    }
    
    // Check posts with media but no transcription
    const mediaPostsNoTranscription = await prisma.post.findMany({
      where: {
        OR: [
          { audioUrl: { not: null } },
          { videoUrl: { not: null } }
        ],
        AND: [
          { audioTranscription: null },
          { transcriptionStatus: null }
        ]
      },
      select: {
        id: true,
        content: true,
        audioUrl: true,
        videoUrl: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (mediaPostsNoTranscription.length > 0) {
      console.log(`⚠️  Found ${mediaPostsNoTranscription.length} media posts WITHOUT transcription data:`);
      mediaPostsNoTranscription.forEach((post, index) => {
        console.log(`${index + 1}. Post ${post.id} - ${post.audioUrl ? 'Audio' : 'Video'} - Created: ${post.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking transcriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTranscriptions();
