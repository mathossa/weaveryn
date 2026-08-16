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

User identity has three deliberately separate fields:

- `email` is the private login/recovery/contact identity. It is not the public identifier for discovering another user.
- `username` is the required unique public handle. It is displayed as `@username` and is intended for future search, mentions, invitations, and similar public identity surfaces.
- `displayName` is the friendly non-unique name used for presentation.

The MVP continues to authenticate with email and password. Username-based login is not enabled merely because a public username exists.

### Username policy

Every User has a username. Registration normalizes the submitted username by trimming it and converting it to lowercase before persistence.

A valid username:

- is 3-30 characters after normalization;
- contains only lowercase letters, numbers, `.`, `_`, and `-` after normalization;
- starts and ends with a letter or number; and
- is not one of the reserved platform names defined by the shared authentication policy.

Because all supported registration writes normalize before persistence and the database column is unique, normal application/auth flows treat username uniqueness case-insensitively. Username changes are intentionally not exposed in the current MVP; a future rename workflow must preserve the same validation and uniqueness rules.

The signed-in user's own private account menu may show their email for account context. Other users must not receive email merely as a consequence of seeing a public username or display name.

Better Auth owns generic authentication mechanics:

- password hashing and verification
- credential records
- session token generation and persistence
- authentication cookies
- sign-up, sign-in, and sign-out protocol handling

Weaveryn owns domain behavior:

- authenticated User resolution at the request boundary
- public username validation/normalization policy
- authorization inside application services
- account-deletion preflight and lifecycle rules
- World orphaning and protection of independently owned Campaigns and Characters

## MVP scope

Enabled: local email/password registration with required public username, login, logout, persisted database sessions, and server-side authenticated User resolution.

Deferred: username-based login, username rename UI, social login, email verification workflow, password recovery email, MFA, passkeys, magic links, and organization/RBAC plugins.

## Routes

Better Auth is mounted at `/api/auth/*` through its supported Next.js handler.

`GET /api/v1/account` returns account-deletion preflight state for the authenticated user.

`DELETE /api/v1/account` performs the Weaveryn-specific deletion workflow. It must not be replaced by a generic auth-framework delete-user endpoint.

## Account deletion

Deletion is blocked while the User still owns any Campaign or Character, regardless of Campaign status. Owned Worlds are passed through the same guarded orphaning behavior used by the World orphan lifecycle service from Issue #13, preserving the World, its ID, memberships, content, timelines, and Campaign references. The User is then deleted in the same Prisma transaction. Better Auth sessions and credential account rows are removed through their explicit user-scoped cascade relationships.

## Automated integration coverage

Fast unit tests remain database-independent. `*.integration.test.ts` files are excluded from `npm test` and are run separately with:

```bash
npm run test:integration
```

The authentication integration test uses the real Better Auth instance and Prisma adapter against the configured PostgreSQL development or test database. It verifies required username registration and normalization, rejection of missing/invalid/duplicate usernames, password hashing at rest, rejection of an incorrect password, persisted sign-in sessions, authenticated Weaveryn User resolution, and logout/session invalidation. The test creates unique temporary accounts and removes them afterwards.

The integration test refuses to run unless `DATABASE_URL` and `DEV_DATABASE_NAME` identify the same clearly marked development or test database. CI provisions `weaveryn_test`, applies migrations, runs the normal repository validation, and then runs the integration suite.

## Development database reset for Issue #57

Issue #57 intentionally changes `User.username` from nullable to required while the project is still using disposable development data. The project owner explicitly approved clearing/recreating the current development database instead of creating a legacy username-claim migration.

If an existing development database contains Users with `username = NULL`, reset that explicitly approved development database before applying the Issue #57 migration. Do not synthesize public usernames from private email addresses.

This reset decision is specific to the current disposable development database. Future migrations against persistent production or self-hosted user data must preserve existing identities safely.

## Configuration

Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in the runtime environment. Never commit a real production secret.
