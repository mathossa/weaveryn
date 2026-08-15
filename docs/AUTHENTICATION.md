# Authentication

Weaveryn uses Better Auth for the MVP authentication boundary.

## Dependency

- Package: `better-auth`
- Version range: `^1.6.25`
- License: MIT
- Upstream: Better Auth
- Reason: maintained open-source email/password authentication, persisted sessions, Next.js integration, and Prisma support without requiring a hosted identity provider.

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

Deletion is blocked while the User still owns any Campaign or Character. Owned Worlds are explicitly orphaned by setting `World.ownerId` to `null`, preserving the World, its ID, memberships, content, timelines, and Campaign references. The User is then deleted in the same Prisma transaction. Better Auth sessions and credential account rows are removed through their explicit user-scoped cascade relationships.

## Configuration

Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in the runtime environment. Never commit a real production secret.
