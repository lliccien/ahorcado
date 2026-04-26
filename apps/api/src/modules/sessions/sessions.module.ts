import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GameSessionEntity } from './entities/game-session.entity';
import { PlayerEntity } from './entities/player.entity';
import { SessionsController } from './sessions.controller';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([GameSessionEntity, PlayerEntity])],
  controllers: [SessionsController],
  providers: [SessionsRepository, SessionsService],
  exports: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
