const { PrismaClient } = require('@prisma/client');

async function debugTranscriptionStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking transcription status in database...\n');
    
    // Get all posts with media
    const mediaPosts = await prisma.post.findMany({
      where: {
        OR: [
          { audioUrl: { not: null } },
          { videoUrl: { not: null } }
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
      },
      take: 10
    });
    
    console.log(`📊 Found ${mediaPosts.length} posts with audio/video\n`);
    
    if (mediaPosts.length === 0) {
      console.log('❌ No audio/video posts found in database');
      return;
    }
    
    let processingCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let nullCount = 0;
    
    mediaPosts.forEach((post, index) => {
      console.log(`=== POST ${index + 1} ===`);
      console.log(`ID: ${post.id}`);
      console.log(`User: ${post.User?.username || post.User?.email || 'Unknown'}`);
      console.log(`Content: ${post.content?.substring(0, 50) || 'No content'}...`);
      console.log(`Has Audio: ${post.audioUrl ? 'YES' : 'NO'}`);
      console.log(`Has Video: ${post.videoUrl ? 'YES' : 'NO'}`);
      console.log(`Transcription Status: ${post.transcriptionStatus || 'NULL'}`);
      
      if (post.transcriptionStatus === 'processing') processingCount++;
      else if (post.transcriptionStatus === 'completed') completedCount++;
      else if (post.transcriptionStatus === 'failed') failedCount++;
      else nullCount++;
      
      if (post.audioTranscription) {
        console.log(`Transcription: ${post.audioTranscription.substring(0, 100)}...`);
      } else {
        console.log(`Transcription: NULL`);
      }
      console.log(`Created: ${post.createdAt}`);
      console.log('');
    });
    
    console.log('📈 SUMMARY:');
    console.log(`Processing: ${processingCount}`);
    console.log(`Completed: ${completedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`No Status: ${nullCount}`);
    
    if (processingCount > 0) {
      console.log('\n⚠️ ISSUE: Posts stuck at "processing" status');
      console.log('This means transcription was triggered but never completed');
    }
    
  } catch (error) {
    console.error('❌ Error checking transcription status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTranscriptionStatus();
