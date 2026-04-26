const KEY_PREFIX = 'ahorcado:player:';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getPlayerId(code: string): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(KEY_PREFIX + code);
  } catch {
    return null;
  }
}

export function setPlayerId(code: string, playerId: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_PREFIX + code, playerId);
  } catch {
    // Cookies/storage deshabilitado, ignoramos.
  }
}

export function clearPlayerId(code: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(KEY_PREFIX + code);
  } catch {
    // ignorar
  }
}

const NAME_KEY = 'ahorcado:lastName';

export function getLastName(): string {
  if (!isBrowser()) return '';
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setLastName(name: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // ignorar
  }
}
