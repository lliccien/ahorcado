# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication language

**IMPORTANT: Toda la comunicación con el usuario debe ser en español.** Respuestas, explicaciones, mensajes de commit, descripciones de PRs, comentarios al usuario — todo en español. El código (nombres de variables, funciones, archivos) sigue las convenciones del proyecto y puede estar en inglés, pero cualquier texto dirigido al usuario debe estar en español.

## Expertise

**Eres un experto en la creación de juegos.** Aplica ese conocimiento al diseñar mecánicas, loops de juego, estados, gestión de input, feedback visual/auditivo, balance de dificultad, accesibilidad y arquitectura de código orientada a juegos (máquinas de estado, separación entre lógica de juego y presentación, etc.). Dado que el repo se llama `ahorcado`, anticipa que el trabajo girará en torno a construir un juego del ahorcado y propón decisiones de diseño acordes cuando el usuario pida implementaciones genéricas.

## Repository layout

pnpm + Turborepo monorepo. Two apps live under `apps/`:

- `apps/api` — NestJS 11 backend (TypeORM + Postgres, ioredis dependency present, Swagger).
- `apps/web` — Astro 5 SSR frontend (`output: 'server'`, `@astrojs/node` standalone adapter, React 19 + Tailwind 4 via Vite plugin).

`packages/shared` aloja constantes y tipos compartidos entre `apps/api` y `apps/web` (ej. `CATEGORY_SLUGS`, `DEFAULT_LOCALE`). El alias `@ahorcado/shared` está declarado en `pnpm-workspace.yaml` y se importa desde ambos apps.

El juego del ahorcado está implementado: módulos `words` (categorías y palabras), `sessions` (sala + jugadores), `game` (rondas y resultados), `leaderboard` y `realtime` (gateway Socket.IO con adapter de Redis). El frontend Astro consume el API y el WebSocket.

## Commands

Run from the repo root unless noted. All `pnpm <task>` invocations go through Turborepo.

```bash
pnpm dev              # both apps; pnpm dev:api / pnpm dev:web for one
pnpm build            # build:api / build:web available
pnpm test             # only api has a test script defined
pnpm lint             # only api has a lint script defined
pnpm type-check       # turbo task `check-types` (none of the apps define it yet)
pnpm format           # prettier across the repo (root-level script, not turbo)
```

Inside `apps/api` (NestJS-native scripts, not turbo):

```bash
pnpm dev              # nest start --watch
pnpm test             # jest unit tests (rootDir: src, *.spec.ts)
pnpm test:watch       # single file: pnpm test:watch -- path/to/file.spec.ts
pnpm test -- -t "name pattern"   # single test by name
pnpm test:e2e         # jest --config ./test/jest-e2e.json
pnpm test:cov         # coverage → apps/coverage/
pnpm lint             # eslint --fix (auto-fixes; review the diff)
pnpm seed             # poblar categorías y palabras (idempotente)

# Migraciones de TypeORM (ver "Schema y migraciones" más abajo)
pnpm migration:generate src/migrations/<Nombre>   # diff entities ↔ DB
pnpm migration:create   src/migrations/<Nombre>   # archivo vacío
pnpm migration:run                                # aplica pendientes
pnpm migration:revert                             # revierte la última
pnpm migration:show                               # estado [X]/[ ]
```

The `web` app has no `lint`/`test` script — `pnpm test`/`pnpm lint` from the root will silently skip it.

## Local dev workflow

Postgres + Redis run as containers, the apps run on the host:

```bash
cp .env.example .env       # API loads this file from the repo root (see below)
make dev-up                # docker compose -f docker/docker-compose.dev.yml up -d
pnpm dev
```

`make` targets and comments are in Spanish. `make help` lists them. Production targets (`make prod-*`) build/run `docker/Dockerfile.api` + `Dockerfile.web` via `docker-compose.prod.yml`.

## Schema y migraciones

La API tiene una política dual según el entorno (ver [apps/api/src/app.module.ts](apps/api/src/app.module.ts)):

- **dev (`NODE_ENV !== 'production'`)**: `synchronize: true`, `migrationsRun: false`. TypeORM ajusta el schema desde las entities al arrancar para iterar rápido. Las migraciones se generan a demanda.
- **prod (`NODE_ENV === 'production'`)**: `synchronize: false`, `migrationsRun: true`. El schema lo gestionan exclusivamente las migraciones versionadas en [apps/api/src/migrations/](apps/api/src/migrations/) y se aplican automáticamente al arrancar.

El CLI de TypeORM se invoca a través de [apps/api/src/data-source.ts](apps/api/src/data-source.ts) y un `tsconfig.cli.json` aparte que sobrescribe `module: commonjs` (el `tsconfig.json` principal usa `nodenext`, incompatible con cómo TypeORM CLI carga el archivo). El mismo `DataSource` se reusa en el script `pnpm seed`.

**Workflow al cambiar una entity:**
1. Editar la entity. En dev se ve reflejado al instante por `synchronize: true`.
2. `pnpm --filter api migration:generate src/migrations/<NombreDescriptivo>` — genera el diff entre entities y DB.
3. Revisar el SQL generado y commitear la migración junto al cambio de entity.
4. En el próximo deploy a producción la migración corre automáticamente.

**Seeders de categorías/palabras** ([apps/api/src/modules/words/words-seeder.service.ts](apps/api/src/modules/words/words-seeder.service.ts)): corren en `OnModuleInit` y **sincronizan la DB con los JSON en cada arranque** (UPSERT + prune, en una sola transacción):

- Inserta categorías nuevas y actualiza `name`/`icon` de las existentes si cambiaron en `META`.
- Inserta palabras del JSON que no estén en la DB (vía `orIgnore` por la UNIQUE `(categoryId, text, locale)`).
- **Borra palabras** que están en la DB y ya no figuran en el JSON.
- **Borra categorías** cuyo slug no esté en `CATEGORY_SLUGS` (las palabras se van por CASCADE).
- Recalcula `wordCount` solo si cambió.

Si los JSON no cambiaron, la transacción no hace ninguna escritura efectiva y el log es `Seed sincronizado sin cambios (locale=es-419)`. Deshabilitable con `WORDS_SEED_AUTO=false`. Los datos viven en [apps/api/src/scripts/seeds/es-419/](apps/api/src/scripts/seeds/es-419/).

**Para añadir palabras o categorías**: editar el JSON (y `CATEGORY_SLUGS` en `@ahorcado/shared` si es categoría nueva), reiniciar la API y los cambios se reflejan automáticamente. Sirve igual en dev y en prod.

## Non-obvious things

- **Single root `.env`.** The API loads env from the repo root explicitly: [apps/api/src/app.module.ts](apps/api/src/app.module.ts) uses `path.resolve(__dirname, '../../../.env')`. There is no per-app `.env`. Astro picks up the same root `.env` because Vite walks up from `apps/web`.
- **Port mismatch in docs vs. config.** README claims the web app runs on `3001`, but `.env.example` and `apps/web/astro.config.mjs` both default to `4321`. Trust the config; update README if you change it.
- **Health endpoints already exist.** `GET /` (hello), `GET /health` (db + memory + disk), `GET /health/liveness`, `GET /health/readiness`. Defined in [apps/api/src/app.controller.ts](apps/api/src/app.controller.ts). Swagger UI at `/api/docs`.
- **API test rootDir is `src`.** Jest config in [apps/api/package.json](apps/api/package.json) sets `rootDir: "src"`, so unit specs live next to source as `*.spec.ts`. E2E specs live in `apps/api/test/` and use a separate config.
