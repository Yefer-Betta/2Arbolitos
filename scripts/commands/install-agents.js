import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const USER_ECC = resolve(homedir(), '.config/opencode/.opencode');
const PROJECT_OPENCODE = resolve(ROOT, '.opencode');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, type = 'info') {
  const p = type === 'ok' ? `${colors.green}[✓]${colors.reset}`
    : type === 'warn' ? `${colors.yellow}[!]${colors.reset}`
    : type === 'step' ? `${colors.cyan}>${colors.reset}`
    : '[i]';
  console.log(`${p} ${msg}`);
}

function copyDir(src, dest) {
  if (!existsSync(src)) return 0;
  mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of readdirSync(src)) {
    const s = resolve(src, entry);
    const d = resolve(dest, entry);
    if (statSync(s).isDirectory()) {
      count += copyDir(s, d);
    } else if (!existsSync(d) || statSync(s).mtime > statSync(d).mtime) {
      copyFileSync(s, d);
      count++;
    }
  }
  return count;
}

export default async function installAgents() {
  console.log(`\n${colors.cyan}${colors.bold}========================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  OPENCODE AGENTS — 2ARBOLITOS${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}========================================${colors.reset}\n`);

  log('Buscando SkillsForOpenCode...', 'step');

  if (!existsSync(USER_ECC)) {
    log('No se encontró SkillsForOpenCode en la configuración global.', 'warn');
    log('Instálalo primero desde https://github.com/anthropics/opencode', 'warn');
    return;
  }

  log('SkillsForOpenCode detectado', 'ok');

  const dirs = ['agents', 'commands', 'prompts', 'instructions', 'tools', 'skills', 'plugins'];
  let total = 0;

  for (const dir of dirs) {
    const src = resolve(USER_ECC, dir);
    const dst = resolve(PROJECT_OPENCODE, dir);
    if (existsSync(src)) {
      const n = copyDir(src, dst);
      total += n;
      log(`${dir}: ${n} archivos copiados`, 'ok');
    }
  }

  const configSrc = resolve(USER_ECC, 'opencode.json');
  const configDst = resolve(PROJECT_OPENCODE, 'opencode.json');
  if (existsSync(configSrc) && !existsSync(configDst)) {
    copyFileSync(configSrc, configDst);
    log('opencode.json copiado', 'ok');
    total++;
  }

  console.log(`\n${colors.green}${colors.bold}Instalación completada.${colors.reset}`);
  console.log(`  ${total} archivos sincronizados en .opencode/\n`);
  console.log(`  Ahora puedes usar:${colors.reset}`);
  console.log(`    ${colors.cyan}/plan${colors.reset}       → agente planificador`);
  console.log(`    ${colors.cyan}/security${colors.reset}   → revisión de seguridad`);
  console.log(`    ${colors.cyan}/code-review${colors.reset} → revisión de código`);
  console.log(`    ${colors.cyan}/refactor-clean${colors.reset} → limpieza de código`);
  console.log(`    ${colors.cyan}/tdd${colors.reset}        → desarrollo guiado por tests\n`);
}

const isMain = process.argv[1] && (
  process.argv[1].replace(/\\/g, '/').includes('install-agents')
);
if (isMain) {
  installAgents().catch(e => { console.error(e); process.exit(1); });
}
