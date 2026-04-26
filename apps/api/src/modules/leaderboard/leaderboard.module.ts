import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GameModule } from '../game/game.module';
import { RoundResultEntity } from '../game/entities/round-result.entity';
import { RoundEntity } from '../game/entities/round.entity';
import { GameSessionEntity } from '../sessions/entities/game-session.entity';
import { PlayerEntity } from '../sessions/entities/player.entity';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  imports: [
    GameModule,
    TypeOrmModule.forFeature([
      GameSessionEntity,
      PlayerEntity,
      RoundEntity,
      RoundResultEntity,
    ]),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
