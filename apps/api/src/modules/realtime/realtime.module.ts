import { Module } from '@nestjs/common';

import { GameModule } from '../game/game.module';
import { SessionsModule } from '../sessions/sessions.module';
import { RealtimeGateway } from './realtime.gateway';
import { WsExceptionFilter } from './ws-exception.filter';

@Module({
  imports: [SessionsModule, GameModule],
  providers: [RealtimeGateway, WsExceptionFilter],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
