import Redis from 'ioredis';

const REDIS_HOST = process.env.E2E_REDIS_HOST ?? 'localhost';
const REDIS_PORT = parseInt(process.env.E2E_REDIS_PORT ?? '6379', 10);

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({ host: REDIS_HOST, port: REDIS_PORT, lazyConnect: false });
  }
  return client;
}

/**
 * Lee la palabra normalizada (sin acentos, en minúsculas) de la ronda activa
 * desde Redis. Reintenta brevemente porque la ronda puede tardar pocos
 * milisegundos en quedar persistida tras el evento `round:started`.
 */
export async function getRoundSecret(
  code: string,
  roundNumber: number,
  attempts = 20,
  delayMs = 200,
): Promise<string> {
  const key = `round:${code}:${roundNumber}:secret`;
  const c = getClient();
  for (let i = 0; i < attempts; i++) {
    const value = await c.get(key);
    if (value) return value;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`No se pudo obtener el secreto en Redis para ${key}`);
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
