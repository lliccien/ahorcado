import { LIVES_PER_ROUND } from '@ahorcado/shared';

/** Construye una maskedView inicial: null para letras, ' ' para espacios. */
export function buildInitialMask(text: string): Array<string | null> {
  return Array.from(text, (ch) => (ch === ' ' ? ' ' : null));
}

/** Cuenta cuántas casillas de letra ya han sido reveladas (no espacios). */
export function countRevealed(mask: Array<string | null>): number {
  let n = 0;
  for (const ch of mask) if (ch !== null && ch !== ' ') n++;
  return n;
}

/** Cuántas posiciones (excluyendo espacios) hay en la palabra. */
export function letterSlotCount(mask: Array<string | null>): number {
  let n = 0;
  for (const ch of mask) if (ch !== ' ') n++;
  return n;
}

export function isFullyRevealed(mask: Array<string | null>): boolean {
  return mask.every((ch) => ch !== null);
}

export function applyLetterToMask(
  text: string,
  mask: Array<string | null>,
  letter: string,
): { hit: boolean; updated: Array<string | null> } {
  let hit = false;
  const next = mask.slice();
  for (let i = 0; i < text.length; i++) {
    if (text[i] === letter && next[i] === null) {
      next[i] = letter;
      hit = true;
    }
  }
  return { hit, updated: next };
}

export function defaultLives(): number {
  return LIVES_PER_ROUND;
}
