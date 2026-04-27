import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
};

/**
 * Carga las palabras del juego en la base de datos al arrancar la API si
 * detecta que la tabla está vacía. Útil en despliegues nuevos (Dokploy /
 * Docker) donde TypeORM `synchronize: true` crea las tablas pero no
 * popula datos. Es idempotente: si ya hay categorías para el locale, no
 * hace nada.
 */
@Injectable()
export class WordsSeederService implements OnModuleInit {
  private readonly logger = new Logger(WordsSeederService.name);

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(WordEntity)
    private readonly wordRepo: Repository<WordEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.WORDS_SEED_AUTO === 'false') {
      this.logger.log('Auto-seed deshabilitado (WORDS_SEED_AUTO=false)');
      return;
    }

    const locale = process.env.WORDS_SEED_LOCALE || DEFAULT_LOCALE;

    const existing = await this.categoryRepo.count({ where: { locale } });
    if (existing > 0) {
      this.logger.log(
        `Skip seed: ya hay ${existing} categorías para locale=${locale}`,
      );
      return;
    }

    const seedsDir = this.resolveSeedsDir(locale);
    if (!seedsDir) {
      this.logger.warn(
        `No encontré el directorio de seeds para locale=${locale}; omito carga.`,
      );
      return;
    }

    this.logger.log(`Cargando palabras desde ${seedsDir} (locale=${locale})`);
    await this.loadSeeds(seedsDir, locale);
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

  private async loadSeeds(seedsDir: string, locale: string): Promise<void> {
    const files = (await readdir(seedsDir)).filter((f) => f.endsWith('.json'));
    let totalInserted = 0;

    for (const slug of CATEGORY_SLUGS) {
      const file = resolve(seedsDir, `${slug}.json`);
      if (!files.includes(`${slug}.json`)) {
        this.logger.warn(`  ⚠ ${slug}: archivo no encontrado, salto`);
        continue;
      }

      const list = JSON.parse(
        readFileSync(file, 'utf8'),
      ) as unknown;
      if (!Array.isArray(list)) {
        this.logger.warn(`  ⚠ ${slug}: contenido no es un array`);
        continue;
      }

      const meta = META[slug] ?? { name: slug, icon: '📚' };
      const category = await this.categoryRepo.save(
        this.categoryRepo.create({
          slug,
          name: meta.name,
          icon: meta.icon,
          locale,
          wordCount: 0,
        }),
      );

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
          this.wordRepo.create({
            categoryId: category.id,
            text,
            display: trimmed,
            difficulty: inferDifficulty(text),
            length: text.replace(/\s/g, '').length,
            locale,
          }),
        );
      }

      let inserted = 0;
      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const batch = rows.slice(i, i + CHUNK);
        const result = await this.wordRepo
          .createQueryBuilder()
          .insert()
          .into(WordEntity)
          .values(batch)
          .orIgnore()
          .execute();
        inserted += result.identifiers.filter(Boolean).length;
      }

      category.wordCount = inserted;
      await this.categoryRepo.save(category);
      totalInserted += inserted;
      this.logger.log(
        `  ✓ ${slug.padEnd(18)} → ${inserted} palabras`,
      );
    }

    this.logger.log(`Seed completado: ${totalInserted} palabras insertadas.`);
  }
}
