# WorldCharacter entity graph integration

Issues: #117, #124

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

The WorldEntity stores a snapshot-compatible name/image so it can become independent World content if the WorldCharacter later leaves that World.

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

A Character owner who still has access to a Campaign may voluntarily remove their own `CampaignCharacter` participation. Campaign owners, GMs, and Assistant GMs retain their existing management authority over participation. A normal player cannot remove another user's Character participation.

Leaving Character participation is deliberately separate from leaving Campaign membership. Removing a `CampaignCharacter` does not remove `CampaignMembership`, `WorldCharacter`, the portable `Character`, the linked Character-backed `WorldEntity`, or its World relationships.

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

Migration preserves source-World continuity rather than deleting the Character's history from that graph.

Existing CampaignCharacter participation must be resolved before migration, preserving the #19 invariant.

Migration then executes transactionally:

1. Resolve the current authoritative WorldCharacter/Character name and portrait.
2. Detach the source WorldEntity from the WorldCharacter.
3. Convert the source entity to normal `Person / NPC` World content.
4. Snapshot the current resolved name and portrait into that independent NPC.
5. Keep the source entity's description, structured World data, image focus, and EntityRelationships in place.
6. Move the same WorldCharacter ID to the target World.
7. Create a fresh Character-backed WorldEntity in the target World.
8. Do not copy source-World relationships.

Example:

```text
Before

World A
Character -> WorldCharacter <-> Character Entity
                            -> OWNS -> Moonblade

After migration

World A
Person / NPC snapshot -> OWNS -> Moonblade

World B
Character -> same WorldCharacter <-> fresh Character Entity
```

After detachment, the source NPC is ordinary World-owned content. Future Character or WorldCharacter name/image edits no longer change that NPC.

## WorldCharacter removal

The application-level WorldCharacter removal path follows the same preservation principle when the World itself remains:

- active CampaignCharacter participation blocks removal;
- the linked Character entity is detached and converted to an NPC snapshot;
- its World relationships remain;
- the WorldCharacter is then removed;
- the portable Character remains owned by the user and can later receive another WorldCharacter in a different or newly accessible World.

The production Character overview exposes this as an explicit `Leave World` action. It is disabled while any CampaignCharacter participation remains, including participation that may no longer be visible through the current user's Campaign access. The backend performs the same authoritative check before mutation.

The database link uses cascading deletion as a containment safety rule so deleting an entire World can still clean up its World-owned entity graph. Normal Character/WorldCharacter lifecycle operations must use the application service so the deliberate NPC preservation behavior occurs before deletion.

## World deletion

Deleting an eligible World removes its World-owned graph, including WorldEntity rows and their relationships, according to the existing World lifecycle.

The portable `Character` remains User-owned and is not deleted merely because a World is removed.

## UI behavior

The World entity browser treats `Character` as a built-in type for search/filter/display, but generic create/edit controls do not offer it as a manually creatable type.

A Character-backed entity detail page:

- identifies the entity as a playable Character;
- shows authoritative Character/WorldCharacter presentation;
- keeps normal relationship navigation;
- does not expose generic identity deletion/editing;
- links to the editable Character route only when the current user owns that Character.

Other users do not receive access to another player's editable Character route merely because they can see the shared World entity.

The WorldCharacter overview links back to its WorldEntity/relationships when the graph representation exists.

The same overview owns the Character-facing lifecycle controls:

- each accessible Campaign participation provides `Leave Campaign` with an explicit confirmation that Campaign membership and World identity remain;
- the WorldCharacter section provides `Leave World` with an explicit confirmation of the NPC snapshot behavior;
- `Leave World` is unavailable until all Campaign participation has been resolved;
- successful World removal returns the user to the surviving portable Character rather than a now-invalid WorldCharacter route.

## Verification

The existing `/dev/character-copy-migration` scenario remains the graph continuity scenario for #117. It verifies:

- copy creates a separate Character-backed entity;
- source relationships are not copied;
- Campaign participation still blocks migration;
- migration preserves the WorldCharacter ID;
- the source Character entity becomes an independent Person/NPC;
- source relationships remain attached to that NPC;
- the target World receives a fresh Character-backed entity.

The existing `/dev/campaign-characters` scenario is extended for #124. It verifies that a Character owner can remove their own Campaign participation while Campaign membership, portable identity, WorldCharacter identity, and other Campaign participation remain intact.

Unit coverage verifies that another normal Player cannot remove someone else's CampaignCharacter, managers retain removal authority, Character ownership without Campaign access is insufficient, WorldCharacter removal is blocked while Campaign participation remains, and successful WorldCharacter removal detaches the source entity into an NPC while preserving relationships.
