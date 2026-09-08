# Pre-MVP security audit

This document records the focused security review performed for Issue #60 before the Weaveryn 0.1.0 MVP handoff.

## Dependency and supply-chain review

- `package-lock.json` is committed and CI installs dependencies with `npm ci`.
- GitHub Actions used by the repository are pinned to immutable commit revisions.
- A previously identified `deepmerge-ts` vulnerability is mitigated through the repository override to `^8.0.0`.
- Pull-request CI runs `npm audit --audit-level=high`. High or critical findings therefore fail the security gate and must be resolved or explicitly documented before Issue #60 can close.
- The final audit result is recorded on the Issue #60 / security PR review after CI has run against the final branch head.

## Authentication and password handling

Weaveryn uses Better Auth with the Prisma adapter. The MVP password minimum is 15 characters and is defined centrally in `src/lib/auth-policy.ts`.

Better Auth owns password hashing and verification. Application code must not persist or log plaintext passwords or `BETTER_AUTH_SECRET`. The authentication integration test verifies that the stored credential hash is present and differs from the submitted plaintext password.

Password recovery email is intentionally deferred for the MVP. There is no supported user-facing recovery-email flow yet. Future successful password resets are configured to revoke sessions.

See `docs/AUTHENTICATION.md` for the full authentication boundary and policy.

## Session and cookie policy

The MVP explicitly configures:

- persisted database sessions;
- 7-day session lifetime;
- 1-day rolling refresh threshold;
- `HttpOnly` session cookies;
- `SameSite=Lax`;
- `Secure` cookies in production.

Local HTTP development does not use the `Secure` flag. Production is required to be browser-facing HTTPS.

## Authorization review

The pre-MVP review checked the main campaign/player/GM boundaries, including:

- campaign membership management is restricted to the Campaign owner;
- archived Campaign membership changes are rejected;
- Campaign context writes distinguish manager operations from explicitly delegated player capability;
- authorized Campaign context writes re-apply authorization predicates at the database update boundary;
- World Entity create/update/delete operations require `EDIT_CONTENT` permission;
- World Entity visibility distinguishes World, Campaign, GM, Player, and Private scopes;
- relationships require their source and target entities to be visible to the actor;
- security integration coverage exists for World Entity visibility/authorization behavior.

A low-severity metadata disclosure found during this review is tracked separately in #175: entity-type usage counts should be calculated from visible entities only.

## Browser security headers

Production responses are configured with:

- `Content-Security-Policy`;
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: SAMEORIGIN`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- restrictive `Permissions-Policy`.

React/Next development requires `unsafe-eval` for development diagnostics. Weaveryn therefore permits `unsafe-eval` only when `NODE_ENV=development`; production does not include it.

The current CSP still contains `unsafe-inline` allowances. Tightening this to a nonce/hash-based policy is tracked as defense-in-depth follow-up #176.

## Production deployment and secrets

The supported production shape is documented in `docs/SELF_HOSTING.md`:

- HTTPS terminates at the trusted reverse proxy;
- the application and PostgreSQL containers do not publish host ports;
- PostgreSQL is isolated on the internal backend network;
- runtime secrets are injected by the deployment environment rather than committed in a production `.env` file;
- `.env*` files are ignored by Git except for `.env.example`;
- `.env.example` contains placeholders/development values rather than production credentials;
- the production container runs as the non-root `node` user;
- build-only Better Auth/database values in the Docker build are explicitly non-production placeholders.

Production operators must use unique generated secrets and keep `BETTER_AUTH_URL` on the public HTTPS origin.

## Deferred hardening

The following findings are intentionally tracked outside the MVP security gate rather than being hidden or silently accepted:

- #175 — scope World Entity type usage counts to entities visible to the requesting user.
- #176 — replace production CSP `unsafe-inline` allowances with a Next.js-compatible nonce/hash strategy.

These are defense-in-depth / low-severity follow-ups. Any high or critical dependency finding, authentication secret exposure, plaintext password handling, or obvious cross-user privilege escalation remains a blocker for Issue #60.

## Final validation gate

The security PR must pass the repository CI at its final head. That includes:

1. `npm audit --audit-level=high`;
2. repository formatting and linting;
3. Prisma validation and generation;
4. TypeScript/Next.js type checking;
5. unit tests;
6. production Next.js build;
7. authentication and other integration tests;
8. persisted MVP browser journey;
9. production Compose validation;
10. production container build.

Issue #60 should remain open until this final validation evidence is available.
