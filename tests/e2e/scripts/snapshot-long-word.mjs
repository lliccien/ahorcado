import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/after';
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const MIN_LONGEST = parseInt(process.env.MIN_LONGEST || '13', 10);
const MAX_TRIES = parseInt(process.env.MAX_TRIES || '15', 10);

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
];

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  console.log(`>>> ${v.name} (target longest >= ${MIN_LONGEST})`);

  let attempt = 0;
  let captured = false;

  while (!captured && attempt < MAX_TRIES) {
    attempt++;

    const hostCtx = await browser.newContext({
      viewport: v.viewport,
      isMobile: v.isMobile,
      hasTouch: v.hasTouch,
    });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`${BASE}/host`, { waitUntil: 'domcontentloaded' });
    await hostPage.waitForSelector('[data-testid="create-session-form"]');
    await hostPage.waitForTimeout(400);
    await hostPage.fill('[data-testid="host-name-input"]', 'Host');
    await hostPage.click('[data-testid="category-cultura-general"]');
    await hostPage.click('[data-testid="create-session-submit"]');
    await hostPage.waitForURL(/\/play\//);
    await hostPage.waitForSelector('[data-testid="lobby-code"]');
    const code = (
      await hostPage.textContent('[data-testid="lobby-code"]')
    )?.trim();

    const guestCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const guestPage = await guestCtx.newPage();
    await guestPage.goto(`${BASE}/play/${code}`, {
      waitUntil: 'domcontentloaded',
    });
    await guestPage.evaluate(() => {
      try {
        window.localStorage.setItem('ahorcado:lastName', 'Bot');
      } catch {}
    });
    await guestPage.goto(`${BASE}/play/${code}`, {
      waitUntil: 'domcontentloaded',
    });
    await guestPage.waitForSelector('[data-testid="lobby-player"]', {
      timeout: 10000,
    });

    await hostPage.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="lobby-player"]').length >= 2,
      { timeout: 10000 },
    );

    await hostPage.addStyleTag({
      content: 'astro-dev-toolbar { display: none !important; }',
    });
    await hostPage.click('[data-testid="lobby-start-btn"]', { force: true });
    await hostPage.waitForSelector('[data-testid="round-word-display"]', {
      timeout: 15000,
    });
    await hostPage.waitForTimeout(700);

    // Inspeccionar la palabra: contar grupos consecutivos sin espacio
    const longest = await hostPage.evaluate(() => {
      const root = document.querySelector(
        '[data-testid="round-word-display"]',
      );
      if (!root) return 0;
      // Cada palabra es un <div> hermano del root con varios <span> letras.
      // Los espacios entre palabras son los <div> separados (gap).
      const groups = root.querySelectorAll('div > div');
      let max = 0;
      groups.forEach((g) => {
        const len = g.children.length;
        if (len > max) max = len;
      });
      return max;
    });

    console.log(`    intento ${attempt}: longest=${longest}`);

    if (longest >= MIN_LONGEST) {
      await hostPage.screenshot({
        path: `${OUT}/${v.name}-05-long-word-${longest}c.png`,
        fullPage: true,
      });
      // Tirar 2 letras para revelar algunas
      for (const letter of ['a', 'e', 'o']) {
        try {
          await hostPage.click(`[data-testid="keyboard-letter-${letter}"]`, {
            force: true,
            timeout: 3000,
          });
          await hostPage.waitForTimeout(400);
        } catch {}
      }
      await hostPage.screenshot({
        path: `${OUT}/${v.name}-06-long-word-revealed.png`,
        fullPage: true,
      });
      console.log(`    ✓ capturado con palabra de ${longest} chars`);
      captured = true;
    }

    await hostCtx.close();
    await guestCtx.close();
  }

  if (!captured) {
    console.log(
      `    ⚠ no se encontró palabra >= ${MIN_LONGEST} chars tras ${MAX_TRIES} intentos`,
    );
  }
}

await browser.close();
