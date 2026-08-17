# Release and Versioning Policy

This document defines how Weaveryn versions, releases, branches, and production builds are managed.

## Versioning model

Weaveryn uses Semantic Versioning (`MAJOR.MINOR.PATCH`).

During the `0.x` development phase:

- `0.1.0` is the first MVP release.
- `0.1.x` releases are patches for bugs, security fixes, regressions, compatibility fixes, accessibility fixes, and similarly scoped corrections.
- `0.2.0`, `0.3.0`, and later minor releases introduce new coherent feature sets.
- New product capabilities should not be hidden inside patch releases.
- `1.0.0` marks the point at which Weaveryn's foundational product vision is implemented and stable enough to treat persisted Worlds and Campaigns as long-lived production data.

Examples:

```text
0.1.0  MVP
0.1.1  MVP bug/security fixes
0.1.2  Additional MVP fixes
0.2.0  Next feature release
0.2.1  0.2 bug/security fixes
1.0.0  First stable major release
```

## `main` and release tags

`main` remains the primary long-lived development branch.

A release does not replace or rename `main`. Instead, each released version is identified by an immutable Git tag on the exact release commit:

```text
main
 A---B---C---D---E---F
         ^           ^
      v0.1.0      v0.2.0
```

Release tags use a `v` prefix, for example:

```text
v0.1.0
v0.1.1
v0.2.0
v1.0.0
```

Each stable tag should have a corresponding GitHub Release.

Users who need a stable version should use a tagged release or versioned release artifact rather than tracking `main`.

## Development versions

Between stable releases, development builds may use a prerelease identifier such as:

```text
0.2.0-dev.0
0.2.0-dev.1
```

Development builds may additionally expose non-public build metadata such as a short commit SHA in development or instance-administration diagnostics.

Stable public version labels remain the SemVer release number.

## Version source of truth

The application version should have one authoritative source in the repository. Unless a later build system requires a different dedicated mechanism, `package.json` is the version source of truth.

Other surfaces should derive their version from that source rather than maintaining separate hard-coded strings. This includes, where applicable:

- the application footer;
- instance-administration system information;
- generated release artifacts;
- Docker image tags;
- release automation;
- GitHub Release metadata.

The Git tag for a release must match the application version, using the `v` prefix.

For example:

```text
package.json: 0.2.0
Git tag:      v0.2.0
Docker tag:   0.2.0
Footer:       Weaveryn v0.2.0
```

## Branching policy

Normal work uses short-lived branches based on the latest appropriate `main` state.

Typical prefixes include:

```text
feat/...
fix/...
docs/...
refactor/...
```

Feature and fix branches are merged back through pull requests after review and validation.

Do not maintain a separate production source branch whose purpose is to delete development tooling. Production and development builds must be produced from the same source history.

## Maintenance branches

Do not create a permanent release branch for every minor version by default.

A maintenance branch is introduced only when `main` has moved on to the next feature line and an older supported release still needs a patch.

Example:

```text
                 main -> 0.2 development
                /
--- v0.1.0 ----+
                \
                 release/0.1 -> fix -> v0.1.1
```

A maintenance branch such as `release/0.1` must contain only changes appropriate for that release line. Relevant fixes should be forward-ported to `main` where necessary.

## Development tooling versus production builds

The repository contains both production application code and development tooling. That does not mean production releases expose all repository functionality.

The same release commit may be used to produce different runtime modes:

```text
same source commit
        |
        +-- development runtime
        |     +-- product application
        |     +-- /dev visual scenarios
        |     +-- deterministic fixtures
        |     +-- acceptance/debug tooling
        |
        +-- production runtime
              +-- product application
              +-- no accessible development tooling
```

Development tooling is a development capability, not a separate product edition or branch.

### Production isolation requirements

Production builds must:

- make all `/dev` pages and APIs unavailable;
- reject development-scenario actions server-side even if a route is requested directly;
- avoid exposing deterministic fixture setup/reset/cleanup endpoints;
- avoid exposing debug/database inspection capabilities intended only for development;
- keep development-only configuration disabled by default;
- exclude development-only modules from the production runtime/import graph where practical;
- never rely only on hiding links or UI controls as the security boundary.

Existing requirements in `docs/development/VISUAL_TESTING.md` remain authoritative for visual scenario isolation and fixture safety.

### Development runtime

Development builds may expose the registered `/dev` visual acceptance environment and its supporting tooling when the documented development guards allow it.

Development tooling should remain structurally separate enough that production code does not accidentally depend on it.

## Release readiness

Before a stable release tag is created, the release commit should satisfy the repository's normal validation requirements and the checks relevant to that release.

At minimum, release preparation should verify:

- formatting;
- linting and TypeScript validation;
- Prisma validation/generation when applicable;
- unit and integration tests;
- production build success;
- relevant end-to-end or acceptance tests;
- required database migrations and upgrade behavior;
- production isolation of `/dev` and other development-only functionality;
- no known release-blocking security or data-integrity defects;
- release documentation and version number consistency.

The exact automated release gate may evolve as CI matures, but a release must not bypass project validation simply to create a tag.

## GitHub Releases

Each stable version should be published as a GitHub Release associated with its version tag.

Release notes should summarize:

- important new features for minor/major releases;
- bug and security fixes;
- migration or upgrade notes;
- known limitations where relevant;
- breaking changes when they exist.

Patch releases should remain narrowly scoped and make clear which supported release line they fix.

## Release artifacts and Docker images

When automated release packaging is introduced, release artifacts should be built from the exact tagged commit.

Versioned Docker images should use immutable version tags, for example:

```text
ghcr.io/mathossa/weaveryn:0.2.0
```

Additional convenience tags such as `0.2` or `latest` may point to a stable release, but deployment documentation should prefer exact version tags where reproducibility matters.

`latest` must never mean an arbitrary development build from `main`.

Development or edge images, if introduced, must be clearly named separately from stable release images.

## Patch policy

A patch release changes the smallest reasonable amount necessary to correct the supported release.

Appropriate patch contents include:

- bug fixes;
- security fixes;
- regressions;
- incorrect migrations or upgrade behavior;
- accessibility corrections;
- performance regressions;
- documentation corrections tied to released behavior;
- very small UX corrections that do not introduce a materially new capability.

A change that introduces a new user-facing capability, domain concept, API surface, or major workflow belongs in a new minor version while Weaveryn remains pre-1.0.

## Future automation

Release automation may eventually perform the following after an approved release commit/tag:

```text
validate
-> build production application
-> verify development-tool isolation
-> build release artifacts / Docker image
-> publish immutable versioned artifact
-> create or finalize GitHub Release
```

Automation must preserve the same rule as manual releases: the artifact, application version, Git tag, and GitHub Release must all identify the same source revision and version.
