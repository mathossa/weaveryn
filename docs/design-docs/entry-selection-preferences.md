# Choose Entity entry preferences

## Purpose

Issue #51 uses a small persisted navigation-preference model to support the Vision 2.0 entry experience without moving UI state into Character, WorldCharacter, CampaignCharacter, World, or Campaign domain records.

The canonical game model remains:

```text
Character
  -> WorldCharacter
      -> CampaignCharacter
```

Choose Entity projects those records into entry contexts. A WorldCharacter participating in two accessible Campaigns therefore produces two Character entry cards. A WorldCharacter with no accessible Campaign participation produces one World-level Character entry card.

## EntryPreference

`EntryPreference` is user-specific navigation metadata. It may store:

- a stable `entryKey`;
- the entry kind (`CHARACTER` or `WEAVER`);
- an optional WorldCharacter, Campaign, and/or World reference;
- whether a Character entry is pinned;
- when an entry was last used.

Character entry keys distinguish the same WorldCharacter across Campaigns:

```text
character:<worldCharacterId>:<campaignId>
character:<worldCharacterId>:world
```

Weaver uses one user-specific key:

```text
weaver
```

## Authorization boundary

Entry preferences never grant access.

Before a Character preference is created or updated, the selection service verifies that the WorldCharacter and optional Campaign entry are currently available to that user through the normal backend-authorized selection projection.

Before a Weaver resume target is recorded, the service verifies that the World is currently manageable through the Weaver path. A stored Campaign resume target is additionally limited to Campaign ownership, `GM`, or `ASSISTANT_GM` access in that World.

When stored context is no longer authorized, it is ignored rather than used to bypass current permissions.

## Ordering and resume behavior

The main Choose Entity view orders Character entry cards by:

1. pinned entries;
2. most recently used entries;
3. creation time only as a deterministic fallback for entries that have never been used.

The most recently used Character entry or Weaver entry is visually highlighted as the current resume choice.

Only the first three Character entry cards are shown initially. `More characters` expands the same `/select` page and uses an internally scrolling bounded panel rather than navigating through another selection wizard or creating a long page body.

## Weaver resume

The Weaver entry records the last World selected through the Weaver path and, when applicable, the last manageable Campaign selected from that World. The main Weaver card can therefore resume that context directly while still providing the normal World-switching route when no stored context exists.

## Scope

This model is intentionally limited to entry/navigation preferences. It does not store:

- Character ownership or gameplay state;
- Campaign membership or role;
- World permissions;
- CampaignCharacter mechanics;
- knowledge or visibility rules.

Those remain owned by their existing backend/domain services.

## Verification

Development scenario:

```text
/dev/choose-entity-entry
```

The scenario creates one deterministic WorldCharacter participating in two Campaigns and exercises Campaign-specific entry contexts, per-entry pinning, recent-use tracking, and Weaver World/Campaign resume through the production selection services.
