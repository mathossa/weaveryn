# Weaveryn MVP

## Purpose

The first Weaveryn MVP validates the core application backbone.

The goal is to prove that users can create, persist, load, and connect the
core domain objects before advanced game-system functionality is added.

## MVP Scope

### Users

Users can:

- create an account
- log in and log out
- load their own accessible data

### Worlds

Users can:

- create Worlds
- load accessible Worlds
- manage basic World information
- participate in Worlds according to ownership and membership permissions

World ownership and lifecycle behavior follow `ARCHITECTURE.md`.

### Campaigns

Users with permission can:

- create Campaigns inside a World
- load accessible Campaigns
- manage basic Campaign information
- participate according to Campaign ownership and membership permissions

### Characters

Users can:

- create Characters
- load their Characters
- use a Character within a World
- participate with a World-specific Character in one or more Campaigns
- maintain independent Campaign-specific Character state

Character identity, World-specific identity, and Campaign-specific state remain
separate as defined by `ARCHITECTURE.md` and `DATA_MODEL.md`.

### Entities and Relationships

Users with permission can:

- create World/Campaign content entities
- load and edit those entities
- link entities through meaningful relationships
- navigate between linked entities

This provides the basic interconnected World model on which later features can
build.

## MVP Completion

The MVP is complete when a user can:

1. Log in.
2. Create and load a World.
3. Create and load a Campaign within that World.
4. Create and load a Character.
5. Use that Character in a Campaign.
6. Create and load content entities.
7. Link entities together.
8. Leave the application, return later, and have the persisted state load
   correctly.
