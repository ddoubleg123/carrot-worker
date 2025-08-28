const { spawn } = require('child_process');
const path = require('path');

// Execute the post check script
const scriptPath = path.join(__dirname, 'check-specific-post-cmeuhi90r.js');
const child = spawn('node', [scriptPath], {
  cwd: __dirname,
  stdio: 'inherit'
});

child.on('close', (code) => {
  console.log(`\nScript finished with exit code: ${code}`);
});

child.on('error', (error) => {
  console.error('Error running script:', error);
});
