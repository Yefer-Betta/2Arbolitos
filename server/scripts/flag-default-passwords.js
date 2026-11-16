import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Claves que distribuía el seed antes de la migración a contraseñas aleatorias.
 * Si una cuenta existente todavía usa una de ellas, se marca para cambiarla.
 * No se toca ninguna otra cuenta.
 */
const KNOWN_SEED_PASSWORDS = ['admin123', 'waiter123', 'cook123'];

async function main() {
  const users = await prisma.user.findMany({
    where: { mustChangePassword: false },
    select: { id: true, username: true, password: true },
  });

  let flagged = 0;
  for (const user of users) {
    for (const known of KNOWN_SEED_PASSWORDS) {
      if (await bcrypt.compare(known, user.password)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { mustChangePassword: true },
        });
        flagged += 1;
        console.log(`  → ${user.username}: contraseña por defecto, se pedirá cambiarla.`);
        break;
      }
    }
  }

  if (flagged > 0) {
    console.log(`✅ ${flagged} cuenta(s) marcadas para cambiar contraseña.`);
  } else {
    console.log('✅ Ninguna cuenta usa las claves antiguas del seed.');
  }
}

main()
  .catch((error) => {
    console.error('❌ No se pudo revisar las contraseñas por defecto:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
