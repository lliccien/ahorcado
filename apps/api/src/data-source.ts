import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DataSource } from 'typeorm';

import { CategoryEntity } from './modules/words/entities/category.entity';
import { WordEntity } from './modules/words/entities/word.entity';
import { GameSessionEntity } from './modules/sessions/entities/game-session.entity';
import { PlayerEntity } from './modules/sessions/entities/player.entity';
import { RoundEntity } from './modules/game/entities/round.entity';
import { RoundResultEntity } from './modules/game/entities/round-result.entity';

// El CLI de TypeORM (`migration:generate`, `migration:run`, etc.) corre
// fuera del runtime de Nest, así que necesitamos cargar `.env` a mano. La
// API en runtime carga el mismo archivo desde la raíz del repo (ver
// `app.module.ts`), así que mantenemos coherencia.
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

function loadDotenv(): void {
  const candidate = resolve(REPO_ROOT, '.env');
  if (!existsSync(candidate)) return;
  const raw = readFileSync(candidate, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^"|"$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotenv();

// `__dirname` resuelve a `src/` cuando ts-node corre el CLI y a `dist/`
// cuando se ejecuta el bundle compilado. El glob `*.{ts,js}` cubre ambos.
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    CategoryEntity,
    WordEntity,
    GameSessionEntity,
    PlayerEntity,
    RoundEntity,
    RoundResultEntity,
  ],
  migrations: [resolve(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});

export default AppDataSource;
