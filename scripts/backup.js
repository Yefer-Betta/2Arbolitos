import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
const backupsDir = join(projectRoot, 'backups');
if (!existsSync(backupsDir)) mkdirSync(backupsDir);

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = join(backupsDir, `backup-${timestamp}.sql`);

const dumpCmd = `docker compose exec -T db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" 2arbolitos' > "${backupFile}"`;

try {
  console.log('Ejecutando backup (docker compose exec db mysqldump)...');
  execSync(dumpCmd, { stdio: ['pipe', 'inherit', 'inherit'], shell: true, cwd: projectRoot });
  console.log('Backup creado en', backupFile);
} catch (err) {
  console.error('Error al generar backup:', err.message);
  process.exit(1);
}
