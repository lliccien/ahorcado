import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import path from 'path';

import { AppController } from './app.controller';
import { RedisModule } from './modules/redis/redis.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { GameModule } from './modules/game/game.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { WordsModule } from './modules/words/words.module';

// `synchronize` modifica el schema en cada arranque al detectar diferencias
// con las entities. Útil en dev para iterar rápido pero peligroso en prod
// (puede borrar columnas/tablas si las entities cambian de nombre).
//   - dev: ON por default.
//   - prod: OFF por default.
//   - Override explícito con DB_SYNCHRONIZE=true|false (suele setearse en
//     true SOLO en el primer deploy de prod para crear el schema y luego
//     se quita).
const isDev = process.env.NODE_ENV !== 'production';
const syncEnv = process.env.DB_SYNCHRONIZE?.trim().toLowerCase();
const synchronize =
  syncEnv === 'true' ? true : syncEnv === 'false' ? false : isDev;

new Logger('AppModule').log(
  `TypeORM synchronize=${synchronize} (NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}, DB_SYNCHRONIZE=${process.env.DB_SYNCHRONIZE ?? 'unset'})`,
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../../.env'),
    }),

    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE as 'postgres') || 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize,
      // Si Postgres tarda en estar listo (típico al levantar el stack
      // entero), reintentamos la conexión durante ~60s antes de morir.
      retryAttempts: 20,
      retryDelay: 3000,
    }),

    TerminusModule,
    HttpModule,
    RedisModule,
    WordsModule,
    SessionsModule,
    GameModule,
    LeaderboardModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
