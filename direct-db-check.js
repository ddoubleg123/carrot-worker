const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('=== DATABASE CONNECTION TEST ===');
    
    // Test basic connection
    const count = await prisma.post.count();
    console.log('✅ Database connected. Total posts:', count);
    
    // Search for the specific post
    console.log('\n=== SEARCHING FOR POST ===');
    const targetPost = await prisma.post.findUnique({
      where: { id: 'cmeuaq0d000034s1s03e6aqz9' }
    });
    
    if (targetPost) {
      console.log('✅ POST FOUND:');
      console.log('ID:', targetPost.id);
      console.log('Content:', targetPost.content);
      console.log('Status:', targetPost.transcriptionStatus);
      console.log('Has Video:', targetPost.hasVideo);
      console.log('Has Audio:', targetPost.hasAudio);
      console.log('Video URL:', targetPost.videoUrl ? 'Present' : 'Missing');
      console.log('Audio URL:', targetPost.audioUrl ? 'Present' : 'Missing');
      console.log('Transcription:', targetPost.audioTranscription ? 'Present' : 'Missing');
      console.log('Created:', targetPost.createdAt);
      console.log('Updated:', targetPost.updatedAt);
      
      if (targetPost.videoUrl) {
        console.log('\nVideo URL:', targetPost.videoUrl.substring(0, 100) + '...');
      }
      if (targetPost.audioUrl) {
        console.log('Audio URL:', targetPost.audioUrl.substring(0, 100) + '...');
      }
      if (targetPost.audioTranscription) {
        console.log('Transcription:', targetPost.audioTranscription.substring(0, 200) + '...');
      }
      
      // Analysis
      console.log('\n=== TRANSCRIPTION ANALYSIS ===');
      if (targetPost.transcriptionStatus === 'pending') {
        if (targetPost.hasVideo && !targetPost.audioUrl) {
          console.log('❌ ISSUE: Video post has no audio URL');
          console.log('   - Audio extraction from video failed or never happened');
          console.log('   - Transcription service needs audio URL to work');
        } else if (targetPost.audioUrl) {
          console.log('✅ Has audio URL - can trigger transcription');
          console.log('   - Post is ready for transcription processing');
        } else {
          console.log('❌ No audio or video URL available');
        }
      } else if (targetPost.transcriptionStatus === 'completed') {
        console.log('✅ Transcription already completed');
      } else {
        console.log('Status:', targetPost.transcriptionStatus);
      }
      
    } else {
      console.log('❌ POST NOT FOUND');
      
      // Search for similar IDs
      const similarPosts = await prisma.post.findMany({
        where: {
          id: {
            contains: 'cmeuaq0d'
          }
        },
        select: {
          id: true,
          content: true,
          createdAt: true
        }
      });
      
      if (similarPosts.length > 0) {
        console.log('\nFound similar post IDs:');
        similarPosts.forEach(post => {
          console.log('- ' + post.id + ' | ' + post.content.substring(0, 30) + '...');
        });
      } else {
        console.log('\nNo posts found with similar ID pattern');
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
