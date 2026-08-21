# Weaveryn

> **An open-source platform for creating worlds, running campaigns, and playing tabletop role-playing games.**

> [!IMPORTANT]
> Weaveryn is in early development. The current implementation does not yet include
> every capability described in the product vision.

This README is the project front door: use it to get a local development instance
running and to find the authoritative documentation for the topic you are working
on.

## Local development setup

### Prerequisites

- Node.js `^20.19`, `^22.12`, or `^24` with npm
- Docker with Docker Compose
- Git

PostgreSQL client tools are optional and are only needed for manual database
inspection.

### 1. Clone and install

```bash
git clone https://github.com/mathossa/weaveryn.git
cd weaveryn
npm ci
```

### 2. Start PostgreSQL and configure the environment

```bash
docker compose up -d postgres
cp .env.example .env
```

Generate a unique Better Auth secret for this environment:

```bash
openssl rand -base64 32
```

Copy the generated value into `BETTER_AUTH_SECRET` in `.env`. Use a different
secret for each deployment and do not commit `.env`.

The development Compose stack starts PostgreSQL 17 and uses the dedicated
`weaveryn_dev` database.

Before using a shared or deployed environment, replace the example Better Auth
secret in `.env` with a unique strong secret and review the instance-admin network
settings.

### 3. Apply the database migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

Use `npx prisma migrate dev` only when intentionally authoring a new Prisma
migration.

### 4. Start Weaveryn

```bash
npm run dev
```

Open:

- application: `http://localhost:3000`
- visual development/test hub: `http://localhost:3000/dev`

The `/dev` hub is deliberately protected against production or incorrectly named
databases. See the visual-testing documentation before changing its safety checks.

For database-volume migration notes and the full development setup, see
[Development Setup](docs/development/SETUP.md).

## Validation

Run the complete repository validation before considering a change finished:

```bash
npm run validate
```

This checks formatting, linting, Prisma validation/generation, Next.js route types,
TypeScript, unit tests, and the production build.

Useful commands:

```bash
npm run format        # apply Prettier formatting
npm run lint          # ESLint
npm test              # unit tests
npm run typecheck     # Next route types + TypeScript
npm run build         # production build
npm run weaveryn -- --help  # instance administration CLI
```

## Documentation index

### Product direction

- **[Vision 2.0](docs/VISION_2-0.md)** — current long-term product vision,
  interaction direction, character-first entry model, privacy/knowledge rules,
  timeline direction, Ruleset direction, AI boundaries, and UX principles.
- [MVP](docs/MVP.md) — what the current MVP must prove and what is explicitly
  deferred.
- [Roadmap](ROADMAP.md) — roadmap placeholder/status and pointers to planning
  sources.
- [Features](docs/FEATURES.md) — feature-catalogue placeholder and scope pointers.

### Domain and data

- **[Architecture](docs/ARCHITECTURE.md)** — authoritative current domain rules,
  ownership, lifecycle, permissions, and system invariants.
- [Data Model](docs/DATA_MODEL.md) — logical entities, relations, and constraints.
- [Rulesets](docs/RULESETS.md) — Ruleset architecture/lifecycle documentation as it
  is developed.
- [Authentication](docs/AUTHENTICATION.md) — authentication and account behavior.

### UI and design

- [Design Principles](docs/DESIGN-PRINCIPLES.md) — design-document pointer; Vision
  2.0 currently contains the authoritative product/interaction principles.
- [UI Assets](docs/UI_ASSETS.md) — supported default/fallback visual assets and
  usage rules.
- [Concept images](docs/images/concepts/) — historical/concept artwork; these are
  illustrative and may predate Vision 2.0 decisions.

### Deployment

- **[Self-hosting](docs/SELF_HOSTING.md)** — production-oriented Portainer,
  PostgreSQL, GHCR, reverse-proxy, environment, update, and rollback guidance.
- [Release and Versioning Policy](docs/development/RELEASES.md) — release tags,
  edge builds, version sources, production isolation, and release readiness.

### Development

- **[Development Setup](docs/development/SETUP.md)** — detailed local setup,
  database safety, and validation workflow.
- [Code Conventions](docs/development/CODE_CONVENTIONS.md) — source organization,
  boundaries, validation, errors, and testing conventions.
- [Visual Acceptance Testing](docs/development/VISUAL_TESTING.md) — `/dev` scenario
  lifecycle, fixture rules, cleanup, and safety requirements.
- [Tech Stack](docs/TECH_STACK.md) — selected technologies and technical rationale.
- [Agent Instructions](AGENTS.md) — documentation authority and repository rules
  for coding agents.

## Which document wins?

Different documents own different kinds of decisions:

- **Product/UX direction:** `docs/VISION_2-0.md`
- **Current domain invariants:** `docs/ARCHITECTURE.md`
- **Logical model:** `docs/DATA_MODEL.md`
- **Current MVP scope:** `docs/MVP.md`
- **Implementation conventions:** `AGENTS.md` and `docs/development/*`

A future idea in Vision 2.0 is not automatically implemented. If implementing the
vision requires a domain change, update the architecture/data-model documentation
as part of that feature.

## Self-hosting status

Self-hosting is a first-class project goal. The production-oriented Portainer setup
is documented in [Self-hosting Weaveryn](docs/SELF_HOSTING.md). The existing root
`compose.yml` remains development-only and must not be used as a production recipe.

While Weaveryn is in early development, deployments that track `main` use the
explicit `edge` image channel rather than a stable release tag.

## License

Weaveryn is licensed under the [GNU Affero General Public License v3](LICENSE).
