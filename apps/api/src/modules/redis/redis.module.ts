import { Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

import {
  REDIS_CLIENT,
  REDIS_PUB_CLIENT,
  REDIS_SUB_CLIENT,
} from './redis.constants';
import { RedisService } from './redis.service';

function buildOptions(config: ConfigService): RedisOptions {
  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    db: parseInt(config.get<string>('REDIS_DB', '0'), 10),
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  };
}

const clientProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => new Redis(buildOptions(config)),
};

const pubProvider: Provider = {
  provide: REDIS_PUB_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => new Redis(buildOptions(config)),
};

const subProvider: Provider = {
  provide: REDIS_SUB_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => new Redis(buildOptions(config)),
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [clientProvider, pubProvider, subProvider, RedisService],
  exports: [RedisService, REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT],
})
export class RedisModule {}
