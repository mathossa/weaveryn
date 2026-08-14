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
└── Campaigns

Character
└── WorldCharacter
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

#### Orphaned Worlds

A World may temporarily become ownerless when its owner's user account is deleted.

- If at least one `ADMIN` or `MEMBER` remains, the World becomes orphaned and may be claimed by an eligible member.
- `VIEWER` cannot claim ownership.
- If only `VIEWER` memberships or no memberships remain, the World is deleted.
- Normal ownership transfer must not leave a World orphaned.

### Linked Entities and World History

World content forms an interconnected domain rather than only a collection of independent pages.

A `WorldEntity` represents the persistent identity of something that exists within a World. World entities may reference other entities through meaningful relationships. Maps and other modules may also reference domain entities.

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

A World owner controls whether a Campaign may be hosted in their World but does not automatically own Campaigns owned by other users.

### Temporal Context

A Campaign operates at a position on a World timeline.

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

The Campaign owner normally receives a `GM` membership when the Campaign is created.

### Rulesets

Each Campaign selects its own Ruleset.

Different Campaigns in the same World may use different Rulesets.

Rulesets are extensible domain content rather than hard-coded system enums.

A Ruleset defines Campaign mechanics such as attributes, classes, skills, abilities, combat, progression, and other game-system rules.

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

A Character may have WorldCharacters in multiple Worlds.

### CampaignCharacter

`CampaignCharacter` represents a WorldCharacter participating in a specific Campaign.

Campaign- and Ruleset-specific state belongs to this layer, including progression and mechanical character state.

A WorldCharacter may participate in multiple Campaigns in the same World without being duplicated. Each CampaignCharacter has independent Campaign state.

World identity and Ruleset mechanics remain separate. WorldCharacter describes the Character in the setting; CampaignCharacter describes its mechanical representation and progression in a Campaign.

A CampaignCharacter may only connect a WorldCharacter to a Campaign hosted in the same World. This invariant must be enforced in backend/domain logic.

### Copying and Migration

Characters are user-owned and portable.

Copying a Character to another World creates another WorldCharacter while preserving the existing incarnation.

Migrating a WorldCharacter moves or adapts that incarnation to another World rather than creating a second active incarnation.

Migration must not leave invalid Campaign relationships. Historical information should be preserved where practical.

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

---

## Deletion and Unassigned Content

Destructive actions must be deliberate.

Deleting or detaching a World must not automatically destroy independently user-owned Characters or Campaigns.

User-owned assets may become unassigned or archived when their containing World is removed.

Deleting a Campaign may remove Campaign-specific memberships and participation records but must not delete the underlying Character identity.

User accounts must never be deleted as a consequence of deleting World or Campaign content.

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
11. User-owned content is not destroyed merely because its containing World is removed.
12. Backend authorization is authoritative.
13. `WorldEntity` represents persistent World identity; time-dependent facts are resolved through World history rather than a universally current entity state.
14. A Campaign resolves time-dependent World content according to its World timeline and temporal position.
15. The model must allow different Campaigns to operate at different dates or future timeline branches without duplicating shared WorldEntity identity.

---

## Application Architecture

Core business rules belong in reusable application/domain services rather than UI components.

Application modules build on shared domain services and authorization rules rather than duplicating business logic.

The architecture should support independent modules for World building, Characters, Rulesets, sessions, maps, encounters, virtual tabletop functionality, solo play, and integrations without tightly coupling those modules.

### API-first

Core functionality should be accessible through controlled APIs backed by the same application/domain services.

The Web/PWA, AI agents, and future integrations must use the same authorization and domain rules.

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