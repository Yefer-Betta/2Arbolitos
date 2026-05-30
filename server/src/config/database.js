import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;

export async function connectDB() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$connect();
      console.log('✅ Base de datos conectada correctamente');
      return;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Intento ${attempt}/${MAX_RETRIES} - reintentando en ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error('❌ Error al conectar con la base de datos tras múltiples intentos:', error);
        process.exit(1);
      }
    }
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
}
