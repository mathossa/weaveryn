# Weaveryn Development Setup

## Prerequisites

- Node.js `^20.19`, `^22.12`, or `^24` and its bundled npm
- Docker with Docker Compose
- PostgreSQL client tools only when you want to inspect the database manually

## Install dependencies

```bash
npm ci
```

## Start the dedicated development database

```bash
docker compose up -d postgres
cp .env.example .env
```

Docker Compose initializes `weaveryn_dev`. The application and visual acceptance
hub use the same dedicated development database by default; they must not point
at a production or normally named application database. The Prisma configuration
loads `.env`, so keep the development database values in that file.

`POSTGRES_DB` is used only when PostgreSQL initializes a new Docker volume. If
your existing `weaveryn-postgres-data` volume predates issue #34, create the new
database once without deleting the volume or the old database:

```bash
docker exec weaveryn-postgres createdb -U weaveryn weaveryn_dev
```

If PostgreSQL reports that `weaveryn_dev` already exists, no action is required.

Apply the committed migrations and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Use `npx prisma migrate dev` instead when intentionally authoring a new schema
migration.

## Optional development dummy data

After applying migrations, you can populate the development database with a
reusable sample dataset:

```bash
npm run db:dummy
```

The dataset includes multiple users, two Worlds, three Campaigns, mixed World and
Campaign roles, eleven Characters, WorldCharacters, CampaignCharacters, World
entities, and entity relationships. Nine of the Characters belong to one primary
sample user so character-selection screens can be exercised with a larger list.
One Character is also represented in two Worlds to exercise the portable
`Character -> WorldCharacter` model.

The default sample identities are database records only and do not have Better
Auth passwords. To attach the primary sample data to an existing account that you
can log in with, pass that account's email address:

```bash
npm run db:dummy -- --owner-email you@example.com
```

Rerunning the command refreshes only its own namespaced records. Remove the dummy
dataset with:

```bash
npm run db:dummy -- --clean
```

The dummy-data command follows the same database-name safety principle as the
visual scenario tooling: it refuses to run when `NODE_ENV=production`, when the
expected database name is not clearly a dev/test name, or when `DATABASE_URL`
does not target `DEV_DATABASE_NAME`. It also checks its deterministic IDs and
sample identities before replacing anything so a conflicting record fails closed.

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
npm run validate
```

The validation script checks formatting, linting, Prisma validity and client
generation, Next.js route-type generation, TypeScript, unit tests, and a
production build in the required order. Before generating route types, it removes
stale development-only route types that Next.js can leave behind when switching
branches. Run `npm run format` to apply formatting.

Run `npx prisma format` after intentionally changing `prisma/schema.prisma`, then
verify the resulting schema diff before committing it.

See [Visual Acceptance Testing](VISUAL_TESTING.md) for scenario lifecycle,
cleanup rules, the feature-issue checklist, and how to add another scenario.
See [Code Conventions](CODE_CONVENTIONS.md) for source organization, boundaries,
errors, validation, and test placement.
