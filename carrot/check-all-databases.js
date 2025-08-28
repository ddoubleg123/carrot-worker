const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPaths = [
    path.join(__dirname, 'dev.db'),
    path.join(__dirname, 'prisma', 'dev.db'),
    path.join(__dirname, 'prisma', 'prisma', 'dev.db')
];

console.log('🔍 Checking all database files for existing user data...\n');

const sessionUserId = "114925503624947485560";

dbPaths.forEach((dbPath, index) => {
    console.log(`📁 Database ${index + 1}: ${dbPath}`);
    
    if (!fs.existsSync(dbPath)) {
        console.log('   ❌ File does not exist\n');
        return;
    }
    
    const stats = fs.statSync(dbPath);
    console.log(`   📊 Size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
        console.log('   ⚠️  Empty file\n');
        return;
    }
    
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
        // Check if User table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='User'", (err, table) => {
            if (err) {
                console.log('   ❌ Error checking tables:', err.message);
                db.close();
                return;
            }
            
            if (!table) {
                console.log('   ⚠️  No User table found\n');
                db.close();
                return;
            }
            
            // Count total users
            db.get("SELECT COUNT(*) as count FROM User", (err, result) => {
                if (err) {
                    console.log('   ❌ Error counting users:', err.message);
                    db.close();
                    return;
                }
                
                console.log(`   👥 Total users: ${result.count}`);
                
                if (result.count > 0) {
                    // Check for your specific user
                    db.get("SELECT * FROM User WHERE id = ?", [sessionUserId], (err, user) => {
                        if (err) {
                            console.log('   ❌ Error checking session user:', err.message);
                        } else if (user) {
                            console.log('   ✅ YOUR USER FOUND!');
                            console.log(`      Email: ${user.email}`);
                            console.log(`      Name: ${user.name}`);
                            console.log(`      Onboarded: ${user.isOnboarded}`);
                            console.log(`      Created: ${user.createdAt}`);
                        } else {
                            console.log('   ❌ Your session user not found');
                        }
                        
                        // List all users
                        db.all("SELECT id, email, name, isOnboarded FROM User LIMIT 5", (err, users) => {
                            if (err) {
                                console.log('   ❌ Error listing users:', err.message);
                            } else {
                                console.log('   📋 Users in this database:');
                                users.forEach(u => {
                                    console.log(`      - ${u.email} (${u.name}) - Onboarded: ${u.isOnboarded}`);
                                });
                            }
                            console.log('');
                            db.close();
                        });
                    });
                } else {
                    console.log('   ⚠️  No users found\n');
                    db.close();
                }
            });
        });
    });
});
