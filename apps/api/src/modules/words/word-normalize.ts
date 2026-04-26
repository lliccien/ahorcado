import { WordDifficulty } from '@ahorcado/shared';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;
const ALLOWED = /[^a-zñ ]/g;

/**
 * Normaliza una palabra para matching:
 * - quita acentos (NFD + descomposición de diacríticos)
 * - convierte a minúsculas
 * - mantiene letras a-z, ñ y espacios; el resto se elimina
 */
export function normalizeWord(display: string): string {
  return display
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(ALLOWED, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Letras únicas (sin espacios) que componen la palabra normalizada */
export function uniqueLetters(text: string): string[] {
  return Array.from(new Set(text.replace(/\s/g, '').split('')));
}

/** Asignación heurística de dificultad basada en longitud y composición */
export function inferDifficulty(text: string): WordDifficulty {
  const compact = text.replace(/\s/g, '');
  const len = compact.length;
  const isCompound = text.includes(' ');
  if (isCompound) return len <= 8 ? WordDifficulty.MEDIUM : WordDifficulty.HARD;
  if (len <= 5) return WordDifficulty.EASY;
  if (len <= 9) return WordDifficulty.MEDIUM;
  return WordDifficulty.HARD;
}
