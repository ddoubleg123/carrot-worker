const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Find posts with video URLs (Firebase Storage URLs)
    const videoPosts = await prisma.post.findMany({
      where: {
        OR: [
          { videoUrl: { not: null } },
          { hasVideo: true }
        ]
      },
      select: {
        id: true,
        transcriptionStatus: true,
        hasVideo: true,
        videoUrl: true,
        audioTranscription: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('POSTS WITH VIDEO DATA:');
    console.log('Found', videoPosts.length, 'video posts');
    console.log('');
    
    videoPosts.forEach((post, index) => {
      console.log(`${index + 1}. POST ID: ${post.id}`);
      console.log(`   Status: ${post.transcriptionStatus}`);
      console.log(`   Has Video: ${post.hasVideo}`);
      console.log(`   Video URL: ${post.videoUrl ? 'Present (Firebase)' : 'Missing'}`);
      console.log(`   Transcription: ${post.audioTranscription ? 'Present' : 'Missing'}`);
      console.log(`   Created: ${post.createdAt.toISOString()}`);
      console.log(`   Updated: ${post.updatedAt.toISOString()}`);
      
      if (post.videoUrl) {
        console.log(`   URL Preview: ${post.videoUrl.substring(0, 80)}...`);
      }
      console.log('');
    });
    
    // Find posts that need transcription
    const needsTranscription = videoPosts.filter(p => 
      p.videoUrl && 
      (p.transcriptionStatus === 'pending' || p.transcriptionStatus === 'failed')
    );
    
    if (needsTranscription.length > 0) {
      console.log('POSTS NEEDING TRANSCRIPTION:');
      needsTranscription.forEach(post => {
        console.log(`- ${post.id} (${post.transcriptionStatus})`);
      });
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
