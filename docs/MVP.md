# Weaveryn MVP

## Purpose

The first Weaveryn MVP validates the core application backbone.

The goal is to prove that users can create, persist, load, and connect the
core domain objects before advanced game-system functionality is added.

## MVP Scope

### Users

Users can:

- create an account with email and password
- log in and log out
- load their own accessible data
- delete their account only after explicitly resolving owned Worlds, Campaigns, and Characters

Social login, Apple/Google login, and password-recovery email flows are not part
of the first MVP.

### Worlds

Users can:

- create Worlds
- load accessible Worlds
- manage basic World information
- participate in Worlds according to ownership and membership permissions
- transfer or relinquish World ownership according to the World lifecycle
- delete Worlds only when no active Campaigns remain
- use the automatically created main World timeline

World ownership and lifecycle behavior follow `ARCHITECTURE.md`.

An orphaned World remains available while active Campaigns depend on it.
Eligible World members or owners of active Campaigns hosted in that World may
claim ownership according to the lifecycle rules defined in `ARCHITECTURE.md`.

A World is accessible from the selection flow when the User owns it, has a
WorldMembership, owns a Campaign in it, or has a CampaignMembership in it.
Campaign-only access does not grant World membership or general World editing
rights. It exposes only the minimum World identity required for navigation plus
content visible through the User's Campaign.

### Campaigns

Users with permission can:

- create Campaigns inside a World
- load accessible Campaigns
- manage basic Campaign information
- participate according to Campaign ownership and membership permissions
- transfer Campaign ownership
- end, archive, or delete Campaigns they own according to Campaign lifecycle rules
- select a position on the World's main timeline

An active Campaign retains its World relationship and prevents that World from
being deleted. World ownership does not grant deletion authority over a
Campaign owned by another user.

The Campaign owner always has the functional `GM` role. A World may only be
deleted after all active Campaigns have been ended, transferred as necessary,
or deleted. Ended or archived Campaigns are preserved using a limited immutable
World snapshot and are detached from the deleted World through an explicit
workflow.

### Characters

Users can:

- create Characters
- load their Characters
- use a Character within a World
- participate with a World-specific Character in one or more Campaigns
- maintain independent Campaign-specific Character state
- create a separate incarnation of the same Character concept in another World

Character identity, World-specific identity, and Campaign-specific state remain
separate as defined by `ARCHITECTURE.md` and `DATA_MODEL.md`.

A Character has at most one WorldCharacter per World. The same WorldCharacter
may participate in multiple Campaigns in that World, with independent level,
equipment, statistics, and other Campaign state. Creating the Character in a
different World creates another WorldCharacter linked to the same portable
Character concept; World-specific traits and references may differ.

### Entities and Relationships

Users with permission can:

- create World content entities
- load and edit those entities
- link entities through meaningful relationships
- navigate between linked entities
- use the same World entities in Campaign context without duplicating their World identity
- record basic time-dependent facts on the main World timeline
- restrict information using `WORLD`, `CAMPAIGN`, `GM`, `PLAYER`, and `PRIVATE` visibility

Time-dependent World facts and Campaign temporal context follow `ARCHITECTURE.md`
and `DATA_MODEL.md`. Campaign-specific knowledge and gameplay state remain
separate from canonical World history. Full timeline-branching functionality is
not required for the first MVP.

Timeline events use an authoritative sortable numeric position plus a
human-readable setting-specific date label. Public visibility, arbitrary custom
grants, and timeline branching are post-MVP capabilities.

This provides the basic interconnected World model on which later features can
build.

### API

The Web/PWA and future clients use the same application services. The first MVP
exposes versioned REST endpoints under `/api/v1`; route handlers do not contain
independent domain rules.

### Explicitly Deferred

The first MVP does not require:

- Ruleset creation, selection, or migration
- Ruleset-specific character creation or gameplay automation
- social login or password-recovery email
- public Worlds or public content visibility
- arbitrary visibility grants
- timeline branching or custom calendar engines
- AI, solo play, battle maps, projector clients, or marketplace functionality

## MVP Completion

The MVP is complete when a user can:

1. Log in.
2. Create and load a World.
3. Create and load a basic event on the World's main timeline.
4. Create and load a Campaign within that World at a selected timeline position.
5. Create and load a Character and its WorldCharacter.
6. Use that WorldCharacter in a Campaign with independent Campaign state.
7. Create and load World content entities.
8. Link entities together and enforce their visibility.
9. Leave the application, return later, and have the persisted state load
   correctly.
