#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import toIco from 'to-ico';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

export const VERSION = pkg.version || '1.0.0';
export const PACKAGE_NAME = `2Arbolitos-Portable-Windows-x64-${VERSION}`;
export const MSI_NAME = `2Arbolitos-Windows-x64-${VERSION}.msi`;
export const DEFAULT_MARIADB_URL =
  'https://downloads.mariadb.org/rest-api/mariadb/11.4.14/mariadb-11.4.14-winx64.zip';

const WIX_VERSION = '3.14.1';
const WIX_ZIP_URL = 'https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip';
const WIX_ZIP_SHA256 = '6ac824e1642d6f7277d0ed7ea09411a508f6116ba6fae0aa5f2c7daa2ff43d31';
const UPGRADE_CODE = '{9B2E0B6A-2E3F-4A44-8A5A-6D6A4B9F1C77}';

export const MODE_LABELS = {
  portable: '1) Portable (MariaDB incluida, sin Docker)',
  dockerInstall: '2) Docker/Kiri (primera instalacion)',
  dockerDaily: '3) Docker/Kiri (uso diario)',
  panel: '4) Panel de control',
};

export const EXTRA_FILES = [
  '.dockerignore',
  '.env.example.docker',
  'docker-compose.yml',
  'Dockerfile',
  'Dockerfile.frontend',
  'nginx.conf.template',
  'instalar.bat',
  'iniciar.ps1',
  'server/Dockerfile',
  'server/docker-entrypoint.sh',
  'scripts/docker/16-backend-resolver.envsh',
  'scripts/setup/Installer.ps1',
  'scripts/setup/SetupOps.ps1',
  'scripts/setup/fixtures',
];

function log(msg) {
  console.log(`\x1b[36m[msi]\x1b[0m ${msg}`);
}

function fail(msg) {
  throw new Error(msg);
}

function run(exe, args, cwd) {
  const res = spawnSync(exe, args, { cwd, stdio: 'inherit', shell: false });
  if (res.error) throw res.error;
  if (res.status !== 0) fail(`${path.basename(exe)} fallo con codigo ${res.status}.`);
}

export function buildLauncher() {
  return [
    '@echo off',
    'setlocal EnableExtensions',
    'title 2Arbolitos POS',
    'cd /d "%~dp0"',
    '',
    ':menu',
    'cls',
    'echo ============================================================',
    'echo    2Arbolitos POS',
    'echo ============================================================',
    'echo.',
    `echo   ${MODE_LABELS.portable}`,
    `echo   ${MODE_LABELS.dockerInstall}`,
    `echo   ${MODE_LABELS.dockerDaily}`,
    `echo   ${MODE_LABELS.panel}`,
    'echo  5) Salir',
    'echo.',
    'set "OP="',
    'set /p "OP=Elige una opcion: "',
    'if "%OP%"=="1" goto portable',
    'if "%OP%"=="2" goto docker_install',
    'if "%OP%"=="3" goto docker_daily',
    'if "%OP%"=="4" goto panel',
    'if "%OP%"=="5" goto fin',
    'echo Opcion no valida.',
    'timeout /t 2 >nul',
    'goto menu',
    '',
    ':portable',
    'call "%~dp0start.bat"',
    'pause',
    'goto menu',
    '',
    ':docker_install',
    'call "%~dp0instalar.bat"',
    'pause',
    'goto menu',
    '',
    ':docker_daily',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1"',
    'pause',
    'goto menu',
    '',
    ':panel',
    'call "%~dp0Panel.bat"',
    'pause',
    'goto menu',
    '',
    ':fin',
    'exit /b 0',
    '',
  ].join('\r\n');
}

export function buildReadme(version) {
  return [
    '2Arbolitos POS - instalador de Windows',
    `Version: ${version}`,
    '',
    'La aplicacion se instala en %LOCALAPPDATA%\\2Arbolitos POS.',
    'No se instalan servicios ni se escriben claves del registro global.',
    '',
    'Modos incluidos:',
    '  1) Portable: Node, frontend, backend y MariaDB embebidos.',
    '     No requiere Docker ni MySQL externo. Ejecuta Iniciar.bat -> opcion 1.',
    '  2) Docker/Kiri: usa docker-compose.yml con Docker Desktop o Kiri.',
    '     Primera instalacion: Iniciar.bat -> opcion 2.',
    '     Uso diario: Iniciar.bat -> opcion 3.',
    '',
    'El puerto por defecto del modo portable es 3002 (http://localhost:3002).',
    'El modo Docker publica el frontend en el puerto 80.',
    '',
    'MariaDB Community Server se distribuye bajo GPLv2. Consulta NOTICE.md.',
    'Las contrasenas iniciales se generan de forma aleatoria y se muestran una vez.',
    '',
  ].join('\r\n');
}

export function productWxs({ version }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*"
           Name="2Arbolitos POS v${version}"
           Language="1033"
           Version="${version}.0"
           Manufacturer="2Arbolitos"
           UpgradeCode="${UPGRADE_CODE}">
    <Package InstallerVersion="200"
             Compressed="yes"
             InstallScope="perUser"
             Description="2Arbolitos POS, modos portable y Docker/Kiri" />

    <MajorUpgrade DowngradeErrorMessage="Ya hay instalada una version mas nueva de 2Arbolitos POS." />
    <MediaTemplate EmbedCab="yes" />

    <Condition Message="Este instalador requiere Windows de 64 bits."><![CDATA[VersionNT64]]></Condition>

    <Icon Id="PosIcon" SourceFile="app.ico" />
    <Property Id="WIXUI_INSTALLDIR" Value="INSTALLFOLDER" />
    <UIRef Id="WixUI_Minimal" />

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="LocalAppDataFolder">
        <Directory Id="INSTALLFOLDER" Name="2Arbolitos POS" />
      </Directory>
      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="2Arbolitos POS" />
      </Directory>
      <Directory Id="DesktopFolder" />
    </Directory>

    <DirectoryRef Id="ApplicationProgramsFolder">
      <Component Id="MenuLauncher" Guid="*">
        <Shortcut Id="MenuLauncherShortcut"
                  Name="2Arbolitos POS"
                  Description="Elegir modo portable o Docker/Kiri"
                  Target="[INSTALLFOLDER]Iniciar.bat"
                  WorkingDirectory="INSTALLFOLDER"
                  Icon="PosIcon" />
        <RemoveFolder Id="RemoveMenuFolder" On="uninstall" />
        <RegistryValue Root="HKCU" Key="Software\\2Arbolitos\\POS" Name="MenuLauncher"
                       Type="integer" Value="1" KeyPath="yes" />
      </Component>
    </DirectoryRef>

    <DirectoryRef Id="DesktopFolder">
      <Component Id="DesktopLauncher" Guid="*">
        <Shortcut Id="DesktopLauncherShortcut"
                  Name="2Arbolitos POS"
                  Description="Elegir modo portable o Docker/Kiri"
                  Target="[INSTALLFOLDER]Iniciar.bat"
                  WorkingDirectory="INSTALLFOLDER"
                  Icon="PosIcon" />
        <RegistryValue Root="HKCU" Key="Software\\2Arbolitos\\POS" Name="DesktopLauncher"
                       Type="integer" Value="1" KeyPath="yes" />
      </Component>
    </DirectoryRef>

    <Feature Id="Complete" Title="2Arbolitos POS" Level="1"
             ConfigurableDirectory="INSTALLFOLDER">
      <ComponentGroupRef Id="POSFiles" />
      <ComponentRef Id="MenuLauncher" />
      <ComponentRef Id="DesktopLauncher" />
    </Feature>
  </Product>
</Wix>
`;
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function resolveWixDirectory(explicit, exists = fs.existsSync) {
  if (!explicit) return '';
  const tools = ['heat.exe', 'candle.exe', 'light.exe'].map((name) =>
    path.join(explicit, name)
  );
  return tools.every(exists) ? explicit : '';
}

function ensureWix() {
  const explicit = resolveWixDirectory(process.env.WIX);
  if (explicit) return explicit;

  if (process.env.WIX) {
    log(`WIX='${process.env.WIX}' no tiene WiX 3 util; se usa la copia verificada.`);
  }

  const base = path.join(os.tmpdir(), `2arbolitos-wix-${WIX_VERSION}`);
  const zip = path.join(base, 'wix314-binaries.zip');
  const heat = path.join(base, 'heat.exe');
  const candle = path.join(base, 'candle.exe');
  const light = path.join(base, 'light.exe');

  if ([heat, candle, light].every((f) => fs.existsSync(f))) return base;

  fs.mkdirSync(base, { recursive: true });
  if (!fs.existsSync(zip) || sha256(zip) !== WIX_ZIP_SHA256) {
    log(`Descargando WiX ${WIX_VERSION} ...`);
    const dl = spawnSync('curl.exe', ['-L', '--fail', '--silent', '--show-error', '-o', zip, WIX_ZIP_URL], {
      stdio: 'inherit',
      shell: false,
    });
    if (dl.status !== 0) fail('No se pudo descargar WiX 3.');
    if (sha256(zip) !== WIX_ZIP_SHA256) fail('El hash de WiX 3 no coincide.');
  }

  log('Extrayendo WiX 3 ...');
  run('tar.exe', ['-x', '-f', zip, '-C', base], base);
  if (![heat, candle, light].every((f) => fs.existsSync(f))) fail('WiX 3 quedo incompleto.');
  return base;
}

async function copyExtras(staging) {
  log('Copiando archivos de Docker/Kiri y del panel ...');
  for (const rel of EXTRA_FILES) {
    const from = path.join(ROOT, ...rel.split('/'));
    if (!fs.existsSync(from)) fail(`Falta ${rel} en el repositorio.`);
    const to = path.join(staging, ...rel.split('/'));
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.cp(from, to, { recursive: true, force: true });
  }

  await fsp.writeFile(path.join(staging, 'Iniciar.bat'), buildLauncher(), 'utf8');
  await fsp.writeFile(path.join(staging, 'LEEME-MSI.txt'), buildReadme(VERSION), 'utf8');
}

function optionValue(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : '';
}

async function main() {
  const argv = process.argv.slice(2);
  const skipBuild = argv.includes('--skip-build');
  const systemNode = argv.includes('--system-node');
  const mariadbUrl = optionValue(argv, '--mariadb-url') || DEFAULT_MARIADB_URL;

  const wixDir = ensureWix();
  const stagingParent = path.join(os.tmpdir(), 'arbolitos-pack');
  const staging = path.join(stagingParent, PACKAGE_NAME);

  const packArgs = [
    'scripts/pack-portable.js',
    '--with-mariadb',
    '--mariadb-url',
    mariadbUrl,
    '--keep-staging',
  ];
  if (skipBuild) packArgs.push('--skip-build');
  if (systemNode) packArgs.push('--system-node');

  try {
    log(`Empaquetado portable v${VERSION} con MariaDB ...`);
    run(process.execPath, packArgs, ROOT);

    if (!fs.existsSync(path.join(staging, 'mariadb', 'bin', 'mysqld.exe'))) {
      fail('MariaDB portable no quedo incluida en el paquete.');
    }

    await copyExtras(staging);

    const work = path.join(os.tmpdir(), `2arbolitos-msi-${VERSION}`);
    await fsp.rm(work, { recursive: true, force: true });
    await fsp.mkdir(work, { recursive: true });

    const icon = await toIco(
      await fsp.readFile(path.join(ROOT, 'public', 'pwa-192x192.png')),
      { sizes: [16, 32, 48] }
    );
    await fsp.writeFile(path.join(work, 'app.ico'), icon);
    await fsp.writeFile(path.join(staging, 'app.ico'), icon);

    log('Recolectando archivos con heat.exe ...');
    run(path.join(wixDir, 'heat.exe'), [
      'dir', staging,
      '-nologo',
      '-cg', 'POSFiles',
      '-gg',
      '-scom',
      '-sreg',
      '-sfrag',
      '-srd',
      '-dr', 'INSTALLFOLDER',
      '-var', 'var.SourceDir',
      '-out', path.join(work, 'Files.wxs'),
    ], work);

    await fsp.writeFile(path.join(work, 'Product.wxs'), productWxs({ version: VERSION }), 'utf8');

    log('Compilando con WiX 3 ...');
    run(path.join(wixDir, 'candle.exe'), [
      '-nologo',
      `-dSourceDir=${staging}`,
      '-out', work + path.sep,
      path.join(work, 'Files.wxs'),
      path.join(work, 'Product.wxs'),
    ], work);

    fs.mkdirSync(path.join(ROOT, 'release'), { recursive: true });
    const msi = path.join(ROOT, 'release', MSI_NAME);
    if (fs.existsSync(msi)) fs.rmSync(msi, { force: true });
    const stalePdb = msi.replace(/\.msi$/i, '.wixpdb');
    if (fs.existsSync(stalePdb)) fs.rmSync(stalePdb, { force: true });

    log('Generando MSI ...');
    run(path.join(wixDir, 'light.exe'), [
      '-nologo',
      '-ext', 'WixUIExtension',
      '-spdb',
      '-sice:ICE38',
      '-sice:ICE64',
      '-out', msi,
      path.join(work, 'Files.wixobj'),
      path.join(work, 'Product.wixobj'),
    ], work);

    const hash = sha256(msi);
    await fsp.writeFile(`${msi}.sha256`, `${hash}  ${MSI_NAME}\n`, 'utf8');

    const sizeMb = (fs.statSync(msi).size / 1024 / 1024).toFixed(1);
    log('----------------------------------------------');
    log(`MSI listo: ${msi}  (${sizeMb} MB)`);
    log(`SHA256: ${hash}`);
    log('----------------------------------------------');
  } finally {
    await fsp.rm(stagingParent, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
