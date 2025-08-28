const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

console.log('🗑️ Deleting existing database file...');
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

console.log('🔨 Creating new database with tables...');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create User table
    db.run(`CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "image" TEXT,
        "emailVerified" DATETIME,
        "profilePhoto" TEXT,
        "username" TEXT,
        "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ Error creating User table:', err);
        else console.log('✅ User table created');
    });

    // Create posts table (mapped from Post model)
    db.run(`CREATE TABLE IF NOT EXISTS "posts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "content" TEXT,
        "userId" TEXT NOT NULL,
        "gradientDirection" TEXT,
        "gradientFromColor" TEXT,
        "gradientViaColor" TEXT,
        "gradientToColor" TEXT,
        "imageUrls" TEXT,
        "gifUrl" TEXT,
        "audioUrl" TEXT,
        "audioTranscription" TEXT,
        "transcriptionStatus" TEXT,
        "emoji" TEXT,
        "carrotText" TEXT,
        "stickText" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "thumbnailUrl" TEXT,
        "videoUrl" TEXT,
        "cf_uid" TEXT,
        "cf_status" TEXT,
        "cf_duration_sec" REAL,
        "cf_width" INTEGER,
        "cf_height" INTEGER,
        "cf_playback_url_hls" TEXT,
        "caption_vtt_url" TEXT,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`, (err) => {
        if (err) console.error('❌ Error creating posts table:', err);
        else console.log('✅ posts table created');
    });

    // Create Account table
    db.run(`CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`, (err) => {
        if (err) console.error('❌ Error creating Account table:', err);
        else console.log('✅ Account table created');
    });

    // Create Session table
    db.run(`CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionToken" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "expires" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`, (err) => {
        if (err) console.error('❌ Error creating Session table:', err);
        else console.log('✅ Session table created');
    });

    // Verify tables were created
    setTimeout(() => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
                console.error('❌ Error checking tables:', err);
            } else {
                console.log('📋 Final tables in database:', rows.map(r => r.name));
                const stats = fs.statSync(dbPath);
                console.log('📊 Database file size:', stats.size, 'bytes');
            }
            db.close();
        });
    }, 100);
});
