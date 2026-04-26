import { Module } from '@nestjs/common';

import { SessionsModule } from '../sessions/sessions.module';
import { WordsModule } from '../words/words.module';
import { GameService } from './game.service';

@Module({
  imports: [SessionsModule, WordsModule],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
