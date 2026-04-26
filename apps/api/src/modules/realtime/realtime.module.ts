import { Module } from '@nestjs/common';

import { SessionsModule } from '../sessions/sessions.module';
import { RealtimeGateway } from './realtime.gateway';
import { WsExceptionFilter } from './ws-exception.filter';

@Module({
  imports: [SessionsModule],
  providers: [RealtimeGateway, WsExceptionFilter],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
