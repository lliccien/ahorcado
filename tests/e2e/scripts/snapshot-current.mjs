import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'tests/e2e/screenshots/before';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile-portrait', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
  { name: 'mobile-landscape', viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true },
  { name: 'tablet', viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
];

const BASE = process.env.BASE_URL || 'http://localhost:4321';

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: v.viewport,
    isMobile: v.isMobile,
    hasTouch: v.hasTouch,
    userAgent: v.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      : undefined,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${v.name}] console error:`, m.text());
  });
  page.on('pageerror', (e) => console.log(`[${v.name}] page error:`, e.message));

  // 1) Home
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${v.name}-01-home.png`, fullPage: true });

  // 2) Crear partida
  await page.goto(`${BASE}/host`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${v.name}-02-host-form.png`, fullPage: true });

  await ctx.close();
  console.log(`✓ ${v.name}`);
}

await browser.close();
console.log('Done.');
