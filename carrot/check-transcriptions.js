const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTranscriptions() {
  try {
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { audioUrl: { not: null } },
          { videoUrl: { not: null } }
        ]
      },
      select: {
        id: true,
        audioUrl: true,
        videoUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${posts.length} audio/video posts:`);
    console.log('');

    posts.forEach(p => {
      const hasAudio = p.audioUrl ? 'AUDIO' : '';
      const hasVideo = p.videoUrl ? 'VIDEO' : '';
      const status = p.transcriptionStatus || 'null';
      const hasText = p.audioTranscription ? 'HAS_TEXT' : 'NO_TEXT';
      const date = p.createdAt.toISOString().split('T')[0];
      
      console.log(`${p.id.substring(0,8)}: ${hasAudio}${hasVideo} - Status: ${status} - ${hasText} - ${date}`);
    });

    console.log('');
    console.log('Summary:');
    const withStatus = posts.filter(p => p.transcriptionStatus);
    const withText = posts.filter(p => p.audioTranscription);
    console.log(`- Posts with transcription status: ${withStatus.length}`);
    console.log(`- Posts with transcription text: ${withText.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTranscriptions();
