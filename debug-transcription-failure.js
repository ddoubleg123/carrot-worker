// Debug why transcription is failing for the specific post
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTranscription() {
  try {
    const postId = 'cmervqq7l00094s0wdky56gix';
    
    console.log(`🔍 Debugging transcription for post: ${postId}`);
    
    // Get the actual post data including video URL
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        videoUrl: true,
        audioUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!post) {
      console.log('❌ Post not found');
      return;
    }
    
    console.log('\n📊 Post Data:');
    console.log('Video URL:', post.videoUrl || 'None');
    console.log('Audio URL:', post.audioUrl || 'None');
    console.log('Transcription Status:', post.transcriptionStatus || 'null');
    console.log('Created:', post.createdAt);
    console.log('Updated:', post.updatedAt);
    
    // Test if we can access the video URL
    if (post.videoUrl) {
      console.log('\n🌐 Testing video URL access...');
      try {
        const fetch = require('node-fetch');
        const response = await fetch(post.videoUrl, { method: 'HEAD' });
        console.log('Video URL Status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
        console.log('Content-Length:', response.headers.get('content-length'));
        
        if (!response.ok) {
          console.log('❌ Video URL not accessible - this is why transcription failed');
        } else {
          console.log('✅ Video URL is accessible');
        }
      } catch (urlError) {
        console.log('❌ Error accessing video URL:', urlError.message);
      }
    }
    
    // Now manually trigger transcription with the correct URL
    if (post.videoUrl) {
      console.log('\n🔄 Manually triggering transcription with actual video URL...');
      
      const fetch = require('node-fetch');
      const triggerResponse = await fetch('http://localhost:3005/api/audio/trigger-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: postId,
          audioUrl: post.videoUrl // Use actual video URL
        })
      });
      
      const result = await triggerResponse.json();
      console.log('Trigger Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugTranscription();
