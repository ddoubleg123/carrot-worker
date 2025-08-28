const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('C:\\keys\\carrot-sa.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'involuted-river-466315-p0'
});

const db = admin.firestore();

async function checkFirestorePosts() {
  try {
    console.log('Checking Firestore for posts...');
    
    // Check posts collection
    const postsRef = db.collection('posts');
    const snapshot = await postsRef.get();
    
    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      });
    });
    
    console.log('FIRESTORE_POSTS_FOUND:', posts.length);
    
    // Look for the specific post
    const targetPost = posts.find(p => p.id === 'cmeuco1ju00054s1svtlgr9zm');
    
    const result = {
      totalPosts: posts.length,
      targetPostExists: !!targetPost,
      targetPost: targetPost,
      postsWithVideo: posts.filter(p => p.videoUrl).length,
      postsWithTranscription: posts.filter(p => p.audioTranscription).length,
      allPosts: posts.map(p => ({
        id: p.id,
        hasVideo: !!p.videoUrl,
        hasTranscription: !!p.audioTranscription,
        transcriptionStatus: p.transcriptionStatus,
        videoUrlPreview: p.videoUrl ? p.videoUrl.substring(0, 80) + '...' : null
      }))
    };
    
    fs.writeFileSync('firestore-posts-check.json', JSON.stringify(result, null, 2));
    
    if (targetPost) {
      console.log('TARGET_POST_FOUND_IN_FIRESTORE');
      console.log('HAS_VIDEO:', !!targetPost.videoUrl);
      console.log('HAS_TRANSCRIPTION:', !!targetPost.audioTranscription);
      console.log('STATUS:', targetPost.transcriptionStatus);
      
      if (targetPost.audioTranscription) {
        console.log('TRANSCRIPTION_TEXT:', targetPost.audioTranscription);
      }
    } else {
      console.log('TARGET_POST_NOT_IN_FIRESTORE');
    }
    
  } catch (error) {
    console.log('FIRESTORE_ERROR:', error.message);
    fs.writeFileSync('firestore-error.json', JSON.stringify({ error: error.message }, null, 2));
  }
}

checkFirestorePosts();
