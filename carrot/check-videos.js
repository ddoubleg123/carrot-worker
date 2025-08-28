const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking video URLs in posts...\n');

db.all(`
  SELECT id, content, videoUrl, cf_playback_url_hls, thumbnailUrl 
  FROM posts 
  WHERE videoUrl IS NOT NULL OR cf_playback_url_hls IS NOT NULL 
  ORDER BY createdAt DESC 
  LIMIT 10
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`Found ${rows.length} posts with video URLs:\n`);
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. Post ID: ${row.id}`);
      console.log(`   Content: ${row.content ? row.content.substring(0, 50) + '...' : 'No content'}`);
      console.log(`   Video URL: ${row.videoUrl || 'None'}`);
      console.log(`   CF Playback URL: ${row.cf_playback_url_hls || 'None'}`);
      console.log(`   Thumbnail URL: ${row.thumbnailUrl || 'None'}`);
      console.log('');
    });
  }
  
  db.close();
});
