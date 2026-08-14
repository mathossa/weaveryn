# Weaveryn Technical Stack

## Purpose

This document describes the intended technical stack and runtime architecture for Weaveryn.

It defines technology choices and deployment principles, but does not override domain rules in `ARCHITECTURE.md`, data concepts in `DATA_MODEL.md`, or current implementation scope in `MVP.md`.

Exact dependency versions are defined by `package.json` and related lock files.

---

## Application

Weaveryn is primarily a TypeScript web application.

Current application technologies:

- Next.js
- React
- TypeScript
- Node.js

Next.js provides the web application, server-side functionality, API endpoints, and application runtime.

Core business rules should remain in reusable application/domain services rather than UI components or route handlers.

---

## Database

Persistent structured application data is stored in PostgreSQL.

Prisma is used for:

- schema definition
- database migrations
- generated database client access
- relational data access

Application code should access PostgreSQL through shared persistence/application layers rather than distributing database logic throughout UI code.

PostgreSQL may run:

- locally
- in Docker
- on the same physical server as Weaveryn
- on a separate server
- as a managed PostgreSQL service

The application must not assume PostgreSQL runs on the same machine as the application.

---

## Asset Storage

Uploaded binary files are stored separately from structured application data.

Examples include:

- character portraits
- world artwork
- maps
- handouts
- PDFs
- attachments
- generated images

Asset metadata is stored in PostgreSQL.

Actual file content is accessed through a `StorageProvider` / `StorageService` abstraction.

Supported deployment models may include:

- local filesystem storage for simple single-node self-hosting
- S3-compatible object storage
- managed cloud object storage

Application/domain code must not depend directly on:

- local filesystem paths
- provider-specific URLs
- a particular object-storage vendor

Stored asset references should use provider-neutral identifiers such as storage keys.

Persistent user files must not exist only on an application worker's local filesystem.

---

## Stateless Application Instances

Application instances should be disposable and horizontally replaceable.

A Weaveryn application worker must not contain irreplaceable persistent user or application state.

Persistent state belongs in external persistence services such as:

- PostgreSQL
- object storage

This allows multiple application workers to serve the same deployment:

```text
                PostgreSQL
                    ▲
                    │
Users ──► Load Balancer ──► Weaveryn worker 1
                         ├─► Weaveryn worker 2
                         └─► Weaveryn worker N
                    │
                    ▼
               Object Storage
```

Application workers should be replaceable without copying data from the old worker to the new worker.

This supports:

- horizontal scaling
- rolling deployments
- blue/green deployments
- rapid worker replacement
- simpler disaster recovery

---

## Sessions and Runtime State

Authentication and authorization must not depend on state stored only in one application's process memory.

Requests from the same user may be handled by different application workers.

Any runtime state that must survive between requests must therefore be:

- cryptographically self-contained, or
- stored in shared persistence

Worker affinity should not be required for application correctness.

---

## Database Migrations and Deployments

Production database changes should account for rolling deployments.

Old and new application versions may temporarily operate against the same database schema.

Where practical, schema changes should therefore follow a backwards-compatible migration strategy such as:

```text
Expand
  ↓
Deploy / migrate data
  ↓
Contract
```

Destructive schema changes should not make currently running application workers immediately incompatible with the database.

---

## Logging

Application workers emit operational and debugging logs through standard output and standard error.

Operational logs are not normal application-domain data and should not normally be written to PostgreSQL.

A hosting platform or logging system may collect, search, retain, and archive those logs.

Examples include:

- request information
- errors
- warnings
- startup/shutdown events
- diagnostic information
- performance information

Logs should include correlation information such as request IDs where useful.

Persistent domain or security audit history is separate from operational logging and may be stored as application data.

---

## Styling

The web interface currently uses:

- Tailwind CSS

Reusable UI components and third-party component libraries may be introduced where they reduce unnecessary custom implementation.

---

## Testing

The current testing foundation uses:

- Vitest

Additional testing tools may be introduced where appropriate, including browser/end-to-end testing.

Important domain invariants should be covered by automated tests.

---

## Deployment

Weaveryn should support both simple self-hosting and larger hosted deployments.

### Simple Self-Hosted Deployment

A single host may run logically separate services together:

```text
Docker host
├── Weaveryn
├── PostgreSQL
└── StorageProvider
```

Logical separation does not require physical separation.

### Hosted Deployment

A larger deployment may separate all persistent services:

```text
                   Managed PostgreSQL
                          ▲
                          │
Internet ──► Load Balancer ──► Weaveryn × N
                          │
                          ▼
                   Object Storage
```

The application architecture should support moving between these deployment models without changing domain behavior.

---

## Containers

Docker is the preferred packaging and self-hosting mechanism.

Containerized deployment should make it possible to run the required application services without requiring language-specific dependencies to be installed directly on the host.

Docker Compose may be used for simple self-hosted installations.

More advanced orchestration may be introduced later without requiring changes to the core application architecture.

---

## Client Platforms

Weaveryn is a responsive web application designed for use across different device types.

Primary targets:

- Desktop and laptop browsers
- Tablets
- Mobile phones
- PWA installation

No primary device class takes precedence over the others.

The interface should adapt to the available screen size and interaction method rather than simply scaling the same layout.

### Desktop

Desktop layouts may provide:

- multiple simultaneous panels
- persistent navigation
- drag-and-drop interfaces
- advanced GM controls
- large interactive maps

### Tablet

Tablet layouts may provide:

- touch-optimized controls
- character-sheet and map-focused layouts
- collapsible side panels
- convenient use during tabletop sessions

### Phone

Phone layouts may provide:

- compact navigation
- character sheet access
- dice rolling
- notes and journal access
- quick actions
- campaign information
- AI interaction

Features should remain functionally accessible across primary supported devices where practical, while presentation may differ significantly.

---

## Specialized Displays

Projectors, televisions, and tabletop displays are secondary clients used by specific gameplay features.

They are not primary interaction targets.

Examples include:

- battle-map display
- player-visible world or region maps
- encounter information
- initiative display
- images and handouts
- ambient/session information

These displays may use dedicated simplified views controlled by a GM from another device.

Native mobile applications are not required for the initial version.

---

## Technology Principles

1. PostgreSQL is the authoritative structured-data store.
2. Binary assets are stored separately through a storage abstraction.
3. Application workers contain no irreplaceable persistent user data.
4. Application workers must be horizontally replaceable.
5. Application correctness must not require sticky sessions.
6. Self-hosting must remain possible without Weaveryn-operated cloud services.
7. Managed cloud services may be used without becoming domain dependencies.
8. Provider-specific infrastructure must be hidden behind interfaces where practical.
9. Business logic belongs in reusable application/domain services.
10. Exact dependency versions belong in package manifests, not this document.
