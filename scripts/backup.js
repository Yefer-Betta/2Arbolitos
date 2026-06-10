const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env to get DATABASE_URL (MySQL)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL no está definida en .env');
  process.exit(1);
}

// Parse MySQL connection components
// Expected format: mysql://user:pass@host:port/dbname?schema=public&charset=utf8mb4
const match = dbUrl.match(/^mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
if (!match) {
  console.error('Formato de DATABASE_URL no reconocido:', dbUrl);
  process.exit(1);
}
const [, user, password, host, port = '3306', database] = match;

const backupsDir = path.resolve(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupsDir, `backup-${timestamp}.sql`);

const dumpCmd = `mysqldump -u ${user} -p${password} -h ${host} -P ${port} ${database} > "${backupFile}"`;

try {
  console.log('Ejecutando backup...');
  execSync(dumpCmd, { stdio: 'inherit', shell: true });
  console.log('Backup creado en', backupFile);
} catch (err) {
  console.error('Error al generar backup:', err.message);
  process.exit(1);
}
