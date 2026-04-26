const RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_API_URL) ||
  (typeof window !== 'undefined' &&
    (window as unknown as { __PUBLIC_API_URL__?: string }).__PUBLIC_API_URL__) ||
  'http://localhost:3000';

/**
 * Si el usuario accede desde la LAN (ej. `http://192.168.1.20:4321/` desde un
 * celular) pero el `.env` configura `PUBLIC_API_URL=http://localhost:3000`,
 * el browser intentaría hablar con su propio localhost y fallaría. Detectamos
 * ese caso y reescribimos el host para apuntar al mismo origen que está
 * sirviendo el frontend (manteniendo el puerto del API).
 */
function resolveBaseUrl(raw: string): string {
  const cleaned = String(raw).replace(/\/$/, '');
  if (typeof window === 'undefined' || !window.location) return cleaned;
  try {
    const url = new URL(cleaned);
    const isLocalConfigured =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isBrowserOnLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (isLocalConfigured && !isBrowserOnLocal) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, '');
    }
    return cleaned;
  } catch {
    return cleaned;
  }
}

export const API_BASE_URL: string = resolveBaseUrl(String(RAW_BASE));

export async function fetchSessionPublic(code: string): Promise<{
  exists: boolean;
  status?: string;
  playersCount?: number;
  totalRounds?: number;
  category?: string;
}> {
  const res = await fetch(
    `${API_BASE_URL}/sessions/${encodeURIComponent(code)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
