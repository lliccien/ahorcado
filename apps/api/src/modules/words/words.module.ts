import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoryEntity } from './entities/category.entity';
import { WordEntity } from './entities/word.entity';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { WordsSeederService } from './words-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, WordEntity])],
  controllers: [WordsController],
  providers: [WordsService, WordsSeederService],
  exports: [WordsService, TypeOrmModule],
})
export class WordsModule {}
