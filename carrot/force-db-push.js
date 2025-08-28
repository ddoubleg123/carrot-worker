const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Force pushing database schema...');

// Delete existing database file to ensure clean state
const dbPath = path.join(__dirname, 'dev.db');
if (fs.existsSync(dbPath)) {
    console.log('🗑️ Deleting existing database file...');
    fs.unlinkSync(dbPath);
}

try {
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
    
    // Push schema to database
    console.log('🚀 Pushing schema to database...');
    execSync('npx prisma db push --force-reset', { stdio: 'inherit', cwd: __dirname });
    
    console.log('✅ Database schema pushed successfully!');
    
    // Verify tables exist
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
                console.error('❌ Error checking tables:', err);
            } else {
                console.log('📋 Tables in database:', rows.map(r => r.name));
            }
            db.close();
        });
    });
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
