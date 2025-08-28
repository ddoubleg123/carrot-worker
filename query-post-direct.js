// Direct database query using better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'carrot', 'prisma', 'dev.db');
  console.log('Database path:', dbPath);
  
  const db = new Database(dbPath, { readonly: true });
  
  const postId = 'cmervqq7l00094s0wdky56gix';
  console.log(`🔍 Querying post: ${postId}`);
  
  const query = `
    SELECT 
      id,
      content,
      transcriptionStatus,
      audioTranscription,
      videoUrl,
      audioUrl,
      createdAt
    FROM posts 
    WHERE id = ?
  `;
  
  const post = db.prepare(query).get(postId);
  
  if (post) {
    console.log('\n📊 Post found:');
    console.log('ID:', post.id);
    console.log('Content:', post.content?.substring(0, 100) + '...');
    console.log('Video URL:', post.videoUrl ? 'Present' : 'None');
    console.log('Audio URL:', post.audioUrl ? 'Present' : 'None');
    console.log('Transcription Status:', post.transcriptionStatus || 'null');
    console.log('Transcription Text:', post.audioTranscription || 'null');
    console.log('Created:', post.createdAt);
    
    if (post.audioTranscription) {
      console.log('\n📝 Full Transcription:');
      console.log(post.audioTranscription);
    }
  } else {
    console.log('❌ Post not found');
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
