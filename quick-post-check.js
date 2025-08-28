const { PrismaClient } = require('@prisma/client');

async function quickCheck() {
  console.log('🔍 Quick check for post cmeuhi90r00014smsh2xonfht...\n');
  
  // Try the main database location
  const prisma = new PrismaClient({
    datasources: {
      db: { url: "file:./carrot/prisma/dev.db" }
    }
  });
  
  try {
    const post = await prisma.post.findUnique({
      where: { id: "cmeuhi90r00014smsh2xonfht" },
      select: {
        id: true,
        content: true,
        videoUrl: true,
        transcriptionStatus: true,
        audioTranscription: true,
        createdAt: true,
        User: { select: { name: true, email: true } }
      }
    });
    
    if (post) {
      console.log('✅ POST FOUND:');
      console.log(`ID: ${post.id}`);
      console.log(`Content: ${post.content}`);
      console.log(`Created: ${post.createdAt}`);
      console.log(`User: ${post.User?.name || post.User?.email}`);
      console.log(`Has Video: ${!!post.videoUrl}`);
      console.log(`Transcription Status: ${post.transcriptionStatus}`);
      console.log(`Has Transcription: ${!!post.audioTranscription}`);
    } else {
      console.log('❌ POST NOT FOUND');
      
      // Show recent posts instead
      const recent = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          content: true,
          createdAt: true,
          transcriptionStatus: true,
          User: { select: { name: true } }
        }
      });
      
      console.log('\n📋 Recent posts:');
      recent.forEach(p => {
        console.log(`${p.id} - ${p.User?.name} - ${p.transcriptionStatus} - ${p.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
