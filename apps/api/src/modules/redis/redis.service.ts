import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import {
  REDIS_PUB_CLIENT,
  REDIS_SUB_CLIENT,
  REDIS_CLIENT,
} from './redis.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    @Inject(REDIS_PUB_CLIENT) private readonly pub: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly sub: Redis,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ping();
    this.logger.log(
      `Redis listo (host=${this.config.get<string>('REDIS_HOST')}, ` +
        `port=${this.config.get<string>('REDIS_PORT')})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.client.quit(),
      this.pub.quit(),
      this.sub.quit(),
    ]);
  }

  getClient(): Redis {
    return this.client;
  }

  getPubClient(): Redis {
    return this.pub;
  }

  getSubClient(): Redis {
    return this.sub;
  }

  async ping(): Promise<'PONG'> {
    return (await this.client.ping()) as 'PONG';
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.error(`No se pudo parsear JSON de "${key}": ${String(err)}`);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(keys);
  }

  /**
   * Lock optimista basado en SETNX. Si no se obtiene el lock devuelve null.
   * Caller decide si reintentar o abortar.
   */
  async tryAcquireLock(
    key: string,
    ttlMs: number,
    token: string,
  ): Promise<boolean> {
    const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, token: string): Promise<void> {
    const lua = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    await this.client.eval(lua, 1, key, token);
  }
}
