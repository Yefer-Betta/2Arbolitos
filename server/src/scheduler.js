import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

let lastBackupDate = null;

export function initScheduler() {
  // Verificar cada 10 minutos si debe ejecutarse el backup
  setInterval(async () => {
    try {
      const setting = await prisma.settings.findUnique({ where: { key: 'backupHour' } });
      const configHour = setting ? parseInt(setting.value) : 2; // por defecto 2am
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toISOString().slice(0, 10);

      if (currentHour === configHour && lastBackupDate !== today) {
        console.log('Ejecutando backup automático programado...');
        const backupScript = path.resolve(__dirname, '..', '..', 'scripts', 'backup.js');
        try {
          execSync(`node "${backupScript}"`, { stdio: 'inherit', timeout: 120000 });
          lastBackupDate = today;
          console.log('Backup completado.');
        } catch (err) {
          console.error('Error en backup automático:', err.message);
        }
      }
    } catch (err) {
      console.error('Error en el scheduler de backup:', err.message);
    }
  }, 10 * 60 * 1000); // cada 10 minutos
}
