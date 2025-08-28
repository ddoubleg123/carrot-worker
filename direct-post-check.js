const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: "file:./carrot/prisma/dev.db" }
  }
});

async function checkPost() {
  try {
    console.log('🔍 Checking for post cmeuhi90r00014smsh2xonfht...\n');
    
    const post = await prisma.post.findUnique({
      where: { id: "cmeuhi90r00014smsh2xonfht" },
      include: {
        User: { select: { name: true, email: true } }
      }
    });
    
    if (post) {
      console.log('✅ POST FOUND:');
      console.log(`ID: ${post.id}`);
      console.log(`Content: ${post.content}`);
      console.log(`User: ${post.User?.name || post.User?.email}`);
      console.log(`Created: ${post.createdAt}`);
      console.log(`Video URL: ${post.videoUrl ? 'Present' : 'Missing'}`);
      console.log(`Transcription Status: ${post.transcriptionStatus}`);
      console.log(`Has Transcription: ${!!post.audioTranscription}`);
    } else {
      console.log('❌ POST NOT FOUND');
      
      const recent = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { User: { select: { name: true } } }
      });
      
      console.log('\n📋 Recent posts instead:');
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

checkPost();
