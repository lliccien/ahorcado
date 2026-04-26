import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GameSessionEntity } from '../sessions/entities/game-session.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { WordsModule } from '../words/words.module';
import { RoundResultEntity } from './entities/round-result.entity';
import { RoundEntity } from './entities/round.entity';
import { GameService } from './game.service';

@Module({
  imports: [
    SessionsModule,
    WordsModule,
    TypeOrmModule.forFeature([
      RoundEntity,
      RoundResultEntity,
      GameSessionEntity,
    ]),
  ],
  providers: [GameService],
  exports: [GameService, TypeOrmModule],
})
export class GameModule {}
