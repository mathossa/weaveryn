# Weaveryn Agent Instructions

## Documentation Authority

Before making domain, product, or architectural changes, read the relevant project
documentation.

Different documents are authoritative for different decision types:

1. `docs/ARCHITECTURE.md`
   - Authoritative source for **current** domain architecture, ownership,
     permissions, lifecycle rules, and implemented system invariants.
2. `docs/DATA_MODEL.md`
   - Logical representation of current entities, relationships, scope, and
     constraints.
   - Must not contradict `ARCHITECTURE.md`.
3. `docs/MVP.md`
   - Defines the current MVP scope.
   - Do not implement post-MVP features unless explicitly requested.
4. `docs/VISION_2-0.md`
   - Authoritative source for long-term product direction and intended UX.
   - Supersedes older product-direction statements when they conflict.
   - A future vision decision does not automatically override an unmodified
     current architecture invariant; update architecture/data-model docs explicitly
     when implementing that change.
5. `README.md`
   - Installation/front-door documentation and documentation index.
   - Not authoritative for product or domain rules.

When a product request is described in Vision 2.0 but deferred by MVP, treat it as
future direction unless the task explicitly asks to implement it now.

If current architecture documentation is ambiguous or contradictory, do not invent
a domain rule. Report the ambiguity before implementing it.

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

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
