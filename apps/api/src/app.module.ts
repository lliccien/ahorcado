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

// Política del schema:
//   - dev (NODE_ENV != 'production'): synchronize ON, migrationsRun OFF.
//     TypeORM ajusta el schema desde las entities al arrancar para iterar
//     rápido. Las migraciones se generan a demanda con `pnpm migration:generate`.
//   - prod (NODE_ENV == 'production'): synchronize OFF, migrationsRun ON.
//     El schema lo gestionan exclusivamente las migraciones versionadas en
//     `src/migrations/` y se aplican automáticamente al arrancar la API.
const isProd = process.env.NODE_ENV === 'production';
const synchronize = !isProd;
const migrationsRun = isProd;

new Logger('AppModule').log(
  `TypeORM synchronize=${synchronize} migrationsRun=${migrationsRun} (NODE_ENV=${process.env.NODE_ENV ?? 'undefined'})`,
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
      migrationsRun,
      // En runtime, `__dirname` resuelve a `dist/`, así que cargamos los
      // archivos `.js` compilados. El glob `.{ts,js}` permite que también
      // funcione bajo `nest start` (que ejecuta TS) sin cambiar la config.
      migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
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
