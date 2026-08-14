# Weaveryn Development Setup

## Prerequisites

- Node.js and npm compatible with `package-lock.json`
- Docker with Docker Compose
- PostgreSQL client tools only when you want to inspect the database manually

## Install dependencies

```bash
npm ci
```

## Start the dedicated development database

```bash
docker compose up -d postgres
cp .env.example .env.local
```

Docker Compose initializes `weaveryn_dev`. The application and visual acceptance
hub use the same dedicated development database by default; they must not point
at a production or normally named application database.

`POSTGRES_DB` is used only when PostgreSQL initializes a new Docker volume. If
your existing `weaveryn-postgres-data` volume predates issue #34, create the new
database once without deleting the volume or the old database:

```bash
docker exec weaveryn-postgres createdb -U weaveryn weaveryn_dev
```

If PostgreSQL reports that `weaveryn_dev` already exists, no action is required.

Apply migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

## Start Weaveryn

```bash
npm run dev
```

Open:

- application: `http://localhost:3000`
- development test hub: `http://localhost:3000/dev`

The hub displays whether `DATABASE_URL` targets the database named by
`DEV_DATABASE_NAME`. Scenario APIs remain blocked until that safety check passes.

## Validation

```bash
npm test
npm run lint
npx tsc --noEmit
npx prisma format
npx prisma validate
npm run build
```

See [Visual Acceptance Testing](VISUAL_TESTING.md) for scenario lifecycle,
cleanup rules, the feature-issue checklist, and how to add another scenario.
