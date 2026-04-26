import 'reflect-metadata';
import { dirname, resolve } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { DataSource } from 'typeorm';

import { CATEGORY_SLUGS, DEFAULT_LOCALE } from '@ahorcado/shared';

import { CategoryEntity } from '../modules/words/entities/category.entity';
import { WordEntity } from '../modules/words/entities/word.entity';
import { GameSessionEntity } from '../modules/sessions/entities/game-session.entity';
import { PlayerEntity } from '../modules/sessions/entities/player.entity';
import {
  inferDifficulty,
  normalizeWord,
} from '../modules/words/word-normalize';

const here = dirname(__filename);

const REPO_ROOT = resolve(here, '..', '..', '..', '..');

function loadDotenv() {
  const candidate = resolve(REPO_ROOT, '.env');
  if (!existsSync(candidate)) return;
  const raw = readFileSync(candidate, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

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

async function main() {
  loadDotenv();

  const locale = process.env.WORDS_SEED_LOCALE || DEFAULT_LOCALE;

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [CategoryEntity, WordEntity, GameSessionEntity, PlayerEntity],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  console.log(`✓ Conectado a Postgres como ${process.env.DB_USERNAME}`);

  const categoryRepo = ds.getRepository(CategoryEntity);
  const wordRepo = ds.getRepository(WordEntity);

  const seedsDir = resolve(here, 'seeds', locale);
  if (!existsSync(seedsDir)) {
    throw new Error(`No existe el directorio de seeds: ${seedsDir}`);
  }
  const files = (await readdir(seedsDir)).filter((f) => f.endsWith('.json'));
  console.log(`↻ Leyendo ${files.length} archivos en ${seedsDir}`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const slug of CATEGORY_SLUGS) {
    const file = resolve(seedsDir, `${slug}.json`);
    if (!existsSync(file)) {
      console.warn(`  ⚠ ${slug}: archivo no encontrado, salto`);
      continue;
    }
    const raw = await readFile(file, 'utf8');
    const list = JSON.parse(raw) as string[];
    if (!Array.isArray(list)) {
      console.warn(`  ⚠ ${slug}: contenido no es un array`);
      continue;
    }

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
    } else {
      // Refrescar nombre/icon por si los actualizamos en META
      category.name = meta.name;
      category.icon = meta.icon;
      await categoryRepo.save(category);
    }

    const seen = new Set<string>();
    const rows: WordEntity[] = [];
    for (const display of list) {
      if (typeof display !== 'string') continue;
      const trimmed = display.trim();
      if (!trimmed) continue;
      const text = normalizeWord(trimmed);
      if (!text) continue;
      if (seen.has(text)) continue;
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

    let inserted = 0;
    let skipped = 0;
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
      const ins = result.identifiers.filter(Boolean).length;
      inserted += ins;
      skipped += batch.length - ins;
    }

    const total = await wordRepo.count({
      where: { categoryId: category.id, locale },
    });
    category.wordCount = total;
    await categoryRepo.save(category);

    totalInserted += inserted;
    totalSkipped += skipped;
    console.log(
      `  ✓ ${slug.padEnd(18)} insertadas=${String(inserted).padStart(3)}  saltadas(dup)=${String(skipped).padStart(3)}  total=${total}`,
    );
  }

  console.log(
    `\nResumen: insertadas=${totalInserted} saltadas=${totalSkipped} locale=${locale}`,
  );
  await ds.destroy();
}

main().catch((err) => {
  console.error('Seed FAILED:', err);
  process.exit(1);
});
