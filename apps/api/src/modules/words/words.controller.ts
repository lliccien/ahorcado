import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { DEFAULT_LOCALE } from '@ahorcado/shared';

import { WordsService } from './words.service';

@ApiTags('Words')
@Controller('categories')
export class WordsController {
  constructor(private readonly words: WordsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las categorías disponibles para un idioma' })
  @ApiQuery({ name: 'locale', required: false, example: 'es-419' })
  async list(@Query('locale') locale?: string) {
    return this.words.listCategories(locale ?? DEFAULT_LOCALE);
  }
}
