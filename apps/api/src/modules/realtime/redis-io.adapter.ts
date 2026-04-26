import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplication,
    private readonly pubClient: Redis,
    private readonly subClient: Redis,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('Socket.io conectado a Redis adapter');
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    // Mismo criterio que main.ts: en dev permitimos todos los orígenes para
    // poder jugar desde la LAN sin choques de CORS.
    const isDev = process.env.NODE_ENV !== 'production';
    const corsEnv = process.env.CORS_ORIGIN;
    const origin: boolean | string[] = isDev
      ? true
      : corsEnv
        ? corsEnv.split(',').map((o) => o.trim())
        : true;

    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin,
        credentials: true,
      },
    });
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
