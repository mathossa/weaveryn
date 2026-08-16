# Authentication

Weaveryn uses Better Auth for the MVP authentication boundary.

## Dependency

- Package: `better-auth`
- Version: `1.6.25` (pinned stable release)
- License: MIT
- Upstream: Better Auth
- Reason: maintained open-source email/password authentication, persisted sessions, Next.js integration, and Prisma support without requiring a hosted identity provider.

The Prisma adapter is installed explicitly through `@better-auth/prisma-adapter` at the same pinned version.

## Identity model

The existing Prisma `User` remains the authoritative Weaveryn domain identity. Better Auth is configured to use that same `User` model and UUID ID. It does not introduce a second application user identity.

Better Auth owns generic authentication mechanics:

- password hashing and verification
- credential records
- session token generation and persistence
- authentication cookies
- sign-up, sign-in, and sign-out protocol handling

Weaveryn owns domain behavior:

- authenticated User resolution at the request boundary
- authorization inside application services
- account-deletion preflight and lifecycle rules
- World orphaning and protection of independently owned Campaigns and Characters

## MVP scope

Enabled: local email/password registration, login, logout, persisted database sessions, and server-side authenticated User resolution.

Deferred: social login, email verification workflow, password recovery email, MFA, passkeys, magic links, and organization/RBAC plugins.

## Routes

Better Auth is mounted at `/api/auth/*` through its supported Next.js handler.

`GET /api/account` returns account-deletion preflight state for the authenticated user.

`DELETE /api/account` performs the Weaveryn-specific deletion workflow. It must not be replaced by a generic auth-framework delete-user endpoint.

## Account deletion

Deletion is blocked while the User still owns any Campaign or Character, regardless of Campaign status. Owned Worlds are passed through the same guarded orphaning behavior used by the World orphan lifecycle service from Issue #13, preserving the World, its ID, memberships, content, timelines, and Campaign references. The User is then deleted in the same Prisma transaction. Better Auth sessions and credential account rows are removed through their explicit user-scoped cascade relationships.

## Automated integration coverage

Fast unit tests remain database-independent. `*.integration.test.ts` files are excluded from `npm test` and are run separately with:

```bash
npm run test:integration
```

The authentication integration test uses the real Better Auth instance and Prisma adapter against the configured PostgreSQL development or test database. It verifies registration, password hashing at rest, rejection of an incorrect password, persisted sign-in sessions, authenticated Weaveryn User resolution, and logout/session invalidation. The test creates a unique temporary account and removes it afterwards.

The integration test refuses to run unless `DATABASE_URL` and `DEV_DATABASE_NAME` identify the same clearly marked development or test database. CI provisions `weaveryn_test`, applies migrations, runs the normal repository validation, and then runs the integration suite.

## Configuration

Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in the runtime environment. Never commit a real production secret.
