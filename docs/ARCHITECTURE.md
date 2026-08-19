# Weaveryn Architecture

## Overview

Weaveryn is built around persistent Worlds, Campaigns, reusable Characters, flexible Rulesets, granular permissions, optional AI, and first-class self-hosting.

The core domain is:

```text
User
├── Worlds
├── Campaigns
└── Characters

World
├── Members
├── WorldCharacters
├── WorldEntities
└── Campaigns

Character
└── WorldCharacter ↔ WorldEntity
    └── CampaignCharacter
```

Ownership, membership, functional role, character/NPC control, and information visibility are separate concepts.

---

## World

A **World** is a persistent setting containing Campaigns and setting-specific content.

### Ownership and Membership

`World.ownerId` is the authoritative source of World ownership. Ownership is separate from membership and is not duplicated by an `OWNER` membership role.

The World owner does not have a `WorldMembership` or `WorldRole`.

Users may join Worlds through `WorldMembership`.

Initial World roles:

- `ADMIN`
- `MEMBER`
- `VIEWER`

Campaign creation is permitted to the World owner and World administrators. Other World membership roles do not grant this permission by default.

#### Ownership Transfer

Only the current World owner may voluntarily transfer ownership.

When ownership is transferred:

- The new owner ceases to be a World member and receives ownership through `World.ownerId`.
- The former owner may become an `ADMIN`, `MEMBER`, `VIEWER`, or leave the World.
- A World owner must not simultaneously have a `WorldMembership` for that World.
- Normal ownership transfer must not leave the World orphaned.

#### Relinquishing Ownership

The current World owner may voluntarily relinquish ownership instead of transferring it directly to another user.

Relinquishing ownership:

- sets `World.ownerId` to `null`
- does not delete or recreate the World
- preserves the World ID, World content, timelines, memberships, and Campaign relationships
- allows active Campaigns hosted in the World to continue using the same World
- represents the current owner leaving control of the World rather than deleting other users' Campaigns

Relinquishment is especially important when active Campaigns prevent World deletion and the current owner does not want to continue owning the World.

#### Orphaned Worlds

A World is orphaned when `World.ownerId` is `null`.

A World may become orphaned when:

- its owning User account is deleted, or
- its owner voluntarily relinquishes ownership.

An orphaned World may be claimed by:

- an existing World `ADMIN`
- an existing World `MEMBER`
- the owner of an active Campaign hosted in that World

A `VIEWER` cannot claim ownership solely through World membership. Campaign participation alone also does not grant a claim unless the user owns an active Campaign in the World.

When an eligible user claims an orphaned World:

- `World.ownerId` is set to that user's ID
- any `WorldMembership` held by the new owner for that World is removed
- the World leaves the orphaned state

An orphaned World remains available while active Campaigns depend on it. Active Campaigns retain their existing `worldId` and continue to use the same World.

If an orphaned World has no active Campaigns and no eligible `ADMIN` or `MEMBER` successor, it may be removed through the defined cleanup/deletion workflow.

### Linked Entities and World History

World content forms an interconnected domain rather than only a collection of independent pages.

A `WorldEntity` represents the persistent identity of something that exists within a World. World entities may reference other entities through meaningful relationships. Maps and other modules may also reference domain entities.

A playable `WorldCharacter` participates in this same graph through at most one Character-backed `WorldEntity` in the same World. The linked entity uses the reserved built-in `Character` presentation and may participate as a normal source or target of `EntityRelationship`. Its display identity is not an independently editable duplicate: name resolves from `WorldCharacter.nameOverride` or `Character.name`, and portrait resolves from `Character.image`.

Campaign participation does not create additional Character entities. A WorldCharacter participating in multiple Campaigns in the same World still has one World graph identity. Campaign-only users may see a Character-backed entity when that WorldCharacter participates in an authorized Campaign context, without receiving general World membership or World editing rights.

Temporal facts about a WorldEntity must not be modeled as though the entity has one universally current state. Facts that change according to in-world time, such as the destruction of a settlement, the death of a ruler, or a change of ownership, belong to World history.

Campaigns operate within a temporal context of their World and resolve World entities according to their position on the relevant World timeline.

For example, if a settlement is destroyed in the year 1440:

- a Campaign taking place in 1435 resolves the settlement as not yet destroyed
- a Campaign taking place in 1445 resolves the settlement as destroyed
- the World view may display the settlement together with its full history

Non-temporal editorial information may still be updated normally.

Campaign-specific knowledge and gameplay state, such as what players have discovered, quest progress, party reputation, or hidden information, remain separate from canonical World history.

The architecture must allow future timeline branching so different Campaigns may diverge from shared history without requiring duplicate World entities. Full timeline-branching functionality is not required merely because the model preserves compatibility with it.

---

## Campaign

A **Campaign** is a playable game instance hosted in a World.

An active Campaign belongs to one World and is not intended to move freely between Worlds.

`Campaign.ownerId` is the authoritative source of Campaign ownership. Campaign ownership is independent from World ownership.

A World owner controls whether a Campaign may be hosted in their World but does not automatically own or control Campaigns owned by other users.

Campaign ownership may be transferred voluntarily by the current Campaign owner. The transfer must be atomic, the new owner must be or become a Campaign member, and the new owner must hold the functional `GM` role after the transfer. World ownership does not grant authority to initiate this transfer.

### Campaign Lifecycle and World Dependency

An active Campaign requires its World to continue existing.

While a Campaign is active:

- its `worldId` remains valid and unchanged
- the World may not be deleted
- the World owner does not gain authority to delete the Campaign merely because it is hosted in their World
- the Campaign owner controls whether their Campaign is ended or deleted, subject to normal authorization rules

World deletion is therefore blocked while any active Campaign exists, regardless of who owns that Campaign.

If the World owner no longer wants responsibility for a World that still hosts active Campaigns, they may transfer or relinquish World ownership rather than delete the World or another user's Campaign.

When a World is deleted after all active Campaigns have been resolved, ended or archived Campaigns owned by other users must not be destroyed by database cascade. They are detached from the deleted World through an explicit archival workflow and retain a limited immutable World snapshot needed to understand their historical Campaign context. A detached archived Campaign no longer participates in live World resolution.

### Temporal Context

A Campaign operates at a position on a World timeline.

The first MVP supports one automatically created main timeline per World. Timeline events use both a sortable numeric position and a human-readable date label. The sortable position is authoritative for ordering and state resolution; the label permits setting-specific notation without treating every World as a Gregorian calendar.

Its temporal context determines how time-dependent World facts are resolved for that Campaign. Two Campaigns in the same World may therefore see different valid states of the same WorldEntity because they take place at different dates.

The model should also remain compatible with future timeline branches. Different Campaigns may eventually follow different branches after a shared history without duplicating the underlying WorldEntity identities.

Campaign-specific gameplay state and player knowledge are not automatically promoted into canonical World history.

### Campaign Membership

Campaign roles describe participation rather than ownership:

```text
GM
ASSISTANT_GM
PLAYER
SPECTATOR
```

There is no `OWNER` CampaignRole.

The Campaign owner receives a `GM` membership when the Campaign is created. A Campaign ownership transfer also ensures that the new owner has a `GM` membership.

### Rulesets

Campaigns may select their own Ruleset once Ruleset functionality is introduced. The initial application backbone may create Campaigns without an active RulesetVersion.

Different Campaigns in the same World may use different Rulesets.

Rulesets are extensible domain content rather than hard-coded system enums.

A Ruleset defines Campaign mechanics such as attributes, classes, skills, abilities, combat, progression, and other game-system rules. Before Ruleset-specific CampaignCharacter mechanics are stored, the Campaign must reference a specific RulesetVersion.

Changing a Campaign's Ruleset must not silently convert existing CampaignCharacter state. Conversion requires an explicit migration process.

---

## Character Model

Characters use three conceptual layers:

```text
Character
    ↓
WorldCharacter
    ↓
CampaignCharacter
```

### Character

`Character` is the persistent, user-owned, portable identity.

Character-level data contains information that remains meaningful independently of a World or Campaign.

A Character does not inherently belong to one World.

### WorldCharacter

`WorldCharacter` represents a Character's incarnation in a particular World.

World-specific identity, history, relationships, and setting concepts belong to this layer.
A Character may have WorldCharacters in multiple Worlds, but has at most one WorldCharacter in a particular World. A WorldCharacter may override the Character's default display name while otherwise inheriting it.

A WorldCharacter has at most one linked Character-backed `WorldEntity`, and that entity must belong to the same World. This graph representation exists so the playable Character can participate in normal World relationships without flattening `Character`, `WorldCharacter`, and `CampaignCharacter` into one record. Generic WorldEntity editing must not independently rename, retype, replace the portrait of, or delete this Character identity.

### CampaignCharacter

`CampaignCharacter` represents a WorldCharacter participating in a specific Campaign.

Campaign- and Ruleset-specific state belongs to this layer, including progression and mechanical character state.

A WorldCharacter may participate in multiple Campaigns in the same World without being duplicated. Each CampaignCharacter has independent Campaign state.

World identity and Ruleset mechanics remain separate. WorldCharacter describes the Character in the setting; CampaignCharacter describes its mechanical representation and progression in a Campaign.

A CampaignCharacter may only connect a WorldCharacter to a Campaign hosted in the same World. This invariant must be enforced in backend/domain logic.

### Copying and Migration

Characters are user-owned and portable.

Copying a Character to another World creates another WorldCharacter while preserving the existing incarnation.

The new WorldCharacter remains linked to the same portable Character concept. For example, the Character concept `Bodwick` may have one incarnation in World X and another in World XY. The incarnations may share a name while having different species, cultures, hometowns, relationships, and histories.

A copied WorldCharacter receives a fresh Character-backed WorldEntity in the target World. Source-World `EntityRelationship` rows and other World-specific references are not copied blindly; they must be explicitly mapped, replaced, or omitted when a future workflow supports that.

Migrating a WorldCharacter moves the same WorldCharacter identity to another World rather than creating a second active incarnation. Existing CampaignCharacter participation must be resolved before migration.

To preserve source-World continuity, migration first detaches the source Character-backed WorldEntity from the WorldCharacter, snapshots the current authoritative Character/WorldCharacter presentation into it, and converts it into an independent `Person / NPC` WorldEntity. Its existing source-World relationships remain attached to that NPC. The WorldCharacter is then moved to the target World and receives a fresh Character-backed WorldEntity there. Source-World relationships are not copied to the target World.

Only the Character owner, or a user explicitly delegated that authority, may copy or migrate the Character.

---

## NPCs

NPCs are normally GM-controlled.

Specific NPCs may be delegated to players without granting broader GM permissions or exposing unrelated GM-only information.

NPCs may be cloned to other Worlds or converted/promoted into player Characters.

Once an entity becomes independently user-owned, that ownership must be respected by deletion and permission workflows.

Detailed NPC lifecycle rules remain a separate domain concern.

---

## Permissions and Visibility

Permissions exist at World, Campaign, Character, NPC, and information levels.

The architecture distinguishes:

- ownership
- membership
- functional roles
- Character ownership
- delegated NPC control
- information visibility

Information visibility may include GM-only, player-only, shared, World/member-visible, and future custom scopes.

Authorization must be enforced by backend/application services. UI visibility is not a security boundary.

### Initial World Permissions

- The World owner controls World lifecycle, ownership, members, configuration, World content, and Campaign placement.
- `ADMIN` may manage World members, normal World content, and Campaign creation, but may not transfer or relinquish ownership or delete the World.
- `MEMBER` may read the World and create or edit normal WorldEntity content, but may not manage ownership, lifecycle, or membership.
- `VIEWER` has read-only access to World content visible to them.

### Initial Campaign Permissions

- The Campaign owner controls Campaign ownership, lifecycle, and membership and also holds the `GM` role.
- `GM` may manage Campaign content and gameplay state.
- `ASSISTANT_GM` may manage Campaign content but may not transfer ownership or perform Campaign lifecycle operations.
- `PLAYER` may manage their own Characters and access Campaign content visible to them.
- `SPECTATOR` has read-only access to Campaign content visible to them.

### Accessible Worlds

A World is selectable by a user when the user is its owner, has a WorldMembership, owns a Campaign in it, or has a CampaignMembership in it.

Campaign-only access does not create a WorldMembership and does not grant general World editing rights. Such users receive only the minimum World identity needed for navigation and the World information made visible to their Campaign and role.

### Initial Information Visibility

The first MVP supports these visibility scopes:

```text
WORLD
CAMPAIGN
GM
PLAYER
PRIVATE
```

Campaign- and player-scoped visibility must identify its target Campaign or user. `GM` includes the Campaign owner, `GM`, and `ASSISTANT_GM` for the targeted Campaign. `PRIVATE` content is visible only to its owning/creating user unless an explicit future sharing workflow grants access. `PUBLIC` and arbitrary visibility grants are post-MVP capabilities.

### Authentication

The first MVP uses local email-and-password authentication with server-enforced sessions. Passwords must only be stored as strong password hashes and never as plaintext. Social login, Apple/Google login, and password-recovery email flows are outside the first MVP.

---

## Deletion and Unassigned Content

Destructive actions must be deliberate.

A World cannot be deleted while it contains any active Campaign.

This rule applies regardless of whether an active Campaign is owned by the World owner or by another user. The World owner must not be able to destroy another user's active Campaign by deleting its containing World.

To delete a World:

1. every active Campaign in the World must first be ended or deleted by an authorized Campaign owner or other explicitly authorized Campaign authority
2. only after no active Campaigns remain may the World deletion workflow proceed

A World owner does not gain authority to delete another user's Campaign simply because the Campaign is hosted in their World.

If active Campaigns remain and the World owner wants to leave, the owner may transfer or relinquish World ownership. Relinquishment leaves the World orphaned while preserving its ID, content, timelines, and Campaign relationships so active Campaigns can continue.

Inactive or archived independently user-owned content must still be handled deliberately during eventual World deletion. User-owned Characters must not be destroyed because their containing World is deleted. Ended or archived Campaigns are preserved through the explicit snapshot-and-detachment workflow rather than an accidental database cascade.

Deleting a Campaign may remove Campaign-specific memberships and participation records but must not delete the underlying Character identity.

User accounts must never be deleted as a consequence of deleting World or Campaign content.

Account deletion is also an explicit workflow. Before a User account can be deleted:

- every active Campaign owned by that User must be transferred, ended, or deleted
- every remaining ended or archived Campaign owned by that User must be explicitly transferred, exported and deleted, or otherwise resolved by the user rather than by cascade
- owned Worlds follow the documented transfer, relinquishment, orphaning, or deletion workflow
- owned Characters are exported, transferred by a future supported workflow, or explicitly deleted with the account owner's confirmation
- memberships and authentication sessions may then be removed according to their defined lifecycle

World deletion is an explicit application workflow rather than an accidental database cascade.

**Core principle:** Container authority controls placement; asset ownership controls the asset.

---

## Target Relationships

```text
User
├── ownedWorlds
├── worldMemberships
├── ownedCampaigns
├── campaignMemberships
└── characters

World
├── owner
├── memberships
├── campaigns
├── worldCharacters
├── worldEntities
└── timelines
    └── events

Campaign
├── world
├── owner
├── memberships
├── timeline / temporal context
├── ruleset
└── campaignCharacters

Character
├── owner
└── worldCharacters

WorldCharacter
├── character
├── world
├── worldEntity
└── campaignCharacters

CampaignCharacter
├── worldCharacter
├── campaign
└── campaign/ruleset-specific state

Ruleset
└── campaigns
```

---

## Core Invariants

1. `World.ownerId` and `Campaign.ownerId` are authoritative for ownership.
2. Membership roles do not duplicate ownership.
3. Campaign ownership is independent from World ownership.
4. Character ownership is independent from World and Campaign ownership.
5. `Character` is the portable user-owned identity.
6. `WorldCharacter` contains World-specific identity and history.
7. `CampaignCharacter` contains Campaign-specific mechanics and progression.
8. A WorldCharacter may participate in multiple Campaigns in its World with independent state.
9. Different Campaigns in the same World may use different Rulesets.
10. Cross-World CampaignCharacter relationships are forbidden.
11. Backend authorization is authoritative.
12. `WorldEntity` represents persistent World identity; time-dependent facts are resolved through World history rather than a universally current entity state.
13. A Campaign resolves time-dependent World content according to its World timeline and temporal position.
14. The model must allow different Campaigns to operate at different dates or future timeline branches without duplicating shared WorldEntity identity.
15. An active Campaign always requires an existing World and retains its `worldId` while active.
16. A World cannot be deleted while any active Campaign exists.
17. World ownership does not grant authority to delete an independently owned Campaign.
18. An orphaned World may be claimed by an eligible `ADMIN`, `MEMBER`, or owner of an active Campaign hosted in that World.
19. Active Campaigns keep an orphaned World available until ownership is claimed or those Campaigns are no longer active.
20. User-owned content is not destroyed merely because its containing World is eventually removed.
21. A Character has at most one WorldCharacter per World.
22. A Campaign owner always holds the functional `GM` role.
23. A Campaign ownership transfer is initiated only by the current owner and is atomic.
24. Campaign-only World access does not imply World membership or World editing rights.
25. MVP timeline ordering uses an authoritative numeric position plus a human-readable date label.
26. Ended or archived Campaigns are detached through an explicit snapshot workflow when their World is deleted.
27. A WorldCharacter has at most one linked Character-backed WorldEntity, and both must belong to the same World.
28. Character-backed WorldEntity name/image presentation derives from Character/WorldCharacter authority rather than an independently editable duplicate.
29. Campaign-only visibility of a Character-backed entity derives from that WorldCharacter's participation in an authorized Campaign and does not grant general World access.
30. Copying a WorldCharacter creates a fresh target-World Character entity and does not copy source-World relationships automatically.
31. Migrating a WorldCharacter preserves source-World graph continuity by converting the detached source entity into an independent Person / NPC snapshot with its relationships intact, then creating a fresh Character entity in the target World.

---

## Application Architecture

Core business rules belong in reusable application/domain services rather than UI components.

Application modules build on shared domain services and authorization rules rather than duplicating business logic.

The architecture should support independent modules for World building, Characters, Rulesets, sessions, maps, encounters, virtual tabletop functionality, solo play, and integrations without tightly coupling those modules.

### API-first

Core functionality should be accessible through controlled APIs backed by the same application/domain services.

The Web/PWA, AI agents, and future integrations must use the same authorization and domain rules.

The first implementation exposes versioned REST endpoints under `/api/v1`. Route handlers remain thin and delegate validation, authorization, and domain behavior to shared application services.

### Self-hosting

Self-hosting is a first-class requirement.

Core Weaveryn functionality should remain usable without depending on Weaveryn-hosted cloud infrastructure.

### AI

AI is optional and provider-independent.

AI acts as a client of Weaveryn through controlled APIs/tools. It is never the authoritative source of application state or permissions.

AI actions inherit the permissions of the invoking user.

### Content and Extensibility

The architecture should support extensible community-created, free/open, creator-paid, and appropriately licensed content and Rulesets without coupling the core application to a single proprietary TTRPG system.

---

## Development Principles

Prefer small, coherent feature changes and independently maintainable modules.

Business rules belong in shared application/domain services rather than UI code.

Features should have clear scope, dependencies, acceptance criteria, and tests.

Avoid unrelated refactoring within feature branches.