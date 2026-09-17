const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const MYSQL_PATH = 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe';

function backup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `case_management_${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    execSync(`"${MYSQL_PATH}" --user=root --password=root123 --host=localhost --port=3306 case_management > "${filepath}"`, {
      stdio: 'pipe'
    });
    console.log(`Backup created: ${filepath}`);
    
    // Cleanup old backups (keep last 7)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('case_management_'))
      .sort()
      .reverse();
    
    files.slice(7).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`Deleted old backup: ${f}`);
    });
    
    return { success: true, filepath };
  } catch (error) {
    console.error('Backup failed:', error.message);
    return { success: false, error: error.message };
  }
}

function restore(filepath) {
  try {
    execSync(`"C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe" --user=root --password=root123 --host=localhost --port=3306 case_management < "${filepath}"`, {
      stdio: 'pipe'
    });
    console.log(`Restored from: ${filepath}`);
    return { success: true };
  } catch (error) {
    console.error('Restore failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { backup, restore };

if (require.main === module) {
  backup();
}
