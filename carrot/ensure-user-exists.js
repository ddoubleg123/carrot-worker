const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

// Create a test user record for the authenticated user
const userId = "114925503624947485560"; // From your session logs
const email = "danielgouldman@gmail.com";
const name = "Daniel Gouldman";
const image = "https://lh3.googleusercontent.com/a/ACg8ocKSru2n34HjR7-Cq6HVCZqvb6ZJxEFDDd_q-zh9EGXpgeQcJiY=s96-c";

console.log('👤 Creating user record in database...');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Insert user if not exists
    db.run(`INSERT OR IGNORE INTO "User" (
        "id", 
        "email", 
        "name", 
        "image", 
        "emailVerified", 
        "isOnboarded", 
        "createdAt", 
        "updatedAt"
    ) VALUES (?, ?, ?, ?, NULL, true, datetime('now'), datetime('now'))`, 
    [userId, email, name, image], 
    function(err) {
        if (err) {
            console.error('❌ Error creating user:', err);
        } else {
            console.log('✅ User record created/verified');
        }
        
        // Verify user exists
        db.get("SELECT id, email, name FROM User WHERE id = ?", [userId], (err, row) => {
            if (err) {
                console.error('❌ Error checking user:', err);
            } else if (row) {
                console.log('👤 User found:', row);
            } else {
                console.log('❌ User not found after creation');
            }
            db.close();
        });
    });
});
