const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

console.log('🔍 Checking database file and tables...');
console.log('📁 Database path:', dbPath);
console.log('📄 File exists:', fs.existsSync(dbPath));

if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log('📊 File size:', stats.size, 'bytes');
    
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
        // Check all tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
                console.error('❌ Error checking tables:', err);
            } else {
                console.log('📋 Tables found:', rows.length);
                rows.forEach(row => console.log('  - ' + row.name));
                
                // Check if posts table specifically exists
                const hasPostsTable = rows.some(row => row.name === 'posts');
                console.log('🎯 Posts table exists:', hasPostsTable);
                
                if (hasPostsTable) {
                    // Check posts table structure
                    db.all("PRAGMA table_info(posts)", (err, columns) => {
                        if (err) {
                            console.error('❌ Error checking posts table structure:', err);
                        } else {
                            console.log('🏗️ Posts table columns:', columns.length);
                            columns.forEach(col => console.log(`  - ${col.name} (${col.type})`));
                        }
                        db.close();
                    });
                } else {
                    db.close();
                }
            }
        });
    });
} else {
    console.log('❌ Database file does not exist!');
}
