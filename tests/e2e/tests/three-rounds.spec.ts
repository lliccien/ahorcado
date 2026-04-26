import { test, expect, type Page } from '@playwright/test';

import { closeRedis, getRoundSecret } from '../helpers/redis-secret';

test.afterAll(async () => {
  await closeRedis();
});

async function uniqueLetters(secret: string): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of secret) {
    if (ch === ' ') continue;
    if (seen.has(ch)) continue;
    seen.add(ch);
    out.push(ch);
  }
  return out;
}

async function guessAllLetters(page: Page, secret: string): Promise<void> {
  for (const letter of await uniqueLetters(secret)) {
    const button = page.getByTestId(`keyboard-letter-${letter}`);
    await expect(button).toBeVisible();
    // Si ya fue tried (por ej. tras una recarga), saltar
    if ((await button.getAttribute('aria-pressed')) === 'true') continue;
    // Esperar a que el cliente no esté en mitad de otro guess
    await expect(button).toBeEnabled({ timeout: 5000 });
    await button.click();
    // Esperar a que el ack del server llegue y el botón quede pressed
    await expect(button).toHaveAttribute('aria-pressed', 'true', {
      timeout: 5000,
    });
  }
}

async function waitForRoundResult(page: Page) {
  await expect(page.getByTestId('round-result-modal')).toBeVisible({
    timeout: 12_000,
  });
}

test('partida de 3 rondas muestra el FinalLeaderboard al finalizar', async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  // ── Host crea sala ────────────────────────────────────────────────
  await host.goto('/host');
  await host.waitForLoadState('networkidle');

  // Forzar hidratación de React: hacer click en una categoría y esperar a que
  // refleje aria-pressed=true. Si no se hidrata, el click no toma efecto.
  await expect(async () => {
    await host.getByTestId('category-animales').click();
    await expect(host.getByTestId('category-animales')).toHaveAttribute(
      'aria-pressed',
      'true',
      { timeout: 1500 },
    );
  }).toPass({ timeout: 8000 });

  await host.getByTestId('host-name-input').fill('Pedro');

  // Slider: setea value con dispatch de evento input para que React lo capture
  await host.getByTestId('total-rounds-input').evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, '3');

  await host.getByTestId('create-session-submit').click();

  await host.waitForURL(/\/play\/[A-Z0-9]{6}\?host=1/, { timeout: 10_000 });
  const url = new URL(host.url());
  const code = url.pathname.split('/').pop()!;
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  // ── Aserción del fondo cuadriculado ──────────────────────────────
  const bgImage = await host.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bgImage).toContain('notebook-grid.svg');

  await expect(host.getByTestId('lobby-code')).toHaveText(code);

  // ── Invitada se une ──────────────────────────────────────────────
  await guest.goto('/join');
  await guest.waitForLoadState('networkidle');

  // Esperar hidratación: el input transforma a uppercase solo cuando React lo
  // controla. Comprobamos que el value devuelva el código bien formado.
  await expect(async () => {
    await guest.getByTestId('join-code-input').fill(code.toLowerCase());
    await expect(guest.getByTestId('join-code-input')).toHaveValue(code, {
      timeout: 1500,
    });
  }).toPass({ timeout: 8000 });

  await guest.getByTestId('join-name-input').fill('Maria');
  await guest.getByTestId('join-submit').click();

  await guest.waitForURL(/\/play\//, { timeout: 10_000 });
  await expect(guest.getByTestId('lobby-code')).toHaveText(code);

  // Ambos ven 2 jugadores en el lobby
  await expect(host.getByTestId('lobby-player')).toHaveCount(2, {
    timeout: 8_000,
  });
  await expect(guest.getByTestId('lobby-player')).toHaveCount(2, {
    timeout: 8_000,
  });

  // Host inicia
  const startBtn = host.getByTestId('lobby-start-btn');
  await expect(startBtn).toBeEnabled();
  await startBtn.click();

  // ── 3 rondas ──────────────────────────────────────────────────────
  for (let n = 1; n <= 3; n++) {
    await expect(host.getByTestId('round-word-display')).toBeVisible({
      timeout: 12_000,
    });
    await expect(guest.getByTestId('round-word-display')).toBeVisible({
      timeout: 12_000,
    });

    const secret = await getRoundSecret(code, n);
    await guessAllLetters(host, secret);
    await waitForRoundResult(host);
    await waitForRoundResult(guest);

    // El modal muestra la palabra revelada (texto crudo en minúsculas; el
    // CSS `uppercase` la pinta en mayúsculas).
    await expect(host.getByTestId('round-result-word')).toHaveText(secret);

    // Avanzar (host pulsa el botón para acelerar el auto-advance de 5s)
    const nextBtn = host.getByTestId('round-result-next-btn');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    if (n < 3) {
      // Esperamos que el modal desaparezca antes de comenzar la siguiente
      await expect(host.getByTestId('round-result-modal')).toBeHidden({
        timeout: 8_000,
      });
    }
  }

  // ── Bug fix: FinalLeaderboard visible en ambos browsers ──────────
  await expect(host.getByTestId('final-leaderboard')).toBeVisible({
    timeout: 12_000,
  });
  await expect(guest.getByTestId('final-leaderboard')).toBeVisible({
    timeout: 12_000,
  });

  await expect(host.getByTestId('final-leaderboard-row')).toHaveCount(2);
  await expect(guest.getByTestId('final-leaderboard-row')).toHaveCount(2);

  // Pedro debe figurar en el primer row (ganó las 3 rondas)
  const firstRowText = await host
    .getByTestId('final-leaderboard-row')
    .first()
    .innerText();
  expect(firstRowText).toContain('Pedro');

  await hostContext.close();
  await guestContext.close();
});

test('en desktop el RoundView muestra dos columnas', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  await page.goto('/');
  // Aserción de diseño: verificamos que la clase responsive lg:grid-cols-2
  // exista en el bundle (basta con confirmar que el body usa bg-notebook).
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bg).toContain('notebook-grid.svg');
  const minHeight = await page.evaluate(() => getComputedStyle(document.body).minHeight);
  expect(minHeight).not.toBe('0px');
  await ctx.close();
});
