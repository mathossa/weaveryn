# WorldCharacter entity graph integration

Issue: #117, refined by #124

## Purpose

Playable Characters must participate in the same persistent World graph as NPCs, locations, factions, items, creatures, and other World content without flattening Weaveryn's Character model or duplicating independently editable identity data.

The implemented identity chain is:

```text
Character
  -> WorldCharacter <-> WorldEntity
      -> CampaignCharacter
```

`Character` remains the portable User-owned identity.

`WorldCharacter` remains the Character's incarnation and World-specific identity in one World.

`CampaignCharacter` remains Campaign-specific participation, progression, ruleset state, and sheet data.

`WorldEntity` is the graph representation that allows the WorldCharacter to participate in normal `EntityRelationship` connections.

## One World graph identity

A WorldCharacter has at most one linked WorldEntity.

The linked WorldEntity and WorldCharacter must belong to the same World. The database enforces this with a composite foreign key from `(worldCharacterId, worldCharacterWorldId)` to `WorldCharacter(id, worldId)` plus a check that the internal `worldCharacterWorldId` always equals the WorldEntity's real `worldId` whenever a Character link exists. The extra field is an integrity key, not a second source of World ownership.

The same WorldCharacter may participate in multiple Campaigns in that World without creating more WorldEntity rows.

A Character copied into another World receives another WorldCharacter and therefore another Character-backed WorldEntity in that target World.

## Built-in Character entity type

`Character` is a reserved built-in World entity type.

Normal WorldEntity creation/editing cannot create a fake Character entity or convert an unrelated entity to `Character`.

A Character-backed WorldEntity is created through the WorldCharacter lifecycle instead.

Generic non-player people remain `Person / NPC` entities.

## Source of truth

While a WorldEntity is linked to a WorldCharacter:

- display name resolves from `WorldCharacter.nameOverride`, falling back to `Character.name`;
- portrait resolves from `Character.image`;
- the generic WorldEntity editor cannot independently change its type, name, portrait, or visibility identity;
- graph-specific structured data, image focus, and relationships may still use the normal World entity graph where authorized.

This prevents the Character page and World entity page from becoming two independently editable copies of the same identity.

The WorldEntity stores a snapshot-compatible name/image so it can become independent World content if the WorldCharacter later leaves that World and the World still has meaningful references to it.

## Visibility

Character-backed entity visibility is derived from the WorldCharacter's real placement and participation rather than from a manually editable entity audience.

A Character-backed entity is visible when:

- the actor has normal World owner/member visibility; or
- the actor has Campaign access and the linked WorldCharacter participates in an accessible Campaign.

Campaign-only Character visibility does not grant general World membership or unrestricted World content access.

Advanced character knowledge, reveal propagation, and custom audiences remain deferred to the later visibility model.

## Relationships

A Character-backed WorldEntity is a normal source or target of `EntityRelationship`.

Examples:

```text
Bodwick -> MEMBER_OF -> The Silver Hand
Bodwick -> OWNS -> Moonblade
Bodwick -> LIVES_IN -> Waterdeep
Gold Dragon -> DISTRUSTS -> Bodwick
```

Relationship visibility and same-World rules remain enforced through the normal World entity service.

## Creation

Creating a WorldCharacter through `CharacterService` creates its Character-backed WorldEntity in the same transaction.

If entity creation fails, WorldCharacter creation rolls back.

The new entity begins as built-in type `character` and is linked to that WorldCharacter.

## Campaign participation

Creating or removing a CampaignCharacter does not create or delete the linked WorldEntity.

One WorldCharacter participating in multiple Campaigns remains one World identity/entity.

Deleting a Campaign therefore removes Campaign-specific participation/state without deleting the WorldCharacter graph identity.

Leaving a Campaign is intentionally different from leaving the World: after Campaign-only removal, the WorldCharacter is still a playable Character in that World and may participate in another Campaign later.

## Copying to another World

Copy preserves the portable Character while creating a separate WorldCharacter in the target World.

The copy receives a fresh Character-backed WorldEntity in the target World.

Source-World relationships are deliberately not copied. World-specific graph relationships only have meaning in their own World unless a future explicit mapping workflow says otherwise.

Conceptually:

```text
World A
Character -> WorldCharacter A <-> Character Entity A -> source relationships

World B after copy
Character -> WorldCharacter B <-> Character Entity B
```

Entity B starts without Entity A's relationships.

## Migration between Worlds

Migration preserves source-World continuity only when there is continuity to preserve.

Existing CampaignCharacter participation must be resolved before migration, preserving the #19 invariant.

Before moving the WorldCharacter, the source Character-backed entity is evaluated for meaningful World continuity. Today this includes normal `EntityRelationship` connections, a non-empty WorldEntity description, or non-empty structured WorldEntity data. Future first-class note mentions, map references, timeline references, or other World references must be added to the same preservation decision when those systems exist.

If the source entity has no meaningful World references/content, it is removed as unused World graph state.

If the source entity does have meaningful World references/content, migration:

1. Resolves the current authoritative WorldCharacter/Character name and portrait.
2. Detaches the source WorldEntity from the WorldCharacter.
3. Converts the source entity to normal `Person / NPC` World content.
4. Snapshots the current resolved name and portrait into that independent NPC.
5. Keeps the source entity's description, structured World data, image focus, and EntityRelationships in place.
6. Moves the same WorldCharacter ID to the target World.
7. Creates a fresh Character-backed WorldEntity in the target World.
8. Does not copy source-World relationships.

After detachment, the source NPC is ordinary World-owned content. It has no `worldCharacterId`, is no longer treated as a playable Character, exposes no Character-management action, and future Character or WorldCharacter name/image edits no longer change it.

## WorldCharacter removal

The application-level WorldCharacter removal path follows the same conditional continuity rule when the World itself remains:

- active CampaignCharacter participation blocks removal;
- if the Character-backed entity has no meaningful World references/content, that unused entity is removed;
- if the entity is referenced or contains meaningful World-specific content, it is detached and converted to a `Person / NPC` snapshot;
- preserved relationships and World content stay attached to that NPC;
- the WorldCharacter is then removed;
- the portable Character remains User-owned.

A detached NPC must never render as a playable Character merely because it originated from one. `worldCharacterId` is the authoritative indicator for playable Character presentation, not historical origin or a stale type label.

The database link uses cascading deletion as a containment safety rule so deleting an entire World can still clean up its World-owned entity graph. Normal Character/WorldCharacter lifecycle operations must use the application service so the deliberate cleanup/preservation behavior occurs before deletion.

## World deletion

Deleting an eligible World removes its World-owned graph, including WorldEntity rows and their relationships, according to the existing World lifecycle.

The portable `Character` remains User-owned and is not deleted merely because a World is removed.

## UI behavior

The World entity browser treats `Character` as a built-in type for search/filter/display, but generic create/edit controls do not offer it as a manually creatable type.

A WorldEntity is presented as a playable Character only while it has a live `worldCharacterId` link.

A linked Character-backed entity detail page:

- identifies the entity as a playable Character;
- shows authoritative Character/WorldCharacter presentation;
- keeps normal relationship navigation;
- does not expose generic identity deletion/editing;
- links to the editable Character route only when the current user owns that Character.

A detached historical NPC instead uses normal Person/NPC presentation and generic WorldEntity editing. It does not expose `Manage my Character`, `Open Character`, or playable-Character labeling.

Other users do not receive access to another player's editable Character route merely because they can see the shared World entity.

The WorldCharacter overview links back to its WorldEntity/relationships when the graph representation exists.

## Verification

The existing `/dev/character-copy-migration` and Character integration coverage are reused rather than creating duplicate test infrastructure.

Coverage verifies:

- copy creates a separate Character-backed entity;
- source relationships are not copied;
- Campaign participation still blocks migration/removal;
- referenced source entities become independent Person/NPC history with relationships preserved;
- unreferenced source entities are removed as unused graph state;
- detached NPCs no longer have a WorldCharacter link;
- the target World receives a fresh Character-backed entity after migration.

Unit/integration coverage also verifies reserved Character type handling, Character-backed entity protection, relationship participation, Campaign-only visibility behavior, and the leave-World cleanup rule.
