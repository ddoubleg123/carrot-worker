const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

console.log('Checking .env.local file...');

if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf8');
  console.log('Current .env.local content:');
  console.log(content);
  
  // Remove or comment out INGEST_WORKER_URL to use Firebase Function
  const updatedContent = content
    .split('\n')
    .map(line => {
      if (line.startsWith('INGEST_WORKER_URL=')) {
        return `# ${line} # Commented out to use Firebase Function`;
      }
      return line;
    })
    .join('\n');
    
  if (content !== updatedContent) {
    fs.writeFileSync(envPath, updatedContent);
    console.log('\nUpdated .env.local to use Firebase Function');
    console.log('Restart your dev server to apply changes');
  } else {
    console.log('\nNo changes needed');
  }
} else {
  console.log('.env.local file not found');
}
