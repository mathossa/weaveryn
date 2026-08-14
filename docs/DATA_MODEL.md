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
- Enforce ownership, permissions, and visibility consistently.
- Support self-hosting, APIs, AI, maps, sessions, and live play without coupling the core model to them.

---

## 2. User

A `User` represents a Weaveryn account.

```text
User
- id
- email
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
- contains World-level maps/assets as supported

Constraints:

- `ownerId` is authoritative for ownership
- ownership is not duplicated through membership roles
- the owner does not have a `WorldMembership`
- a World may become orphaned when its owning User is deleted
- an orphaned World may be adopted by an `ADMIN` or `MEMBER`
- a `VIEWER` cannot adopt an orphaned World
- if no `ADMIN` or `MEMBER` remains when the owner is deleted, the World is deleted
- deletion must use an explicit application workflow when independently user-owned content exists

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

---

## 5. Campaign

A `Campaign` is a playable game instance hosted in a World.

```text
Campaign
- id
- worldId
- ownerId
- name
- description
- image
- activeRulesetVersionId
- settings
- status
- createdAt
- updatedAt
```

Relations:

- hosted in one World while active
- owned by one User
- has CampaignMemberships
- has CampaignCharacters
- references an active RulesetVersion
- may contain Sessions, Encounters, Campaign-specific Maps, Assets, DiceRolls, and live-play state

Constraints:

- Campaign ownership is independent from World ownership
- `ownerId` is authoritative for Campaign ownership
- membership roles do not represent ownership
- active Campaigns require a World
- Campaign-specific data must not leak across authorization boundaries
- changing RulesetVersion requires an explicit migration process

A Campaign may become unassigned or archived when its World is removed if preservation of user-owned content requires it.

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
- the Campaign owner normally receives functional `GM` membership
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

A Campaign references a specific RulesetVersion so existing Campaigns are not automatically changed when a Ruleset evolves.

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
- worldData
- status
- createdAt
- updatedAt
```

Relations:

- belongs to one Character
- belongs to one World while assigned
- has zero or more CampaignCharacters

World-specific identity, history, relationships, and setting concepts belong here.

Constraints:

- a Character may have WorldCharacters in multiple Worlds
- copying to another World creates another WorldCharacter
- migration changes/adapts World placement without changing Character ownership
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
- `sheetData` conforms to the Campaign's active RulesetVersion
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

`WorldEntity` represents flexible setting content belonging to a World.

```text
WorldEntity
- id
- worldId
- type
- name
- description
- image
- data
- visibility
- createdBy
- createdAt
- updatedAt
```

World entities may represent locations, organizations, people, items, quests, events, creatures, deities, notes, or custom entity types.

The `data` field stores type-specific structured information.

Campaign-specific state or knowledge about a WorldEntity should not require duplicating the underlying WorldEntity.

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

The model must support scopes such as:

```text
PUBLIC
WORLD
CAMPAIGN
PLAYER
GM
PRIVATE
```

The exact visibility model may evolve and should not prevent future custom scopes or per-user access.

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
│                        ├── WorldCharacter
│                        └── Campaign
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
                         └── WorldCharacter
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
10. User-owned content must not be destroyed merely because a containing World is removed.
11. API requests must validate scope, membership, ownership, permissions, and visibility rather than trusting client-supplied IDs.
12. Cross-scope links are forbidden unless explicitly supported by the domain.
13. Destructive operations require defined dependent-data behavior and should use soft deletion, archival, or backups where appropriate.

---

## 32. Future Compatibility

The logical model should avoid preventing:

- multiple Characters per User
- multiple Campaigns per World
- multiple WorldCharacters per Character
- one WorldCharacter participating in multiple Campaigns
- independent progression per Campaign
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
