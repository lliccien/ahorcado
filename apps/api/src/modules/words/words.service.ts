import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Category,
  DEFAULT_LOCALE,
  RANDOM_CATEGORY,
  SESSION_TTL_SECONDS,
} from '@ahorcado/shared';

import { RedisService } from '../redis/redis.service';
import { CategoryEntity } from './entities/category.entity';
import { WordEntity } from './entities/word.entity';

const usedWordsKey = (code: string) => `session:${code}:usedWords`;

export interface PickedWord {
  id: string;
  text: string;
  display: string;
  categorySlug: string;
  categoryName: string;
  locale: string;
}

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(WordEntity)
    private readonly wordRepo: Repository<WordEntity>,
    private readonly redis: RedisService,
  ) {}

  async listCategories(locale = DEFAULT_LOCALE): Promise<Category[]> {
    const rows = await this.categoryRepo.find({
      where: { locale },
      order: { name: 'ASC' },
    });
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      icon: r.icon,
      locale: r.locale,
      wordCount: r.wordCount,
    }));
  }

  /**
   * Selecciona una palabra aleatoria respetando:
   * - locale solicitado (default es-419)
   * - categoría solicitada o aleatoria entre las disponibles
   * - exclusión de palabras ya usadas en la sesión actual
   */
  async pickWord(
    sessionCode: string,
    requestedCategory: string,
    locale = DEFAULT_LOCALE,
  ): Promise<PickedWord> {
    const usedIds = await this.getUsedWordIds(sessionCode);

    let category: CategoryEntity | null = null;
    if (requestedCategory && requestedCategory !== RANDOM_CATEGORY) {
      category = await this.categoryRepo.findOne({
        where: { slug: requestedCategory, locale },
      });
    }

    const word = category
      ? await this.pickWordInCategory(category.id, locale, usedIds)
      : await this.pickWordAcrossCategories(locale, usedIds);

    if (!word) {
      throw new Error(
        `No quedan palabras disponibles para category=${requestedCategory} locale=${locale}`,
      );
    }

    if (!category) {
      category = await this.categoryRepo.findOne({
        where: { id: word.categoryId },
      });
    }

    await this.markWordUsed(sessionCode, word.id);

    return {
      id: word.id,
      text: word.text,
      display: word.display,
      categorySlug: category?.slug ?? '',
      categoryName: category?.name ?? '',
      locale: word.locale,
    };
  }

  private async pickWordInCategory(
    categoryId: string,
    locale: string,
    usedIds: Set<string>,
  ): Promise<WordEntity | null> {
    const qb = this.wordRepo
      .createQueryBuilder('w')
      .where('w.categoryId = :categoryId', { categoryId })
      .andWhere('w.locale = :locale', { locale });

    if (usedIds.size > 0) {
      qb.andWhere('w.id NOT IN (:...used)', { used: [...usedIds] });
    }

    qb.orderBy('RANDOM()').limit(1);
    return qb.getOne();
  }

  private async pickWordAcrossCategories(
    locale: string,
    usedIds: Set<string>,
  ): Promise<WordEntity | null> {
    const qb = this.wordRepo
      .createQueryBuilder('w')
      .where('w.locale = :locale', { locale });
    if (usedIds.size > 0) {
      qb.andWhere('w.id NOT IN (:...used)', { used: [...usedIds] });
    }
    qb.orderBy('RANDOM()').limit(1);
    return qb.getOne();
  }

  private async getUsedWordIds(code: string): Promise<Set<string>> {
    const ids = await this.redis.getClient().smembers(usedWordsKey(code));
    return new Set(ids);
  }

  private async markWordUsed(code: string, wordId: string): Promise<void> {
    const client = this.redis.getClient();
    await client.sadd(usedWordsKey(code), wordId);
    await client.expire(usedWordsKey(code), SESSION_TTL_SECONDS);
  }
}
