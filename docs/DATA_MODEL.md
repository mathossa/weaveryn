# Weaveryn Data Model

## 1. Purpose

This document defines the logical data model for Weaveryn.

It describes core entities, relationships, ownership, scope, and important data constraints. It is not a direct Prisma or database schema.

The architecture defined in `ARCHITECTURE.md` is authoritative. This document translates that architecture into logical data concepts.

Core goals:

- Remain RPG-system agnostic.
- Separate World setting data from Campaign gameplay data.
- Support different Rulesets between Campaigns in the same World.
- Support versioned Rulesets and explicit migrations.
- Separate portable Character identity, World identity, and Campaign-specific state.
- Support linked World content.
- Support World history and Campaign temporal context without duplicating World entities.
- Enforce ownership, permissions, and visibility consistently.
- Support self-hosting, APIs, AI, maps, sessions, and live play without coupling the core model to them.

---

## 2. User

A `User` represents a Weaveryn account.

```text
User
- id
- email
- passwordHash
- username
- displayName
- avatar
- createdAt
- updatedAt
```

Relations:

- owns zero or more Worlds
- has zero or more WorldMemberships
- owns zero or more Campaigns
- has zero or more CampaignMemberships
- owns zero or more Characters

Global/platform administration is separate from World and Campaign roles.

For the first MVP, a User authenticates locally with email and password. `passwordHash` contains only a strong password hash. Social-provider identities and password-recovery tokens are post-MVP concerns.

Account deletion is an application workflow rather than a direct User-row cascade. Active owned Campaigns must first be transferred, ended, or deleted. Remaining owned Campaigns and Characters must be explicitly transferred where supported, exported and deleted, or otherwise resolved by the owner. Owned Worlds follow the World transfer, relinquishment, orphaning, or deletion workflow before the User is removed.

---

## 3. World

A `World` is the persistent setting scope.

```text
World
- id
- ownerId?
- name
- description
- image
- settings
- createdAt
- updatedAt
```

Relations:

- belongs to zero or one owning User
- has WorldMemberships
- contains Campaigns
- contains WorldCharacters
- contains WorldEntities
- contains WorldTimelines and WorldEvents
- contains World-level maps/assets as supported

Constraints:

- `ownerId` is authoritative for ownership
- ownership is not duplicated through membership roles
- the owner does not have a `WorldMembership`
- a World may become orphaned when its owning User is deleted or when its owner voluntarily relinquishes ownership
- relinquishing ownership sets `ownerId` to `null` without changing the World ID or Campaign `worldId` references
- an orphaned World may be adopted by an `ADMIN`, `MEMBER`, or the owner of an active Campaign hosted in that World
- a `VIEWER` cannot adopt an orphaned World solely through World membership
- Campaign participation alone does not permit adoption unless the user owns an active Campaign in the World
- a World with any active Campaign cannot be deleted
- an orphaned World remains available while active Campaigns depend on it
- if an orphaned World has no active Campaigns and no eligible `ADMIN` or `MEMBER` successor, it may be removed through the defined cleanup/deletion workflow
- deletion must use an explicit application workflow when independently user-owned content exists

A World is accessible/selectable when the User owns the World, has a WorldMembership, owns a Campaign hosted in it, or has a CampaignMembership in it. Campaign-only access does not create a WorldMembership and exposes only the minimum World identity needed for navigation plus content allowed by Campaign and visibility authorization.

---

## 4. World Membership

`WorldMembership` connects a User to a World.

```text
WorldMembership
- id
- worldId
- userId
- role
- permissions
- joinedAt
- updatedAt
```

Initial roles:

```text
ADMIN
MEMBER
VIEWER
```

Constraints:

- unique `(worldId, userId)`
- membership does not represent ownership
- role permissions are enforced by backend/application services
- if a member claims World ownership, their membership for that World is removed because ownership and membership remain separate

---

## 5. Campaign

A `Campaign` is a playable game instance hosted in a World.

```text
Campaign
- id
- worldId?
- ownerId
- timelineId?
- currentWorldPosition?
- currentWorldDateLabel?
- name
- description
- image
- activeRulesetVersionId?
- archivedWorldSnapshot?
- settings
- status
- createdAt
- updatedAt
```

Initial lifecycle states:

```text
ACTIVE
ENDED
ARCHIVED
```

Only `ACTIVE` Campaigns resolve live World state and block World deletion. `ENDED` Campaigns may be archived through an explicit lifecycle operation. `ARCHIVED` Campaigns are historical and read-only except for lifecycle/export operations.

Relations:

- hosted in one World while active
- owned by one User
- operates on one WorldTimeline while active
- has CampaignMemberships
- has CampaignCharacters
- may reference an active RulesetVersion after Ruleset functionality is introduced
- may contain Sessions, Encounters, Campaign-specific Maps, Assets, DiceRolls, and live-play state

Constraints:

- Campaign ownership is independent from World ownership
- `ownerId` is authoritative for Campaign ownership
- `ownerId` remains required; User deletion is restricted until every owned Campaign is explicitly resolved
- membership roles do not represent ownership
- active Campaigns require a World
- an active Campaign retains its `worldId` for the duration of its active lifecycle
- an active Campaign's WorldTimeline must belong to the same World
- an active Campaign requires `currentWorldPosition` and `currentWorldDateLabel`; new Campaigns use the World's main timeline by default
- time-dependent World facts are resolved according to the Campaign's timeline and `currentWorldPosition`
- any active Campaign blocks deletion of its World
- World ownership does not grant authority to delete a Campaign owned by another user
- the Campaign owner controls ending or deleting their Campaign, subject to normal authorization rules
- only the current Campaign owner may transfer Campaign ownership
- ownership transfer is atomic, and the new owner must be or become a Campaign member with role `GM`
- Campaign-specific data must not leak across authorization boundaries
- when Ruleset functionality is enabled, changing RulesetVersion requires an explicit migration process

Inactive or archived Campaign preservation during eventual World deletion uses an explicit snapshot-and-detachment workflow. `archivedWorldSnapshot` stores the limited immutable World context required to understand the Campaign history, after which `worldId` and `timelineId` may become `null`. A detached Campaign is archival only and no longer resolves live World state. This must not rely on an accidental database cascade or weaken the rule that active Campaigns always retain a valid World and timeline.

---

## 6. Campaign Membership

`CampaignMembership` connects a User to a Campaign.

```text
CampaignMembership
- id
- campaignId
- userId
- role
- permissions
- joinedAt
- updatedAt
```

Initial roles:

```text
GM
ASSISTANT_GM
PLAYER
SPECTATOR
```

Constraints:

- unique `(campaignId, userId)`
- no `OWNER` role
- Campaign ownership comes from `Campaign.ownerId`
- the Campaign owner always has functional `GM` membership
- backend/application services enforce permissions

---

## 7. Ruleset

A `Ruleset` represents an extensible game system definition.

```text
Ruleset
- id
- name
- description
- author
- system
- visibility
- createdAt
- updatedAt
```

Relations:

- has one or more RulesetVersions

Rulesets should be importable/exportable and must not require hard-coded game-system concepts in Weaveryn core.

Rules/content must only be bundled or distributed where licensing permits it.

---

## 8. Ruleset Version

A `RulesetVersion` is an immutable or controlled version of a Ruleset used by Campaigns.

```text
RulesetVersion
- id
- rulesetId
- version
- schema
- definitions
- createdAt
```

Relations:

- belongs to one Ruleset
- may define SheetDefinitions
- may define RuleDefinitions
- may be referenced by multiple Campaigns

A Campaign references a specific RulesetVersion once Ruleset-specific mechanics are enabled, so existing Campaigns are not automatically changed when a Ruleset evolves. The initial backbone MVP may leave this relation empty.

---

## 9. Ruleset Migration

A `RulesetMigration` describes an explicit transformation between RulesetVersions.

```text
RulesetMigration
- id
- fromRulesetVersionId
- toRulesetVersionId
- migrationDefinition
- createdAt
```

Migration must be deliberate and validated.

The application should support validation, preview, backup/snapshot, migration, result validation, and recovery/rollback where practical.

Ruleset changes must never silently reinterpret existing CampaignCharacter state.

---

## 10. Character

A `Character` is a persistent, portable, user-owned identity.

```text
Character
- id
- ownerUserId
- name
- image
- coreData
- status
- createdAt
- updatedAt
```

Character-level data contains information that remains meaningful independently of a World or Campaign.

Relations:

- belongs to one owning User
- has zero or more WorldCharacters

Constraints:

- Character ownership is independent from World and Campaign ownership
- deleting a World or Campaign must not delete the underlying Character
- Ruleset-specific state does not belong directly on Character

---

## 11. World Character

`WorldCharacter` represents a Character's incarnation in a particular World.

```text
WorldCharacter
- id
- characterId
- worldId
- nameOverride?
- worldData
- status
- createdAt
- updatedAt
```

Relations:

- belongs to one Character
- belongs to one World while assigned
- has zero or one linked Character-backed WorldEntity
- has zero or more CampaignCharacters

World-specific identity, history, relationships, and setting concepts belong here.

Constraints:

- a Character may have WorldCharacters in multiple Worlds
- unique `(characterId, worldId)`; one Character has at most one incarnation in a particular World
- at most one Character-backed WorldEntity may represent a WorldCharacter
- the linked WorldEntity must belong to the same World as the WorldCharacter
- `nameOverride`, when present, replaces the portable Character name only for this World incarnation
- linked Character entity presentation resolves name from `nameOverride` or `Character.name`, and portrait from `Character.image`
- generic WorldEntity editing must not independently mutate or delete Character-backed identity fields
- adding or removing CampaignCharacter participation does not create or delete the WorldCharacter's entity representation
- copying to another World creates another WorldCharacter linked to the same portable Character and a fresh target-World Character entity
- copied World-specific references and EntityRelationships are not reused across Worlds automatically
- migration changes/adapts World placement without changing Character ownership
- before migration, CampaignCharacter participation must be resolved
- migration detaches the source Character entity into an independent `Person / NPC` snapshot that keeps its source-World relationships, then creates a fresh Character entity in the target World
- World deletion must preserve user-owned Character identity
- historical information should be preserved where practical

---

## 12. Campaign Character

`CampaignCharacter` represents a WorldCharacter's participation and state in a Campaign.

```text
CampaignCharacter
- id
- worldCharacterId
- campaignId
- sheetData
- status
- createdAt
- updatedAt
```

Relations:

- belongs to one WorldCharacter
- belongs to one Campaign
- may reference Ruleset-defined abilities/content

Constraints:

- unique `(worldCharacterId, campaignId)`
- `WorldCharacter.worldId` must match `Campaign.worldId`
- Campaign-specific progression and mechanics are independent between Campaigns
- after Ruleset functionality is introduced, `sheetData` conforms to the Campaign's active RulesetVersion
- cross-World participation is forbidden and enforced by backend/domain logic

---

## 13. Character Sheet Definition

A `SheetDefinition` defines the data schema, validation, and presentation structure used for CampaignCharacter sheets.

```text
SheetDefinition
- id
- rulesetVersionId
- name
- schema
- layout
- validationRules
```

Schema and layout remain separate so presentation can change without necessarily migrating stored character state.

Character sheets should not require hundreds of fixed game-system-specific database columns.

---

## 14. Rule Definition

RulesetVersions may contain reusable game definitions.

```text
RuleDefinition
- id
- rulesetVersionId
- type
- key
- name
- description
- data
```

The RulesetVersion determines valid types and data structures.

Rule definitions may represent abilities, skills, items, conditions, classes, mechanical species definitions, or other Ruleset concepts without requiring fixed core tables for every game system.

---

## 15. Campaign Character Rule Reference

Campaign-specific character mechanics should reference RuleDefinitions rather than attach them to the portable Character.

```text
CampaignCharacterRuleReference
- id
- campaignCharacterId
- ruleDefinitionId
- state
- overrides
```

This supports per-Campaign knowledge, state, charges, preparation, progression, and character-specific overrides.

References must be compatible with the Campaign's active RulesetVersion.

---

## 16. World Entity

`WorldEntity` represents the persistent identity of flexible setting content belonging to a World.

```text
WorldEntity
- id
- worldId
- worldCharacterId?
- type
- name
- description
- image
- data
- visibilityScope
- visibilityCampaignId?
- visibilityUserId?
- createdBy
- createdAt
- updatedAt
```

World entities may represent locations, organizations, people, items, quests, events, creatures, deities, notes, or custom entity types.

`Character` is a reserved built-in entity type for a WorldEntity linked to a WorldCharacter. Generic non-player people remain `Person / NPC`. A Character-backed WorldEntity is not an independently editable copy of Character identity: while linked, its effective display name resolves from `WorldCharacter.nameOverride` or `Character.name`, and its portrait resolves from `Character.image`.

For Character-backed entities:

- `worldCharacterId` identifies the linked WorldCharacter
- the WorldEntity and WorldCharacter must belong to the same World
- a WorldCharacter has at most one linked WorldEntity
- the entity may be a normal source or target of EntityRelationship
- Campaign-only visibility may be derived from the WorldCharacter's CampaignCharacter participation
- visibility through Campaign participation does not grant general World membership or edit rights
- copying a WorldCharacter creates a fresh Character entity in the target World without copying source relationships
- migration converts the detached source entity into an independent `Person / NPC` snapshot that retains source-World relationships, then creates a fresh Character entity in the target World

The `data` field stores type-specific structured information that is not inherently a time-dependent World fact.

Time-dependent facts must not be flattened into one universally current state on the WorldEntity when historical state matters. Changes such as a settlement being destroyed, a ruler dying, or control of a location changing belong to World history and are resolved against a WorldTimeline and date.

Campaign-specific state or knowledge about a WorldEntity should not require duplicating the underlying WorldEntity. Player discovery, quest progress, party reputation, hidden information, and other gameplay state remain Campaign-specific rather than canonical World history.

### 16.1 World Timeline

A `WorldTimeline` represents an ordered history context within a World.

```text
WorldTimeline
- id
- worldId
- name
- parentTimelineId?
- branchPosition?
- branchDateLabel?
- createdAt
- updatedAt
```

Relations:

- belongs to one World
- contains WorldEvents
- may optionally branch from another WorldTimeline
- may be used by one or more Campaigns

Constraints:

- creating a World automatically creates one main WorldTimeline for the first MVP
- a parent timeline, when present, must belong to the same World
- a Campaign may only use a timeline from its own World
- support for `parentTimelineId`, `branchPosition`, and `branchDateLabel` preserves future compatibility with divergent Campaign histories; complete timeline-branching behavior is not required by the current MVP

### 16.2 World Event

A `WorldEvent` represents a time-dependent fact or change in World history.

```text
WorldEvent
- id
- timelineId
- worldPosition
- worldDateLabel
- type
- data
- createdAt
- updatedAt
```

Relations:

- belongs to one WorldTimeline
- may affect one or more WorldEntities through WorldEventEntity associations

WorldEvents may represent facts such as founding or destruction, births and deaths, changes in political control, important discoveries, wars, migrations, or other setting changes for which temporal context matters.

`worldPosition` is the authoritative sortable numeric value for ordering and state resolution. `worldDateLabel` is a human-readable, setting-specific label and is not assumed to use a Gregorian calendar.

The World view may expose the complete history, while a Campaign resolves only the state applicable to its timeline and current World date.

### 16.3 World Event Entity

`WorldEventEntity` associates a WorldEvent with an affected WorldEntity.

```text
WorldEventEntity
- worldEventId
- worldEntityId
- role
```

Constraints:

- the WorldEvent and WorldEntity must belong to the same World
- `role` may describe how the entity participates in the event without requiring event-specific relation tables for every event type

---

## 17. Entity Relationship

`EntityRelationship` connects World entities into a graph.

```text
EntityRelationship
- id
- worldId
- sourceEntityId
- targetEntityId
- relationshipType
- label
- visibility
- metadata
```

Constraints:

- both entities must belong to the same World unless an explicit cross-World feature is introduced
- relationship visibility is enforced by backend authorization
- custom relationship types should be supported

---

## 18. Visibility

Visibility is separate from ownership and membership.

The first MVP supports:

```text
WORLD
CAMPAIGN
GM
PLAYER
PRIVATE
```

- `WORLD` content is visible to the World owner and World members; Campaign-only access does not grant this scope.
- `CAMPAIGN` content requires `visibilityCampaignId` and is visible to authorized members of that Campaign.
- `GM` content requires `visibilityCampaignId` and is visible to the Campaign owner, `GM`, and `ASSISTANT_GM`.
- `PLAYER` content requires `visibilityUserId` and may optionally be limited to a Campaign.
- `PRIVATE` content is visible only to its owning/creating User.

`PUBLIC`, arbitrary visibility grants, and block/field-level visibility are post-MVP capabilities. The model should not prevent their later introduction.

Visibility must be enforced by backend/application services.

AI and external clients must never receive information the invoking user is not authorized to access.

Content may eventually support block/field-level visibility so one entity can contain information with different visibility scopes.

---

## 19. Map

A `Map` represents an uploaded or generated map.

```text
Map
- id
- worldId?
- campaignId?
- name
- imageAssetId
- width
- height
- type
- settings
- createdAt
- updatedAt
```

A Map may be World-scoped or Campaign-scoped depending on its purpose.

Constraints:

- scope must be explicit
- a Campaign-scoped Map must belong to the same World as its Campaign
- application logic must prevent invalid mixed scopes

---

## 20. Map Marker

`MapMarker` places a reference or interactive object on a Map.

```text
MapMarker
- id
- mapId
- x
- y
- icon
- label
- linkedEntityId?
- visibility
- data
```

Coordinates should be stored independently of rendered screen resolution.

Markers may later support additional geometry, paths, regions, portals, or encounter integrations.

---

## 21. Asset

`Asset` represents uploaded file metadata separately from the domain object using the file.

```text
Asset
- id
- worldId?
- campaignId?
- uploadedBy
- type
- filename
- mimeType
- size
- storageKey
- metadata
- createdAt
```

Assets may be World- or Campaign-scoped.

Actual file storage is handled through a `StorageProvider`/`StorageService` abstraction.

Application code must not depend directly on local filesystem paths.

Local storage is the default for self-hosting. Other providers, including S3-compatible storage, may be supported without changing domain logic.

---

## 22. Session

A `Session` represents a tabletop play session.

```text
Session
- id
- campaignId
- title
- sessionNumber
- startedAt
- endedAt
- status
- summary
- createdAt
```

Sessions belong to Campaigns and may reference notes, events, DiceRolls, Encounters, character changes, discoveries, and AI interactions.

---

## 23. Session Event

`SessionEvent` records structured events during play.

```text
SessionEvent
- id
- sessionId
- type
- actorId
- targetId
- data
- createdAt
```

Session events may support timelines, history, automation, and audit-friendly gameplay state.

Actor and target references must be modeled so they can safely represent the supported domain object types.

---

## 24. Dice Roll

`DiceRoll` records a dice operation.

```text
DiceRoll
- id
- campaignId
- sessionId?
- userId
- campaignCharacterId?
- expression
- result
- details
- visibility
- createdAt
```

Dice behavior may be influenced or validated by the Campaign's Ruleset.

---

## 25. Encounter

`Encounter` represents Campaign-specific encounter state.

```text
Encounter
- id
- campaignId
- sessionId?
- mapId?
- name
- status
- state
```

Encounter state may include participants, initiative, tokens, conditions, turn order, and effects.

Ruleset-specific calculations do not belong in the generic Encounter model.

---

## 26. Token

`Token` represents something positioned on a battle map.

```text
Token
- id
- encounterId
- campaignCharacterId?
- entityId?
- x
- y
- rotation
- size
- state
- visibility
```

A Token may reference a CampaignCharacter, NPC/entity, object, or effect as supported by the encounter model.

---

## 27. Display Session

`DisplaySession` represents a controlled display for a projector, television, table screen, or other presentation client.

```text
DisplaySession
- id
- campaignId
- controlledByUserId
- mapId?
- displayState
- createdAt
```

The controlling user determines what the display client may receive.

A display client does not inherit unrestricted GM permissions.

---

## 28. AI Integration

AI is an external client of Weaveryn's application/API layer.

AI models must not receive unrestricted direct database access.

```text
AIRequest
- id
- worldId?
- campaignId?
- userId
- provider
- model
- purpose
- createdAt
```

All AI actions execute using the permissions of the invoking user.

AI access to World, Campaign, Character, and other data passes through the same authorization and visibility rules as other clients.

Provider configuration remains separate from World and Campaign data.

---

## 29. Audit Log

Sensitive mutations should be auditable.

```text
AuditEvent
- id
- worldId?
- campaignId?
- userId
- actorType
- action
- objectType
- objectId
- changes
- createdAt
```

Actor types may include:

```text
USER
AI
SYSTEM
```

Audit data should make it possible to determine who or what performed a sensitive change, what changed, and when.

---

## 30. High-Level Relationships

```text
User
├── owns ─────────────── World
│                        ├── WorldMembership
│                        ├── WorldEntity
│                        │   └── EntityRelationship
│                        ├── WorldTimeline
│                        │   └── WorldEvent
│                        │       └── WorldEventEntity ──► WorldEntity
│                        ├── WorldCharacter ◄────► Character-backed WorldEntity
│                        └── Campaign
│                            ├── WorldTimeline / currentWorldPosition
│                            ├── CampaignMembership
│                            ├── CampaignCharacter
│                            ├── RulesetVersion
│                            ├── Session
│                            ├── Encounter
│                            └── Campaign-specific data
│
├── owns ─────────────── Campaign
│
└── owns ─────────────── Character
                         └── WorldCharacter ◄────► WorldEntity
                             └── CampaignCharacter

Ruleset
└── RulesetVersion
    ├── SheetDefinition
    └── RuleDefinition
```

---

## 31. Data Ownership and Scope Rules

1. World ownership is represented by `World.ownerId`.
2. Campaign ownership is represented by `Campaign.ownerId`.
3. Membership roles do not duplicate ownership.
4. World-scoped objects must be traceable to a World.
5. Campaign-scoped objects must be traceable to a Campaign and therefore its World.
6. Character identity is owned by a User rather than a World or Campaign.
7. WorldCharacter contains World-specific Character data.
8. CampaignCharacter contains Campaign- and Ruleset-specific Character state.
9. Cross-World CampaignCharacter relationships are forbidden.
10. API requests must validate scope, membership, ownership, permissions, and visibility rather than trusting client-supplied IDs.
11. Cross-scope links are forbidden unless explicitly supported by the domain.
12. Destructive operations require defined dependent-data behavior and should use soft deletion, archival, or backups where appropriate.
13. WorldEntity represents persistent World identity; time-dependent World facts are represented in World history rather than as one universally current entity state.
14. A Campaign resolves time-dependent World facts using a WorldTimeline from the same World and its current numeric World position.
15. Campaign-specific knowledge and gameplay state remain separate from canonical World history unless an explicit future workflow defines otherwise.
16. An active Campaign always requires an existing World and retains its `worldId` while active.
17. Any active Campaign blocks World deletion, regardless of Campaign ownership.
18. World ownership does not grant authority to delete an independently owned Campaign.
19. A World owner may relinquish ownership without changing the World ID or active Campaign relationships.
20. An orphaned World may be claimed by an eligible `ADMIN`, `MEMBER`, or owner of an active Campaign hosted in the World.
21. User-owned content must not be destroyed merely because a containing World is eventually removed.
22. A Character has at most one WorldCharacter per World.
23. A Campaign owner always has a `GM` CampaignMembership.
24. Active Campaigns require both a valid `worldId` and a WorldTimeline from that World.
25. Detached archived Campaigns use an immutable World snapshot and do not resolve live World state.
26. Campaign- or player-targeted visibility must identify the target Campaign or User.
27. Account deletion resolves owned Worlds, Campaigns, and Characters explicitly before removing the User.
28. A WorldCharacter has at most one linked Character-backed WorldEntity, and the link must remain within one World.
29. Character-backed WorldEntity name/image presentation derives from Character/WorldCharacter authority rather than an independently editable duplicate.
30. Campaign-only access may expose a Character-backed entity only through authorized Campaign participation and does not imply general World access.
31. Copying a WorldCharacter creates a fresh target-World Character entity and does not copy source-World EntityRelationships automatically.
32. Migrating a WorldCharacter preserves source-World relationships by converting the detached source entity into an independent `Person / NPC` snapshot before creating a fresh Character entity in the target World.

---

## 32. Future Compatibility

The logical model should avoid preventing:

- multiple Characters per User
- multiple Campaigns per World
- multiple WorldCharacters per Character across different Worlds
- one WorldCharacter participating in multiple Campaigns
- independent progression per Campaign
- Campaigns operating at different dates in the same World history
- World timeline branches and divergent Campaign histories
- orphaned Worlds continuing to host active Campaigns until ownership is claimed
- Campaign owners claiming an orphaned World on which their active Campaign depends
- Character copy/migration between Worlds
- co-owned or delegated Characters
- multiple GMs
- spectators
- Campaign and World templates
- Ruleset repositories/marketplaces
- custom entity and relationship types
- nested/hex maps and fog of war
- realtime multiplayer
- offline/PWA and mobile clients
- public World/Campaign pages
- import/export
- Campaign snapshots/branching
- plugin/module systems
- multiple AI providers
- AI-generated and solo-play content
