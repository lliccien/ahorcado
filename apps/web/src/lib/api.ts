const RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_API_URL) ||
  (typeof window !== 'undefined' &&
    (window as unknown as { __PUBLIC_API_URL__?: string }).__PUBLIC_API_URL__) ||
  '';

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

const RESOLVED = resolveBaseUrl(String(RAW_BASE));

/**
 * URL base para las llamadas REST.
 *
 * - En dev (`PUBLIC_API_URL=http://localhost:3000`) apunta directo al backend.
 * - En prod (sin `PUBLIC_API_URL`) usamos `/api` y dejamos que el reverse
 *   proxy (Caddy) reenvíe al backend bajo el mismo origen, sin CORS.
 */
export const API_HTTP_URL: string = RESOLVED || '/api';

/**
 * URL base para socket.io.
 *
 * socket.io tiene una ruta canónica `/socket.io/` que el proxy enruta al
 * backend. En prod conectamos por el mismo origen (string vacío). En dev
 * apuntamos al backend explícito.
 */
export const API_WS_URL: string = RESOLVED;

/** @deprecated Usa `API_HTTP_URL` o `API_WS_URL` según el caso. */
export const API_BASE_URL: string = API_HTTP_URL;

export async function fetchSessionPublic(code: string): Promise<{
  exists: boolean;
  status?: string;
  playersCount?: number;
  totalRounds?: number;
  category?: string;
}> {
  const res = await fetch(
    `${API_HTTP_URL}/sessions/${encodeURIComponent(code)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
