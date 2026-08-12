# Weaveryn Data Model

## 1. Purpose

This document defines the core data concepts and relationships used by
Weaveryn.

It describes the logical model rather than a specific database schema.

The goals are:

- Keep the core system RPG-system agnostic.
- Allow campaigns to use different rulesets.
- Allow rulesets to evolve without destroying existing campaign data.
- Support highly customizable character sheets.
- Allow campaign objects to link to each other.
- Support maps, sessions, live play, and AI.
- Enforce permissions consistently.
- Make the API usable by both humans and AI agents.

---

# 2. User

A User represents a Weaveryn account.

A user can participate in multiple campaigns and may have different roles
in each campaign.

Example:

User
- id
- username
- displayName
- avatar
- createdAt
- updatedAt

Global administrative permissions should be separate from campaign roles.

---

# 3. Campaign

Campaign is the primary isolation boundary in Weaveryn.

Almost all gameplay data belongs to a campaign.

Example:

Campaign
- id
- name
- description
- image
- ownerId
- activeRulesetVersionId
- settings
- createdAt
- updatedAt

A campaign can contain:

- Members
- Characters
- World entities
- Relationships
- Maps
- Sessions
- Files
- Ruleset configuration
- Dice history
- Live play state
- AI configuration

Campaign data must not accidentally become visible to users outside that
campaign.

---

# 4. Campaign Membership

CampaignMembership connects a User to a Campaign.

Example:

CampaignMembership
- id
- campaignId
- userId
- role
- permissions
- joinedAt

Initial roles:

- OWNER
- ADMIN
- DM
- PLAYER
- SPECTATOR

Roles provide default permissions.

Individual permissions may eventually override role defaults.

Examples:

- campaign.read
- campaign.manage
- character.create
- character.edit.own
- character.edit.any
- entity.read.player
- entity.read.dm
- entity.write
- map.manage
- session.manage
- ruleset.manage
- ai.use
- ai.write

The backend must always enforce permissions.

---

# 5. Ruleset

A Ruleset describes the game system used by a campaign.

The Weaveryn core must not assume D&D-specific concepts such as:

- Armor Class
- Spell Slots
- Classes
- Saving Throws
- d20 checks

Those concepts belong to rulesets.

Example:

Ruleset
- id
- name
- description
- author
- system
- visibility
- createdAt
- updatedAt

Examples could include:

- A user-created fantasy RPG ruleset
- Pathfinder-compatible user content
- Homebrew systems
- Generic narrative RPGs

Rulesets should be importable and exportable.

Copyrighted rules/content is not bundled with Weaveryn unless licensing
explicitly permits it.

Users may provide their own content where legally permitted.

---

# 6. Ruleset Version

Rulesets must be versioned.

A campaign should reference a specific RulesetVersion rather than an
ever-changing Ruleset.

Example:

RulesetVersion
- id
- rulesetId
- version
- schema
- definitions
- createdAt

Example:

Ruleset
  |
  +-- Version 1.0
  |
  +-- Version 1.1
  |
  +-- Version 2.0

This allows existing campaigns to remain on an older version.

Changing the ruleset of an active campaign must be treated as a migration,
not simply replacing the ruleset reference.

---

# 7. Ruleset Migration

Changing rulesets or ruleset versions may require transforming campaign
data.

Example:

Old ruleset:

strength: 14

New ruleset:

attributes:
  physical:
    strength: 14

A migration can map the old value into the new schema.

RulesetMigration
- id
- fromRulesetVersionId
- toRulesetVersionId
- migrationDefinition
- createdAt

Before migration, Weaveryn should:

1. Validate the target ruleset.
2. Create a campaign snapshot/backup.
3. Preview incompatible fields.
4. Show the DM/admin what will change.
5. Require confirmation.
6. Perform the migration.
7. Validate the result.
8. Allow rollback if migration fails.

---

# 8. Character

A Character exists inside a Campaign.

Example:

Character
- id
- campaignId
- ownerUserId
- name
- image
- type
- sheetData
- visibility
- createdAt
- updatedAt

Character types could include:

- PLAYER_CHARACTER
- NPC
- COMPANION
- CREATURE

The character sheet should NOT be represented by hundreds of fixed
D&D-specific database columns.

Instead:

Character
  |
  +-- sheetData

The structure and validation of sheetData are defined by the campaign's
RulesetVersion.

Example conceptual data:

{
  "name": "Bodwick",
  "attributes": {
    "strength": 14,
    "dexterity": 12
  },
  "resources": {
    "health": {
      "current": 24,
      "maximum": 30
    }
  }
}

This allows radically different RPG systems to use the same Character
model.

---

# 9. Character Sheet Definition

A RulesetVersion can define how a character sheet is constructed.

Example components:

- Text
- Number
- Checkbox
- Select
- Resource bar
- Attribute
- Skill
- Repeating list
- Inventory
- Ability list
- Spell list
- Tabs
- Sections

Conceptually:

SheetDefinition
- id
- rulesetVersionId
- name
- schema
- layout
- validationRules

Schema defines the data.

Layout defines how that data should be presented.

These should remain separate so changing the visual layout does not
necessarily require migrating character data.

---

# 10. Rule Content

Rulesets may contain reusable game definitions.

Examples:

- Ability
- Spell
- Skill
- Item
- Weapon
- Armor
- Condition
- Creature template
- Class
- Species
- Feat

A generic model can initially be used:

RuleDefinition
- id
- rulesetVersionId
- type
- key
- name
- description
- data

Example:

RuleDefinition
  type: "spell"
  key: "example_fire_spell"

  data:
    level: 3
    range: 150
    duration: "instant"
    damage:
      dice: "8d6"
      type: "fire"

Rulesets determine which fields are valid.

---

# 11. Character Rule References

Characters should generally reference rule definitions instead of copying
the entire rule definition.

Example:

CharacterAbility
- id
- characterId
- ruleDefinitionId
- state
- overrides

This allows a character to know:

- which spells they know
- which abilities they have
- charges remaining
- whether something is prepared
- character-specific modifications

Example:

RuleDefinition
  Fire Spell
      ^
      |
CharacterRuleReference
      |
      v
    Bodwick

---

# 12. World Entity

Campaign world information should use a flexible entity model.

WorldEntity
- id
- campaignId
- type
- name
- description
- image
- data
- visibility
- createdBy
- createdAt
- updatedAt

Possible types:

- PERSON
- LOCATION
- SETTLEMENT
- REGION
- ORGANIZATION
- ITEM
- QUEST
- EVENT
- CREATURE
- DEITY
- NOTE
- CUSTOM

Custom entity types should eventually be supported.

The `data` field contains type-specific structured information.

---

# 13. Entity Relationships

World entities can be connected.

EntityRelationship
- id
- campaignId
- sourceEntityId
- targetEntityId
- relationshipType
- label
- visibility
- metadata

Examples:

Bodwick
  -- member_of --> Adventurers Guild

Adventurers Guild
  -- based_in --> Neverwinter

Mayor
  -- governs --> Neverwinter

Ancient Sword
  -- owned_by --> Bodwick

Quest
  -- takes_place_in --> Neverwinter

This turns campaign information into a connected world rather than a
collection of isolated wiki pages.

---

# 14. Visibility

Objects can have visibility rules.

Initial visibility levels:

- PUBLIC
- CAMPAIGN
- PLAYER
- DM
- PRIVATE

Examples:

A city's public description:
PLAYER

The city's hidden cult:
DM

A player's private character note:
PRIVATE

Visibility must be enforced by the API.

An AI agent must never receive information the requesting user is not
allowed to access.

---

# 15. Secret Information

An entity may contain information with different visibility levels.

Therefore it may eventually be useful to store content as blocks rather
than assigning visibility only to an entire entity.

Example:

City: Greenhaven

Player-visible:
  Greenhaven is a trading city beside the river.

DM-only:
  The mayor secretly belongs to the Ashen Circle.

This allows the same object to contain both player and DM information.

---

# 16. Map

Map represents an uploaded campaign map.

Map
- id
- campaignId
- name
- imageAssetId
- width
- height
- type
- settings
- createdAt
- updatedAt

Map types might include:

- WORLD
- REGION
- CITY
- DUNGEON
- BATTLE

---

# 17. Map Marker

Maps can contain interactive markers.

MapMarker
- id
- mapId
- x
- y
- icon
- label
- linkedEntityId
- visibility
- data

Coordinates should preferably be stored independently of the rendered
screen resolution.

For example normalized coordinates:

x = 0.625
y = 0.318

Clicking a marker can open the linked entity.

Example:

World Map
    |
    +-- Marker
           |
           +--> City: Greenhaven

Markers may later support:

- regions/polygons
- paths
- measurement
- drawings
- portals to another map
- encounter triggers

---

## 18. Asset

Uploaded files are represented separately from the objects that use them.

Asset
- id
- campaignId
- uploadedBy
- type
- filename
- mimeType
- size
- storageKey
- metadata
- createdAt

The database stores file metadata and a storage key. The actual file is
stored using the configured StorageProvider.

The default storage provider is LocalStorageProvider.

Example local structure:

data/
  uploads/
    campaigns/
      <campaign-id>/
        <asset-id>

Application code must not directly depend on local filesystem paths.
All file operations go through StorageService.

This allows future storage providers, such as S3-compatible object storage,
without changing campaign, map, character, or asset logic.

Local storage is the primary and default storage method for Weaveryn.
Cloud storage must not be required to run a normal self-hosted instance.

---

# 19. Session

Session represents a tabletop session.

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

A session may contain:

- Notes
- Events
- Dice rolls
- Encounters
- Character changes
- Discovered entities
- AI interactions

---

# 20. Session Event

Important events during play can be recorded as structured events.

SessionEvent
- id
- sessionId
- type
- actorId
- targetId
- data
- createdAt

Examples:

- Dice rolled
- Combat started
- Character damaged
- Item received
- Quest completed
- Location discovered
- Note created

This could later allow Weaveryn to automatically construct a session
timeline.

---

# 21. Dice Roll

DiceRoll
- id
- campaignId
- sessionId
- userId
- characterId
- expression
- result
- details
- visibility
- createdAt

Examples:

1d20+5
2d6+3
4d8

The dice engine should eventually be configurable by the ruleset.

---

# 22. Encounter

Encounter
- id
- campaignId
- sessionId
- mapId
- name
- status
- state

An encounter can contain:

- Participants
- Initiative
- Tokens
- Conditions
- Turn order
- Effects

Ruleset-specific combat calculations should not live in the generic
Encounter model.

---

# 23. Token

Token represents something positioned on a battle map.

Token
- id
- encounterId
- entityId
- characterId
- x
- y
- rotation
- size
- state
- visibility

Tokens may represent:

- Player characters
- NPCs
- Monsters
- Objects
- Effects

---

# 24. Display / Projector Mode

A campaign can create a display session for a projector, television, or
table screen.

DisplaySession
- id
- campaignId
- controlledByUserId
- mapId
- displayState
- createdAt

The DM controls what the display client sees.

The display client should not require DM permissions.

Examples:

DM Laptop
    |
    +---- control ----> Battle Map
                         |
                         +----> Projector / Table Display

Future online players can use the same realtime infrastructure.

---

# 25. AI Integration

AI is an external consumer of Weaveryn's application/API layer.

An AI model must not receive unrestricted direct database access.

AIRequest
- id
- campaignId
- userId
- provider
- model
- purpose
- createdAt

Possible tools:

- search_campaign
- get_entity
- get_character
- get_rules
- get_session
- create_note
- update_entity
- roll_dice

Every tool invocation runs using the permissions of the requesting user.

Example:

Player asks:

"What is the mayor hiding?"

If the answer exists only in DM-visible content, the AI must not receive
that content.

DM asking the same question may receive it.

---

# 26. AI Providers

AI functionality should not depend on one provider.

Conceptually:

AIProvider
  |
  +-- Ollama
  +-- OpenAI-compatible API
  +-- Other providers

Provider configuration should be separate from campaign data.

This makes it possible to use:

- Local models
- Hosted models
- Different models for different tasks

---

# 27. Audit Log

Sensitive mutations should eventually be auditable.

AuditEvent
- id
- campaignId
- userId
- actorType
- action
- objectType
- objectId
- changes
- createdAt

actorType may include:

- USER
- AI
- SYSTEM

This is particularly important for AI writes.

Example:

AI changed NPC description

The DM should be able to determine:

- who requested it
- which AI performed it
- what changed
- when it changed

---

# 28. Important Relationships

High-level model:

User
  |
  +---- CampaignMembership ---- Campaign
  |                               |
  |                               +---- RulesetVersion
  |                               |
  |                               +---- Character
  |                               |
  |                               +---- WorldEntity
  |                               |        |
  |                               |        +---- EntityRelationship
  |                               |
  |                               +---- Map
  |                               |     |
  |                               |     +---- MapMarker
  |                               |
  |                               +---- Session
  |                               |      |
  |                               |      +---- SessionEvent
  |                               |      +---- DiceRoll
  |                               |      +---- Encounter
  |                               |
  |                               +---- Asset
  |                               |
  |                               +---- DisplaySession
  |
  +---- Character ownership

Ruleset
  |
  +---- RulesetVersion
           |
           +---- SheetDefinition
           |
           +---- RuleDefinition

---

# 29. Data Ownership Rules

Every campaign-owned object must ultimately be traceable to a Campaign.

API requests must never trust a campaign ID supplied by the client without
also checking membership and permissions.

Objects belonging to different campaigns must not be linkable unless a
future explicit cross-campaign feature allows it.

Deleting a campaign must have a defined strategy for all dependent data.

Important destructive operations should prefer soft deletion or backups
where practical.

---

# 30. Future Considerations

Not required for the first version, but the architecture should avoid
preventing:

- Multiple characters per user per campaign
- Co-owned characters
- Multiple DMs
- Spectators
- Campaign templates
- Ruleset marketplace/repository
- Custom entity types
- Custom relationship types
- Nested maps
- Hex maps
- Fog of war
- Realtime multiplayer
- Offline/PWA mode
- Mobile clients
- Public campaign pages
- Campaign export/import
- Ruleset export/import
- Plugin/module system
- AI-generated content
- AI solo campaigns
- Multiple AI providers
- Campaign branching/snapshots
