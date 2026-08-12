# Weaveryn Architecture

## 1. Project Vision

Weaveryn is an open-source, system-agnostic tabletop RPG platform.

It combines:

- Campaign management
- Interactive world building
- Character management
- Custom rulesets
- Session notes
- Interactive maps
- Battle maps / virtual tabletop
- Dice rolling
- AI integration
- Solo play
- Multiplayer / online play

The application should work well on desktop, tablet and mobile.

## 2. Core Design Principles

### System agnostic

Weaveryn must not hard-code D&D, Pathfinder, or another RPG system into
the core application.

Campaigns reference a Ruleset.

Rulesets define things such as:

- Character sheet fields
- Stats
- Skills
- Resources
- Spells
- Abilities
- Items
- Dice mechanics
- Game-specific rules

### Campaign isolation

Every campaign is its own world.

A campaign contains:

- Players
- Characters
- World entities
- Maps
- Sessions
- Ruleset
- Campaign files
- AI context

Users may participate in multiple campaigns.

### Everything can be linked

World information should form a graph rather than only a wiki.

For example:

Character -> Member of -> Faction
Character -> Lives in -> City
City -> Located in -> Region
NPC -> Owns -> Tavern
Quest -> Involves -> NPC
Map Marker -> Points to -> City

### Permission aware

Initial roles:

- Admin
- Dungeon Master
- Player

Permissions must be enforced by the backend/API, not only hidden in the UI.

### API first

Important application functionality should be accessible through an API.

This allows:

- Web UI
- Mobile/PWA UI
- AI agents
- External integrations
- Future clients

to use the same application logic.

### AI is a client, not the database

AI agents should interact with Weaveryn through controlled APIs/tools.

Examples:

- search_campaign
- get_character
- get_entity
- get_rules
- create_note
- update_entity
- roll_dice

AI access must respect the permissions of the user invoking it.

## 3. Core Domains

### Users

Authentication and user profile.

### Campaigns

Campaign configuration, membership and permissions.

### Rulesets

Versioned definitions of RPG systems.

Each campaign selects a ruleset.

Rulesets can be imported, exported and customized.

### Characters

Characters belong to campaigns and use the campaign's ruleset to determine
their character sheet.

### World

Generic interconnected campaign entities.

Examples:

- Person / NPC
- Location
- Region
- Settlement
- Organization
- Item
- Quest
- Event
- Creature
- Note

### Maps

Uploaded maps with interactive layers and markers.

Markers can reference world entities.

### Sessions

Session history, notes, events and campaign changes.

### Play

Live gameplay functionality:

- Dice
- Encounters
- Initiative
- Battle maps
- Tokens
- Fog of war
- Projector/display mode

### AI

Permission-controlled interface between AI models and campaign data.

AI providers should be replaceable.

Possible providers include:

- Ollama
- Hosted AI APIs
- Future providers

## 4. High-Level Architecture

Browser / PWA
        |
        v
     Next.js
        |
        v
 Application Services
        |
   +----+---------+----------+
   |              |          |
   v              v          v
Database       Storage     Realtime
   |
   v
Weaveryn API
   ^
   |
   +---- AI Agent
   |
   +---- External integrations

## 5. Development Philosophy

Features should be divided into independent modules wherever practical.

A developer or coding agent should be able to implement a feature on a
feature branch without requiring unrelated parts of the application to
be modified.

Large features should be divided into GitHub Issues with clearly defined:

- Goal
- Scope
- API contract
- Dependencies
- Acceptance criteria
- Tests
