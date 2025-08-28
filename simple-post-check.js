const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const post = await prisma.post.findUnique({
      where: { id: 'cmeuaq0d000034s1s03e6aqz9' }
    });
    
    if (post) {
      console.log('=== POST FOUND ===');
      console.log('ID:', post.id);
      console.log('Content:', post.content);
      console.log('Status:', post.transcriptionStatus);
      console.log('Has Video:', post.hasVideo);
      console.log('Has Audio:', post.hasAudio);
      console.log('Video URL:', post.videoUrl ? 'YES' : 'NO');
      console.log('Audio URL:', post.audioUrl ? 'YES' : 'NO');
      console.log('Transcription:', post.audioTranscription ? 'YES' : 'NO');
      console.log('Created:', post.createdAt);
      console.log('Updated:', post.updatedAt);
      
      if (post.videoUrl) {
        console.log('\nVideo URL:', post.videoUrl.substring(0, 100) + '...');
      }
      if (post.audioUrl) {
        console.log('Audio URL:', post.audioUrl.substring(0, 100) + '...');
      }
      if (post.audioTranscription) {
        console.log('Transcription Text:', post.audioTranscription.substring(0, 200) + '...');
      }
      
      // Analysis
      if (post.transcriptionStatus === 'pending' && post.hasVideo && !post.audioTranscription) {
        console.log('\n=== ANALYSIS ===');
        console.log('❌ ISSUE: Video post stuck in pending status');
        
        if (!post.audioUrl && post.videoUrl) {
          console.log('❌ ROOT CAUSE: Video exists but no audio URL');
          console.log('   This means audio extraction from video failed or never happened');
          console.log('   The transcription service needs an audio URL to work');
        } else if (post.audioUrl) {
          console.log('✅ Has audio URL - can trigger transcription manually');
        }
      }
      
    } else {
      console.log('❌ POST NOT FOUND');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
