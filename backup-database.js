const fs = require('fs');
const path = require('path');

function backupDatabase() {
  const dbPath = 'c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot\\dev.db';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `c:\\Users\\danie\\CascadeProjects\\windsurf-project\\carrot\\dev.db.backup.${timestamp}`;
  
  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Database backed up to: ${backupPath}`);
      return backupPath;
    } else {
      console.log('❌ Database file not found at:', dbPath);
      return null;
    }
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return null;
  }
}

if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };
