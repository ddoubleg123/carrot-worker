const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '.env.local');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Configuring Railway ingest worker...');

// Prompt for Railway URL
rl.question('Enter your Railway worker URL (e.g., https://lavish-surprise-production.up.railway.app): ', (railwayWorkerUrl) => {
  if (!railwayWorkerUrl.trim()) {
    console.log('No URL provided. Exiting.');
    rl.close();
    return;
  }

  // Remove trailing slash if present
  const cleanUrl = railwayWorkerUrl.trim().replace(/\/$/, '');

  if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, 'utf8');
    console.log('Current .env.local content:');
    console.log(content);
    
    const updatedContent = content
      .split('\n')
      .map(line => {
        // Uncomment any commented INGEST_WORKER_URL lines
        if (line.startsWith('# INGEST_WORKER_URL=')) {
          return `INGEST_WORKER_URL=${cleanUrl}`;
        }
        // Update existing uncommented INGEST_WORKER_URL
        if (line.startsWith('INGEST_WORKER_URL=')) {
          return `INGEST_WORKER_URL=${cleanUrl}`;
        }
        return line;
      })
      .join('\n');
      
    // If no INGEST_WORKER_URL found, add it
    if (!updatedContent.includes('INGEST_WORKER_URL=')) {
      const lines = updatedContent.split('\n');
      lines.push(`INGEST_WORKER_URL=${cleanUrl}`);
      const finalContent = lines.join('\n');
      fs.writeFileSync(envPath, finalContent);
    } else {
      fs.writeFileSync(envPath, updatedContent);
    }
    
    console.log('\nUpdated .env.local to use Railway ingest worker');
    console.log(`Worker URL: ${cleanUrl}`);
    console.log('Restart your dev server to apply changes');
  } else {
    console.log('.env.local file not found');
  }

  rl.close();
});
