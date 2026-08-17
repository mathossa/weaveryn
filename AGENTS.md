# Weaveryn Agent Instructions

## Documentation Authority

Before making domain or architectural changes, read the relevant project documentation.

Authority order:

1. `docs/ARCHITECTURE.md`
   - Authoritative source for domain architecture, ownership, permissions,
     lifecycle rules, and system invariants.
2. `docs/DATA_MODEL.md`
   - Logical representation of entities, relationships, scope, and constraints.
   - Must not contradict `ARCHITECTURE.md`.
3. `docs/MVP.md`
   - Defines the current MVP scope.
   - Do not implement post-MVP features unless explicitly requested.
4. `README.md`
   - Project overview and user-facing concepts.
   - Not authoritative for detailed domain rules.

If documentation is ambiguous or contradictory, do not invent a domain rule.
Report the ambiguity before implementing it.

## Development Rules

- Read relevant existing code before modifying it.
- Do not rely on stale conversation context when repository files are available.
- Prefer the smallest coherent change that satisfies the task.
- Do not perform unrelated refactors.
- Do not introduce domain concepts that are not required by the current task.
- Keep ownership, membership, permissions, and visibility as distinct concepts.
- Enforce important domain invariants in backend/application services.
- Do not rely on client-side validation for authorization or domain integrity.
- Feature issues with user-testable or domain behavior must register or extend a
  visual scenario under `/dev`, or explicitly state why it is not applicable.
  Follow `docs/development/VISUAL_TESTING.md` for fixture and cleanup rules.
- Release, versioning, maintenance-branch, and production/dev-build work must
  follow `docs/development/RELEASES.md`.

## Code Organization and Conventions

- Keep domain/application code under `src/server/<domain>` and colocate related
  `*.test.ts` files with the implementation.
- Keep ownership, membership, authorization, persistence, and presentation as
  separate concerns even when they share domain primitives.
- Prefer application/domain types in services. Keep Prisma-generated types at
  persistence and transaction boundaries where practical.
- Use domain-specific typed error codes. Translate domain errors to transport
  responses at the HTTP boundary rather than returning HTTP concepts from
  services.
- Validate untrusted runtime input at shared boundaries. Security-sensitive
  authorization must remain fail-closed even when TypeScript types narrow input.
- Refactors must preserve observable behavior and must not change domain rules
  unless that behavior change is explicitly approved.
- Follow `docs/development/CODE_CONVENTIONS.md` for the complete conventions.

## Database and Prisma

- Treat destructive database operations carefully.
- Do not reset, delete, or recreate database data unless explicitly instructed.
- Do not modify existing migrations casually.
- Review referential actions such as `Cascade`, `Restrict`, and `SetNull`
  deliberately.
- Run Prisma formatting and validation after schema changes.
- Generate the Prisma client when required.

## Validation

After changes, run the relevant available checks:

- formatting
- Prisma validation/generation when applicable
- TypeScript/build checks
- relevant tests

Run `npm run validate` for the standard complete repository check.

Fix errors caused by the change before considering the task complete.

Report unresolved architectural decisions instead of silently choosing behavior.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos, the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
