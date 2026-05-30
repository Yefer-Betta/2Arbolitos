#!/usr/bin/env node
import readline from 'readline';
import { execSync } from 'child_process';
import os from 'os';
import installSystem from './commands/install.js';
import startDev from './commands/start-dev.js';
import startProd from './commands/start-prod.js';
import updateSystem from './commands/update.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

function showMenu() {
  clearScreen();
  console.log(`
${colors.cyan}========================================================${colors.reset}
${colors.cyan}${colors.bold}          PANEL DE CONTROL - 2ARBOLITOS${colors.reset}
${colors.cyan}========================================================${colors.reset}
${colors.bold}
  1. Instalar Sistema por Primera Vez
  2. Iniciar en Producción (PM2)
  3. Actualizar Código y Reiniciar
  4. Iniciar en Modo Desarrollo
  5. Abrir Cliente (navegador)
  6. Salir${colors.reset}

${colors.cyan}========================================================${colors.reset}
`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  let running = true;

  while (running) {
    showMenu();
    const option = await ask(`${colors.bold}Elige una opción (1-6): ${colors.reset}`);

    switch (option.trim()) {
      case '1':
        await installSystem();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '2':
        startProd();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '3':
        updateSystem();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '4':
        rl.close();
        startDev();
        running = false;
        break;
      case '5':
        rl.close();
        running = false;
        const platform = os.platform();
        const cmd = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
        execSync(`${cmd} http://localhost:3002`, { stdio: 'inherit' });
        process.exit(0);
        break;
      case '6':
        running = false;
        break;
      default:
        console.log(`\n${colors.yellow}Opción no válida. Intenta de nuevo.${colors.reset}`);
        await new Promise(r => setTimeout(r, 1500));
    }
  }

  rl.close();
  console.log(`\n${colors.green}¡Hasta luego!${colors.reset}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error(`\n${colors.red}Error:${colors.reset}`, err.message);
  process.exit(1);
});
