const http = require('http');

console.log('Testing API directly...');

const options = {
  hostname: 'localhost',
  port: 3005,
  path: '/api/posts',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const posts = JSON.parse(data);
      console.log(`Found ${posts.length} posts`);
      
      if (posts.length > 0) {
        const firstPost = posts[0];
        console.log('\n=== FIRST POST ===');
        console.log('ID:', firstPost.id);
        console.log('Content:', firstPost.content?.substring(0, 50) + '...');
        console.log('User ID:', firstPost.userId);
        
        if (firstPost.User) {
          console.log('\n=== USER DATA ===');
          console.log('Username:', firstPost.User.username);
          console.log('Email:', firstPost.User.email);
          console.log('ProfilePhoto exists:', !!firstPost.User.profilePhoto);
          console.log('Image exists:', !!firstPost.User.image);
          
          const avatar = firstPost.User.profilePhoto || firstPost.User.image || '/avatar-placeholder.svg';
          console.log('Avatar source:', avatar === '/avatar-placeholder.svg' ? 'PLACEHOLDER' : 'ACTUAL PHOTO');
          
          if (firstPost.User.profilePhoto) {
            console.log('ProfilePhoto preview:', firstPost.User.profilePhoto.substring(0, 100) + '...');
          }
        } else {
          console.log('NO USER DATA FOUND');
        }
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.end();
