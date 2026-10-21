#!/usr/bin/env node
/**
 * Capturas visuales del POS sin dependencias externas.
 *
 * Usa Microsoft Edge en modo headless y el protocolo DevTools (CDP) a traves
 * del WebSocket nativo de Node 22+. Inicia sesion contra la API real, inyecta
 * la cookie httpOnly y fotografia cada escenario en tres anchos.
 *
 * Uso:
 *   node scripts/visual/shots.mjs                 # etiqueta "actual"
 *   node scripts/visual/shots.mjs --tag antes     # screenshots/antes-*.png
 *   node scripts/visual/shots.mjs --only pos,kitchen
 *
 * Requiere el frontend en http://127.0.0.1:5173 (npm run dev) y el API
 * accesible a traves del proxy de Vite.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BASE = (process.env.SHOT_BASE || 'http://127.0.0.1:5173').replace(/\/$/, '');
const OUT_DIR = path.resolve('screenshots');
const USER = process.env.SHOT_USER || 'admin';
const PASS = process.env.SHOT_PASS || 'admin123';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

const SCENARIOS = [
  { name: 'login', anonymous: true },
  { name: 'mesas', tab: 'pos' },
  { name: 'mesas-oscuro', tab: 'pos', dark: true },
  {
    name: 'pedido',
    tab: 'pos',
    clickSelector: '[aria-label^="Mesa 1:"]',
    settle: 700,
    addItems: 3,
    clearTable: 'mesa-1',
  },
  {
    name: 'carrito',
    tab: 'pos',
    clickSelector: '[aria-label^="Mesa 1:"]',
    settle: 700,
    addItems: 3,
    click: 'Carrito',
    clearTable: 'mesa-1',
  },
  {
    name: 'pedido-oscuro',
    tab: 'pos',
    clickSelector: '[aria-label^="Mesa 1:"]',
    settle: 700,
    addItems: 3,
    clearTable: 'mesa-1',
    dark: true,
  },
  { name: 'cocina', tab: 'kitchen' },
  { name: 'historial', tab: 'history' },
  { name: 'inventario', tab: 'inventory' },
  { name: 'menu', tab: 'menu' },
  { name: 'contabilidad', tab: 'finance' },
  { name: 'contabilidad-ventas', tab: 'finance', click: 'Consultar ventas' },
  { name: 'ajustes', tab: 'settings' },
  { name: 'ajustes-servidor', tab: 'settings', click: 'Servidor' },
];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

const tag = String(arg('tag', 'actual'));
const only = arg('only');
const scenarios = only
  ? SCENARIOS.filter((s) => String(only).split(',').includes(s.name))
  : SCENARIOS;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findEdge() {
  const candidates = [
    `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ];
  return candidates.find((p) => p && existsSync(p));
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!res.ok) throw new Error(`login fallo (${res.status})`);
  const body = await res.json();
  const cookies = res.headers.getSetCookie?.() || [];
  const token = cookies.map((c) => c.split(';')[0]).find((c) => c.startsWith('token='));
  if (!token) throw new Error('la respuesta de login no trae cookie token');
  if (!body.user) throw new Error('la respuesta de login no trae el usuario');
  return { tokenValue: token.slice('token='.length), user: body.user };
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('no se pudo abrir el WebSocket de CDP')), { once: true });
    });
    const cdp = new CDP(ws);
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && cdp.pending.has(msg.id)) {
        const { resolve, reject } = cdp.pending.get(msg.id);
        cdp.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
      }
    });
    return cdp;
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout en ${method}`));
        }
      }, 20000);
    });
  }
}

async function waitForFile(file, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      return await fs.readFile(file, 'utf8');
    } catch {
      await sleep(150);
    }
  }
  throw new Error(`no aparecio ${file}`);
}

async function evaluate(cdp, sessionId, expression) {
  const res = await cdp.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  return res.result?.value;
}

/** Espera a que el documento termine de cargar y React pinte algo. */
async function waitReady(cdp, sessionId, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const state = await evaluate(
        cdp,
        sessionId,
        "document.readyState === 'complete' && document.getElementById('root')?.childElementCount > 0",
      );
      if (state) return;
    } catch {
      // el contexto se destruye durante la navegacion; reintentar
    }
    await sleep(250);
  }
  let snapshot = '';
  try {
    snapshot = await evaluate(cdp, sessionId, '(document.body?.innerText || "").slice(0, 240)');
  } catch {
    // sin contexto
  }
  throw new Error(`la pagina no termino de cargar${snapshot ? ` — ${JSON.stringify(snapshot)}` : ''}`);
}

/**
 * Borra la base local (IndexedDB) desde una pagina sin la app montada,
 * para que cada ancho de pantalla arranque con el mismo estado.
 */
async function resetLocalData(cdp, sessionId) {
  await cdp.send('Page.navigate', { url: `${BASE}/logo.png` }, sessionId).catch(() => {});

  // Esperar a que la app anterior se descargue del todo: si sigue abierta,
  // mantiene la conexion a IndexedDB y el borrado queda bloqueado.
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const ready = await evaluate(
      cdp,
      sessionId,
      "location.pathname === '/logo.png' && document.readyState === 'complete'",
    ).catch(() => false);
    if (ready) break;
    await sleep(100);
  }
  await sleep(150);

  await evaluate(
    cdp,
    sessionId,
    `new Promise((resolve) => {
      try {
        const req = indexedDB.deleteDatabase('2arbolitos_db');
        req.onsuccess = req.onerror = req.onblocked = () => resolve(true);
      } catch {
        resolve(false);
      }
      setTimeout(() => resolve(false), 3000);
    })`,
  ).catch(() => {});
}

async function main() {
  const edge = findEdge();
  if (!edge) throw new Error('Microsoft Edge no esta instalado');

  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'arbolitos-shots-'));
  const proc = spawn(
    edge,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    const raw = await waitForFile(portFile);
    const port = Number(raw.split(/\r?\n/)[0]);
    if (!port) throw new Error('Edge no publico un puerto de depuracion');

    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const cdp = await CDP.connect(version.webSocketDebuggerUrl);

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);

    await fs.mkdir(OUT_DIR, { recursive: true });

    const { tokenValue, user } = await login();
    const userJson = JSON.stringify(user);

    // La app restaura la sesion desde sessionStorage, no solo desde la cookie.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        try {
          localStorage.setItem('theme', localStorage.getItem('__shotTheme') === 'dark' ? 'dark' : 'light');
          if (localStorage.getItem('__shotAuth') === '1') {
            sessionStorage.setItem('currentUser', ${JSON.stringify(userJson)});
          } else {
            sessionStorage.removeItem('currentUser');
          }
        } catch {}
      })();`,
    }, sessionId);

    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }],
    }, sessionId);

    // Primera carga: establece el origen para poder alternar __shotAuth con localStorage.
    await cdp.send('Page.navigate', { url: `${BASE}/` }, sessionId).catch(() => {});
    await waitReady(cdp, sessionId);
    await sleep(600);

    for (const viewport of VIEWPORTS) {
      await resetLocalData(cdp, sessionId);

      await cdp.send(
        'Emulation.setDeviceMetricsOverride',
        {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          mobile: Boolean(viewport.mobile),
        },
        sessionId,
      );

      for (const scenario of scenarios) {
        try {
          const auth = scenario.anonymous ? '0' : '1';
          await evaluate(cdp, sessionId, `localStorage.setItem('__shotAuth', '${auth}')`).catch(() => {});
          await evaluate(
            cdp,
            sessionId,
            `localStorage.setItem('__shotTheme', '${scenario.dark ? 'dark' : 'light'}')`,
          ).catch(() => {});

          if (scenario.anonymous) {
            await cdp.send('Network.clearBrowserCookies', {}, sessionId);
          } else {
            await cdp.send(
              'Network.setCookie',
              { name: 'token', value: tokenValue, url: BASE, path: '/', httpOnly: true, sameSite: 'Lax' },
              sessionId,
            );
          }

          const url = scenario.tab ? `${BASE}/?tab=${scenario.tab}` : `${BASE}/`;
          await cdp.send('Page.navigate', { url }, sessionId).catch(() => {});
          try {
            await waitReady(cdp, sessionId, 12000);
          } catch {
            // Reintento unico: algunas cargas se quedan esperando el SSE inicial.
            await cdp.send('Page.reload', {}, sessionId).catch(() => {});
            await waitReady(cdp, sessionId, 15000);
          }
          await sleep(scenario.settle ? 1400 : 1600);

          if (scenario.clickSelector) {
            await evaluate(
              cdp,
              sessionId,
              `(() => {
                const target = document.querySelector(${JSON.stringify(scenario.clickSelector)});
                if (!target) return 'no-encontrado';
                target.click();
                return 'ok';
              })()`,
            );
            await sleep(scenario.settle || 700);
          }

          if (scenario.click) {
            const text = JSON.stringify(scenario.click);
            await cdp.send(
              'Runtime.evaluate',
              {
                expression: `(() => {
                  const target = [...document.querySelectorAll('button, a')].find(el => el.textContent.trim().includes(${text}));
                  if (!target) return 'no-encontrado';
                  target.click();
                  return 'ok';
                })()`,
                returnByValue: true,
              },
              sessionId,
            );
            await sleep(scenario.settle || 700);
          }

          if (scenario.addItems) {
            for (let i = 0; i < scenario.addItems; i += 1) {
              await evaluate(
                cdp,
                sessionId,
                `document.querySelectorAll('[data-grid-index]')[${i}]?.click()`,
              );
              await sleep(450);
            }
            await sleep(500);
          }

          const { data } = await cdp.send(
            'Page.captureScreenshot',
            { format: 'png', fromSurface: true, captureBeyondViewport: false },
            sessionId,
          );
          const file = path.join(OUT_DIR, `${tag}-${viewport.name}-${scenario.name}.png`);
          await fs.writeFile(file, Buffer.from(data, 'base64'));
          console.log(`ok ${path.relative(process.cwd(), file)}`);

          if (scenario.clearTable) {
            await fetch(`${BASE}/api/tables/state/${scenario.clearTable}`, {
              method: 'DELETE',
              headers: { Cookie: `token=${tokenValue}` },
            }).catch(() => {});
          }
        } catch (err) {
          console.error(`fallo ${viewport.name}/${scenario.name}: ${err.message}`);
        }
      }
    }

    await cdp.send('Browser.close').catch(() => {});
  } finally {
    proc.kill();
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`shots: ${err.message}`);
  process.exit(1);
});
