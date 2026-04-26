import { Module } from '@nestjs/common';
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
      synchronize: true,
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
