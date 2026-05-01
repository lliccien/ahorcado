import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT_DIR || 'screenshots/after';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  {
    name: 'mobile-portrait',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'mobile-landscape',
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'tablet',
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'desktop',
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
  },
];

const BASE = process.env.BASE_URL || 'http://localhost:4321';
// Categorías que el host probará. cultura-general suele dar palabras
// largas (Frankenstein, Reencarnación, Quetzalcóatl, Huitzilopochtli...).
const CATEGORY = process.env.CATEGORY || 'cultura-general';

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  console.log(`>>> ${v.name} (${v.viewport.width}x${v.viewport.height})`);

  const hostCtx = await browser.newContext({
    viewport: v.viewport,
    isMobile: v.isMobile,
    hasTouch: v.hasTouch,
  });
  const hostPage = await hostCtx.newPage();
  hostPage.on('pageerror', (e) =>
    console.error(`[${v.name} host] pageerror:`, e.message),
  );
  hostPage.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      console.log(`[${v.name} host console ${m.type()}]`, m.text());
  });
  hostPage.on('requestfailed', (req) =>
    console.error(
      `[${v.name} host requestfailed]`,
      req.method(),
      req.url(),
      req.failure()?.errorText,
    ),
  );

  // Pantalla 1: form de creación
  await hostPage.goto(`${BASE}/host`, { waitUntil: 'domcontentloaded' });
  await hostPage.waitForSelector('[data-testid="create-session-form"]');
  // Esperar un instante para que React hidrate
  await hostPage.waitForTimeout(500);
  await hostPage.screenshot({
    path: `${OUT}/${v.name}-01-host-form.png`,
    fullPage: true,
  });

  // Llenar y crear
  await hostPage.fill('[data-testid="host-name-input"]', 'Host');
  await hostPage.click(`[data-testid="category-${CATEGORY}"]`);
  // Intercept response del POST /sessions para diagnóstico
  const sessionResponsePromise = hostPage.waitForResponse(
    (r) => r.url().includes('/api/sessions') && r.request().method() === 'POST',
    { timeout: 8000 },
  );
  await hostPage.click('[data-testid="create-session-submit"]');
  try {
    const resp = await sessionResponsePromise;
    console.log(`    POST /sessions -> ${resp.status()}`);
  } catch (e) {
    console.log(`    POST /sessions no llegó: ${e.message}`);
    const html = await hostPage.content();
    if (html.includes('alert')) {
      const errMsg = await hostPage
        .$eval('[role="alert"]', (el) => el.textContent)
        .catch(() => null);
      console.log(`    Alert visible: ${errMsg}`);
    }
  }

  // Esperar redirección a /play/<code>
  await hostPage.waitForURL(/\/play\//, { timeout: 10000 });
  await hostPage.waitForSelector('[data-testid="lobby-code"]');
  const code = (await hostPage.textContent('[data-testid="lobby-code"]'))?.trim();
  console.log(`    sala: ${code}`);

  // Pantalla 2: lobby
  await hostPage.screenshot({
    path: `${OUT}/${v.name}-02-lobby.png`,
    fullPage: true,
  });

  // Guest siempre desktop (no nos importa cómo se ve a él)
  const guestCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const guestPage = await guestCtx.newPage();
  guestPage.on('pageerror', (e) =>
    console.error(`[${v.name} guest] pageerror:`, e.message),
  );
  await guestPage.goto(`${BASE}/play/${code}?join=Bot`, {
    waitUntil: 'domcontentloaded',
  });
  // Truco: en lugar de pelear con el form de "¿Cómo te llamas?" (que se
  // re-renderiza al hidratar y detacha el input), inyectamos directamente
  // el nombre en localStorage como si lo hubiera puesto antes y pulsamos
  // el form vía submit() en JS si aparece.
  await guestPage.evaluate(() => {
    try {
      window.localStorage.setItem('ahorcado:lastName', 'Bot');
    } catch {}
  });
  // Recargar para que el GameRoom pueda hacer auto-join con el nombre.
  await guestPage.goto(`${BASE}/play/${code}`, {
    waitUntil: 'domcontentloaded',
  });
  // Esperar a que entre al lobby (lista de jugadores). Si no entró por
  // auto-join, intentar submit programático del form.
  const enteredLobby = await Promise.race([
    guestPage
      .waitForSelector('[data-testid="lobby-player"]', { timeout: 8000 })
      .then(() => true)
      .catch(() => false),
    guestPage.waitForTimeout(8000).then(() => false),
  ]);
  if (!enteredLobby) {
    await guestPage.evaluate(() => {
      const input = document.querySelector(
        'input[placeholder="Tu nombre"]',
      );
      if (input) {
        input.value = 'Bot';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const form = input?.closest('form');
      form?.requestSubmit();
    });
    await guestPage.waitForSelector('[data-testid="lobby-player"]', {
      timeout: 10000,
    });
  }
  // Esperar a que aparezca el lobby (lista de jugadores)
  await guestPage.waitForSelector('[data-testid="lobby-player"]', {
    timeout: 10000,
  });

  // Pequeña espera para que el host vea al guest conectado
  await hostPage.waitForFunction(
    () => document.querySelectorAll('[data-testid="lobby-player"]').length >= 2,
    { timeout: 10000 },
  );

  // Ocultar el dev toolbar de Astro que intercepta pointer events
  await hostPage.addStyleTag({
    content: 'astro-dev-toolbar { display: none !important; }',
  });

  // Host inicia la partida
  await hostPage.click('[data-testid="lobby-start-btn"]', { force: true });

  // Esperar RoundView (palabra a adivinar)
  await hostPage.waitForSelector('[data-testid="round-word-display"]', {
    timeout: 15000,
  });

  // Pequeña espera para que pinten todas las animaciones iniciales
  await hostPage.waitForTimeout(700);

  // Pantalla 3: ronda en juego (palabra inicial: todas las letras tapadas)
  await hostPage.screenshot({
    path: `${OUT}/${v.name}-03-round.png`,
    fullPage: true,
  });

  // Tirar 2 letras comunes para que se revele algo y se vean colores en teclado
  for (const letter of ['a', 'e']) {
    try {
      await hostPage.click(`[data-testid="keyboard-letter-${letter}"]`, {
        force: true,
      });
      await hostPage.waitForTimeout(500);
    } catch {
      // si la letra ya está usada o el botón no responde, seguir
    }
  }

  await hostPage.screenshot({
    path: `${OUT}/${v.name}-04-round-letters.png`,
    fullPage: true,
  });

  // Inspeccionar la palabra real para diagnóstico (longitud)
  const wordInfo = await hostPage.evaluate(() => {
    const root = document.querySelector('[data-testid="round-word-display"]');
    if (!root) return null;
    const spans = root.querySelectorAll('span');
    return {
      total: spans.length,
      visible: Array.from(spans)
        .map((s) => s.textContent || '_')
        .join(''),
    };
  });
  console.log(`    palabra: ${wordInfo?.visible} (chars=${wordInfo?.total})`);

  await hostCtx.close();
  await guestCtx.close();
}

await browser.close();
console.log('Done.');
