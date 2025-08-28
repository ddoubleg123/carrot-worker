const http = require('http');

// Simple test server to verify transcription API functionality
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/test-transcription' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const testPostId = data.postId || 'test-post-' + Date.now();
        
        console.log(`🎯 Testing transcription for post: ${testPostId}`);
        
        // Simulate the transcription API response
        const mockTranscription = `This is a test transcription for post ${testPostId}. The speaker discusses various technical topics and shares insights about system development and deployment challenges.`;
        
        const response = {
          success: true,
          postId: testPostId,
          transcription: mockTranscription,
          status: 'completed',
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Generated test transcription: ${mockTranscription.substring(0, 50)}...`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
        
      } catch (error) {
        console.error('❌ Test transcription error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
  } else if (req.url === '/health' && req.method === 'GET') {
    console.log('🏥 Health check requested');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'transcription-test-server',
      timestamp: new Date().toISOString()
    }));
    
  } else if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transcription Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 600px; }
          button { padding: 10px 20px; margin: 10px 0; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #005a87; }
          .result { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px; }
          input { padding: 8px; margin: 5px 0; width: 300px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎯 Transcription API Test</h1>
          <p>Test the transcription functionality directly</p>
          
          <div>
            <input type="text" id="postId" placeholder="Enter test post ID" value="test-post-123">
            <br>
            <button onclick="testTranscription()">Test Transcription</button>
            <button onclick="testHealth()">Test Health</button>
          </div>
          
          <div id="result" class="result" style="display: none;"></div>
        </div>
        
        <script>
          async function testTranscription() {
            const postId = document.getElementById('postId').value || 'test-post-' + Date.now();
            const resultDiv = document.getElementById('result');
            
            try {
              resultDiv.style.display = 'block';
              resultDiv.innerHTML = '⏳ Testing transcription...';
              
              const response = await fetch('/test-transcription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId })
              });
              
              const data = await response.json();
              
              if (data.success) {
                resultDiv.innerHTML = \`
                  <h3>✅ Transcription Test Success</h3>
                  <p><strong>Post ID:</strong> \${data.postId}</p>
                  <p><strong>Status:</strong> \${data.status}</p>
                  <p><strong>Transcription:</strong> \${data.transcription}</p>
                  <p><strong>Timestamp:</strong> \${data.timestamp}</p>
                \`;
              } else {
                resultDiv.innerHTML = \`<h3>❌ Test Failed</h3><p>\${data.error}</p>\`;
              }
            } catch (error) {
              resultDiv.innerHTML = \`<h3>❌ Test Error</h3><p>\${error.message}</p>\`;
            }
          }
          
          async function testHealth() {
            const resultDiv = document.getElementById('result');
            
            try {
              resultDiv.style.display = 'block';
              resultDiv.innerHTML = '⏳ Testing health...';
              
              const response = await fetch('/health');
              const data = await response.json();
              
              resultDiv.innerHTML = \`
                <h3>🏥 Health Check Result</h3>
                <p><strong>Status:</strong> \${data.status}</p>
                <p><strong>Service:</strong> \${data.service}</p>
                <p><strong>Timestamp:</strong> \${data.timestamp}</p>
              \`;
            } catch (error) {
              resultDiv.innerHTML = \`<h3>❌ Health Check Failed</h3><p>\${error.message}</p>\`;
            }
          }
        </script>
      </body>
      </html>
    `);
    
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const port = 8080;
server.listen(port, () => {
  console.log(`🌐 Transcription test server running on http://localhost:${port}`);
  console.log(`🎯 Test transcription at: http://localhost:${port}/test-transcription`);
  console.log(`🏥 Health check at: http://localhost:${port}/health`);
  console.log(`📱 Web interface at: http://localhost:${port}/`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});
