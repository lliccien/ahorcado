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

`packages/` is declared in `pnpm-workspace.yaml` and `tsconfig.json` aliases `@shared/*` → `packages/shared/*`, but the directory does not exist yet — create it before relying on the alias.

The repo dir is named `ahorcado` (Spanish for "hangman") but the code is currently the unmodified `monorepo-nestjs-astrojs-template` — nothing hangman-specific has been built.

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

## Non-obvious things

- **Single root `.env`.** The API loads env from the repo root explicitly: [apps/api/src/app.module.ts:13](apps/api/src/app.module.ts#L13) does `path.resolve(__dirname, '../../../.env')`. There is no per-app `.env`. Astro picks up the same root `.env` because Vite walks up from `apps/web`.
- **Port mismatch in docs vs. config.** README claims the web app runs on `3001`, but `.env.example` and `apps/web/astro.config.mjs` both default to `4321`. Trust the config; update README if you change it.
- **TypeORM `synchronize: true`.** [apps/api/src/app.module.ts:24](apps/api/src/app.module.ts#L24) — schema auto-syncs on boot. Fine for dev, must be turned off and replaced with migrations before any production use. Entities are picked up via `autoLoadEntities: true`, so registering an entity = adding `@Entity()` and importing the feature module.
- **Health endpoints already exist.** `GET /` (hello), `GET /health` (db + memory + disk), `GET /health/liveness`, `GET /health/readiness`. Defined in [apps/api/src/app.controller.ts](apps/api/src/app.controller.ts). Swagger UI at `/api/docs`.
- **Redis is a dependency, not wired.** `ioredis` is installed but no module imports it yet — there's no `RedisModule` to extend.
- **API test rootDir is `src`.** Jest config in [apps/api/package.json](apps/api/package.json) sets `rootDir: "src"`, so unit specs live next to source as `*.spec.ts`. E2E specs live in `apps/api/test/` and use a separate config.
