const RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_API_URL) ||
  (typeof window !== 'undefined' &&
    (window as unknown as { __PUBLIC_API_URL__?: string }).__PUBLIC_API_URL__) ||
  'http://localhost:3000';

export const API_BASE_URL: string = String(RAW_BASE).replace(/\/$/, '');

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
