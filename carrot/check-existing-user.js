const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

console.log('🔍 Checking for existing user records...');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Check all users in the database
    db.all("SELECT * FROM User", (err, users) => {
        if (err) {
            console.error('❌ Error checking users:', err);
        } else {
            console.log(`👥 Found ${users.length} users in database:`);
            users.forEach(user => {
                console.log(`  - ID: ${user.id}`);
                console.log(`    Email: ${user.email}`);
                console.log(`    Name: ${user.name}`);
                console.log(`    Onboarded: ${user.isOnboarded}`);
                console.log(`    Created: ${user.createdAt}`);
                console.log('    ---');
            });
        }
        
        // Check for your specific user ID from session
        const sessionUserId = "114925503624947485560";
        db.get("SELECT * FROM User WHERE id = ?", [sessionUserId], (err, user) => {
            if (err) {
                console.error('❌ Error checking session user:', err);
            } else if (user) {
                console.log('✅ Your session user found in database:');
                console.log('   ID:', user.id);
                console.log('   Email:', user.email);
                console.log('   Name:', user.name);
                console.log('   Onboarded:', user.isOnboarded);
            } else {
                console.log('❌ Your session user NOT found in database');
                console.log('   Session ID:', sessionUserId);
            }
            
            // Check accounts table for OAuth connections
            db.all("SELECT * FROM Account", (err, accounts) => {
                if (err) {
                    console.error('❌ Error checking accounts:', err);
                } else {
                    console.log(`🔗 Found ${accounts.length} OAuth accounts:`);
                    accounts.forEach(account => {
                        console.log(`  - Provider: ${account.provider}`);
                        console.log(`    User ID: ${account.userId}`);
                        console.log(`    Provider Account ID: ${account.providerAccountId}`);
                        console.log('    ---');
                    });
                }
                db.close();
            });
        });
    });
});
