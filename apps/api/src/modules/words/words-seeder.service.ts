import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { CATEGORY_SLUGS, DEFAULT_LOCALE } from '@ahorcado/shared';

import { CategoryEntity } from './entities/category.entity';
import { WordEntity } from './entities/word.entity';
import { inferDifficulty, normalizeWord } from './word-normalize';

const META: Record<string, { name: string; icon: string }> = {
  animales: { name: 'Animales', icon: '🐾' },
  paises: { name: 'Países', icon: '🌎' },
  'frutas-verduras': { name: 'Frutas y verduras', icon: '🥑' },
  'comida-latam': { name: 'Comida latina', icon: '🌮' },
  peliculas: { name: 'Películas', icon: '🎬' },
  deportes: { name: 'Deportes', icon: '⚽' },
  profesiones: { name: 'Profesiones', icon: '👩‍🔧' },
  'objetos-hogar': { name: 'Objetos del hogar', icon: '🛋️' },
  naturaleza: { name: 'Naturaleza', icon: '🌳' },
  musica: { name: 'Música', icon: '🎵' },
  ciudades: { name: 'Ciudades', icon: '🏙️' },
  'cultura-general': { name: 'Cultura general', icon: '🧠' },
};

/**
 * Sincroniza la DB con los JSON de seeds en cada arranque (UPSERT + prune):
 *   - Inserta categorías nuevas y actualiza name/icon de existentes.
 *   - Inserta palabras que están en el JSON y no en la DB.
 *   - Borra palabras que están en la DB y ya no están en el JSON.
 *   - Borra categorías cuyo slug ya no figura en CATEGORY_SLUGS.
 *
 * Si los JSON no cambiaron, no escribe nada (cero IO en disco). Toda la
 * sincronización corre en una sola transacción para que un fallo no deje la
 * DB en un estado inconsistente.
 *
 * Deshabilitable con WORDS_SEED_AUTO=false.
 */
@Injectable()
export class WordsSeederService implements OnModuleInit {
  private readonly logger = new Logger(WordsSeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (process.env.WORDS_SEED_AUTO === 'false') {
      this.logger.log('Auto-seed deshabilitado (WORDS_SEED_AUTO=false)');
      return;
    }

    const locale = process.env.WORDS_SEED_LOCALE || DEFAULT_LOCALE;

    const seedsDir = this.resolveSeedsDir(locale);
    if (!seedsDir) {
      this.logger.warn(
        `No encontré el directorio de seeds para locale=${locale}; omito carga.`,
      );
      return;
    }

    await this.syncSeeds(seedsDir, locale);
  }

  private resolveSeedsDir(locale: string): string | null {
    // El nest-cli copia `src/scripts/seeds/**/*.json` a `dist/scripts/seeds/...`.
    // En runtime, este archivo vive en `dist/modules/words/` (prod) o lo
    // equivalente bajo dev, así que `../../scripts/seeds` apunta al destino.
    const candidates = [
      resolve(__dirname, '..', '..', 'scripts', 'seeds', locale),
      resolve(process.cwd(), 'dist', 'scripts', 'seeds', locale),
      resolve(process.cwd(), 'src', 'scripts', 'seeds', locale),
    ];
    for (const dir of candidates) {
      if (existsSync(dir)) return dir;
    }
    return null;
  }

  private async syncSeeds(seedsDir: string, locale: string): Promise<void> {
    let inserted = 0;
    let deletedWords = 0;
    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    let categoriesDeleted = 0;
    const perCategoryLogs: string[] = [];

    await this.dataSource.transaction(async (manager) => {
      const categoryRepo = manager.getRepository(CategoryEntity);
      const wordRepo = manager.getRepository(WordEntity);

      for (const slug of CATEGORY_SLUGS) {
        const file = resolve(seedsDir, `${slug}.json`);
        if (!existsSync(file)) {
          this.logger.warn(`  ⚠ ${slug}: archivo no encontrado, salto`);
          continue;
        }

        const list = JSON.parse(readFileSync(file, 'utf8')) as unknown;
        if (!Array.isArray(list)) {
          this.logger.warn(`  ⚠ ${slug}: contenido no es un array`);
          continue;
        }

        // Categoría: crear o actualizar metadata si cambió.
        const meta = META[slug] ?? { name: slug, icon: '📚' };
        let category = await categoryRepo.findOne({ where: { slug, locale } });
        if (!category) {
          category = await categoryRepo.save(
            categoryRepo.create({
              slug,
              name: meta.name,
              icon: meta.icon,
              locale,
              wordCount: 0,
            }),
          );
          categoriesCreated++;
        } else if (category.name !== meta.name || category.icon !== meta.icon) {
          category.name = meta.name;
          category.icon = meta.icon;
          await categoryRepo.save(category);
          categoriesUpdated++;
        }

        // Construir conjunto deseado de palabras desde el JSON.
        const seen = new Set<string>();
        const rows: WordEntity[] = [];
        for (const display of list) {
          if (typeof display !== 'string') continue;
          const trimmed = display.trim();
          if (!trimmed) continue;
          const text = normalizeWord(trimmed);
          if (!text || seen.has(text)) continue;
          seen.add(text);
          rows.push(
            wordRepo.create({
              categoryId: category.id,
              text,
              display: trimmed,
              difficulty: inferDifficulty(text),
              length: text.replace(/\s/g, '').length,
              locale,
            }),
          );
        }

        // INSERT con orIgnore por la UNIQUE (categoryId, text, locale): las
        // palabras nuevas entran, las que ya existían se saltan.
        let cInserted = 0;
        const CHUNK = 200;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const batch = rows.slice(i, i + CHUNK);
          const result = await wordRepo
            .createQueryBuilder()
            .insert()
            .into(WordEntity)
            .values(batch)
            .orIgnore()
            .execute();
          cInserted += result.identifiers.filter(Boolean).length;
        }
        inserted += cInserted;

        // Pruning: eliminar de la DB las palabras que ya no están en el JSON.
        let cDeleted = 0;
        const desiredTexts = [...seen];
        if (desiredTexts.length === 0) {
          const result = await wordRepo.delete({
            categoryId: category.id,
            locale,
          });
          cDeleted = result.affected ?? 0;
        } else {
          const result = await wordRepo
            .createQueryBuilder()
            .delete()
            .where('"categoryId" = :categoryId', { categoryId: category.id })
            .andWhere('locale = :locale', { locale })
            .andWhere('text NOT IN (:...desiredTexts)', { desiredTexts })
            .execute();
          cDeleted = result.affected ?? 0;
        }
        deletedWords += cDeleted;

        // Mantener wordCount consistente solo si cambió.
        const total = await wordRepo.count({
          where: { categoryId: category.id, locale },
        });
        if (category.wordCount !== total) {
          category.wordCount = total;
          await categoryRepo.save(category);
        }

        if (cInserted > 0 || cDeleted > 0) {
          perCategoryLogs.push(
            `  ✓ ${slug.padEnd(18)} +${cInserted} -${cDeleted}  total=${total}`,
          );
        }
      }

      // Pruning de categorías: las que tengan slug fuera de CATEGORY_SLUGS
      // para este locale se eliminan. Las palabras se borran por CASCADE.
      const orphans = await categoryRepo
        .createQueryBuilder('c')
        .where('c.locale = :locale', { locale })
        .andWhere('c.slug NOT IN (:...slugs)', {
          slugs: [...CATEGORY_SLUGS],
        })
        .getMany();
      if (orphans.length > 0) {
        await categoryRepo.remove(orphans);
        categoriesDeleted = orphans.length;
      }
    });

    const sinCambios =
      inserted === 0 &&
      deletedWords === 0 &&
      categoriesCreated === 0 &&
      categoriesUpdated === 0 &&
      categoriesDeleted === 0;

    if (sinCambios) {
      this.logger.log(`Seed sincronizado sin cambios (locale=${locale})`);
      return;
    }

    for (const line of perCategoryLogs) this.logger.log(line);
    this.logger.log(
      `Seed sincronizado (locale=${locale}): palabras +${inserted} -${deletedWords}, categorías +${categoriesCreated} ~${categoriesUpdated} -${categoriesDeleted}`,
    );
  }
}
