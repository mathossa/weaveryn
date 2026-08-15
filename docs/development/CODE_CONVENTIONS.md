# Code Conventions

These conventions keep implementation choices consistent without adding or
changing domain rules. `docs/ARCHITECTURE.md` remains authoritative for domain
behavior, followed by `docs/DATA_MODEL.md` and `docs/MVP.md`.

## Source organization

- Put server-side domain and application code under `src/server/<domain>`.
- Keep UI components and route handlers thin. They call shared application
  services rather than implementing business rules independently.
- Keep ownership, membership, authorization, persistence, and presentation as
  separate concerns. Sharing roles, errors, or other primitives does not make
  those concerns one service.
- Put browser/server-neutral development contracts under `src/dev`. Keep fixture
  mutation and scenario execution under `src/server/dev-scenarios`.

Repository abstractions are useful when they isolate persistence behavior or
make a service testable. They are not required around every Prisma operation;
transactional application services may use a deliberately narrow injected
database type directly.

## Domain and persistence boundaries

- Prefer domain/application types in service interfaces.
- Keep Prisma-generated models, enums, and transaction types at persistence or
  transaction boundaries where practical.
- Convert between persistence and domain representations explicitly when their
  shapes differ.
- Do not expose Prisma operations, arbitrary record IDs, or persistence filters
  through untrusted client input.

## Errors and transport mapping

- Domain failures use a domain-specific error class with a typed error code.
- Error codes are stable behavior. Refactors preserve existing codes and
  user-visible messages unless a behavior change is approved.
- Services do not return HTTP status codes or response objects.
- Route or handler boundaries map domain errors to transport responses.

## Runtime validation and authorization

- Validate JSON, URL parameters, environment variables, and other untrusted data
  at a shared runtime boundary before calling typed services.
- Centralize reusable validators such as role checks instead of repeating
  allowlists.
- Authorization remains server-side and fail-closed. Do not remove a defensive
  permission check merely because an internal parameter has a TypeScript type.
- Client-side validation improves usability but is never the integrity or
  authorization boundary.

## Tests and visual scenarios

- Colocate automated tests as `name.test.ts` beside the implementation.
- Cover important domain invariants, authorization outcomes, transaction
  behavior, and concurrency-sensitive writes with automated tests.
- User-testable or domain behavior additionally registers or extends a `/dev`
  visual scenario according to `VISUAL_TESTING.md`.
- Visual scenarios supplement automated tests; they do not replace unit,
  integration, or future end-to-end coverage.

## Formatting and validation

Run:

```bash
npm run format
npm run validate
```

`npm run validate` is the standard complete check. It verifies formatting,
linting, Prisma configuration/client generation, Next.js route types,
TypeScript, automated tests, and the production build.

Schema changes additionally require `npx prisma format`, careful migration
review, and the Prisma checks required by `AGENTS.md`.

## Refactoring

- Prefer the smallest coherent refactor that removes a demonstrated
  inconsistency or duplication.
- Preserve observable behavior, public error codes, transaction boundaries, and
  documented invariants.
- Do not combine modules solely to reduce file count.
- Keep purely mechanical formatting changes separate from behavioral changes
  where practical so reviews remain readable.
- Report ambiguous domain behavior instead of resolving it during cleanup.
