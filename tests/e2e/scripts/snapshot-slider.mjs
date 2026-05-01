import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/after';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:4321';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
await page.goto(`${BASE}/host`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="create-session-form"]');
await page.waitForTimeout(500);
await page.addStyleTag({
  content: 'astro-dev-toolbar { display: none !important; }',
});
await page.screenshot({
  path: `${OUT}/mobile-portrait-slider-default.png`,
  fullPage: true,
});

// Cambiar a un valor "raro" (13) para verificar que se acepta
await page.evaluate(() => {
  const input = document.querySelector(
    '[data-testid="total-rounds-input"]',
  );
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  ).set;
  setter.call(input, '13');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(200);
await page.screenshot({
  path: `${OUT}/mobile-portrait-slider-13.png`,
  fullPage: true,
});

await browser.close();
console.log('Done.');
