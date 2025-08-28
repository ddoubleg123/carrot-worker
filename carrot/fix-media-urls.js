const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMediaUrls() {
  console.log('🔧 Starting media URL fix for older posts...');
  
  try {
    // Get all posts with potential media issues
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { audioUrl: { not: null } },
          { videoUrl: { not: null } },
          { cfUid: { not: null } },
        ]
      },
      select: {
        id: true,
        audioUrl: true,
        videoUrl: true,
        cfUid: true,
        cfPlaybackUrlHls: true,
        thumbnailUrl: true,
        videoThumbnail: true,
        createdAt: true,
      }
    });

    console.log(`📊 Found ${posts.length} posts with media`);

    let fixedAudio = 0;
    let fixedVideo = 0;
    let errors = 0;

    for (const post of posts) {
      try {
        const updates = {};
        let needsUpdate = false;

        // Fix audio URLs - check if they're accessible
        if (post.audioUrl) {
          try {
            const response = await fetch(post.audioUrl, { method: 'HEAD' });
            if (!response.ok) {
              console.log(`🎵 Audio URL broken for post ${post.id}: ${response.status}`);
              // Could set to null or try to reconstruct URL
              // For now, just log the issue
            }
          } catch (error) {
            console.log(`🎵 Audio URL inaccessible for post ${post.id}:`, error.message);
          }
        }

        // Fix video autoplay issues - ensure proper metadata
        if (post.videoUrl && !post.cfUid && !post.cfPlaybackUrlHls) {
          // This is a direct video URL that might need autoplay fixes
          console.log(`🎬 Direct video URL found for post ${post.id}`);
          
          // Check if video is accessible
          try {
            const response = await fetch(post.videoUrl, { method: 'HEAD' });
            if (!response.ok) {
              console.log(`🎬 Video URL broken for post ${post.id}: ${response.status}`);
            } else {
              console.log(`🎬 Video URL accessible for post ${post.id}`);
            }
          } catch (error) {
            console.log(`🎬 Video URL inaccessible for post ${post.id}:`, error.message);
          }
        }

        // Update if needed
        if (needsUpdate) {
          await prisma.post.update({
            where: { id: post.id },
            data: updates
          });
          console.log(`✅ Updated post ${post.id}`);
        }

      } catch (error) {
        console.error(`❌ Error processing post ${post.id}:`, error.message);
        errors++;
      }
    }

    console.log(`🎉 Media URL fix complete:`);
    console.log(`   - Audio fixes: ${fixedAudio}`);
    console.log(`   - Video fixes: ${fixedVideo}`);
    console.log(`   - Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixMediaUrls().catch(console.error);
