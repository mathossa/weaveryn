# Prisma pre-0.1.0 baseline audit

Issue: #140

This document records the migration-history audit performed before replacing the
disposable pre-release migration chain with the single audited `0.1.0` baseline.

## Boundary

This squash is allowed only because Weaveryn has not yet crossed the first stable
persistent-deployment boundary. The existing development database is not a target of
the baseline and must not be reset or repurposed while validating it.

The baseline is for a **completely empty PostgreSQL database**. After `v0.1.0`, normal
forward-only production migration history must be preserved.

## Audited migration inventory

| Historical migration | Classification for the baseline |
| --- | --- |
| `20260814000823_init` | Structural DDL represented by the final schema. Fold into baseline. |
| `20260814101500_world_owner_set_null` | Final nullable World owner + `SET NULL` FK behavior. Fold final state into baseline. |
| `20260814211500_world_main_timeline` | Table/index/FK are structural. Historical `INSERT ... SELECT` main-timeline seed is a development-era backfill and is omitted for an empty baseline. |
| `20260815070000_campaign_foundation` | Structural DDL plus database-only `Campaign_active_context_check`; preserve the CHECK manually. |
| `20260815120000_campaign_memberships` | Structural DDL represented by final schema. |
| `20260815120000_character_world_character_foundation` | Structural DDL represented by final schema. |
| `20260815170000_world_entities` | Structural DDL represented by final schema. |
| `20260815190000_campaign_characters` | Structural DDL represented by final schema. |
| `20260816014500_better_auth_account_lifecycle` | Structural auth tables/columns/indexes/FKs represented by final schema. |
| `20260816185000_required_username` | Final `User.username NOT NULL` state is represented directly in the baseline; historical ALTER is unnecessary. |
| `20260816213000_instance_admin` | Final `isInstanceAdmin` column/default represented directly in baseline. |
| `20260818003000_world_entity_visibility_and_types` | Structural enum/columns/table/indexes/FKs represented by final schema. |
| `20260818134500_world_entity_image_focus` | Columns/defaults are schema-derived; database-only X/Y range CHECKs must be preserved manually. |
| `20260818231500_entry_preferences` | Structural DDL represented by final schema. |
| `20260819000500_world_character_entity_graph` | Structural columns/index/composite FK plus database-only same-World CHECK must be preserved. Historical `INSERT ... SELECT` graph-node seed is omitted for an empty baseline. |
| `20260819134500_world_character_entity_relation_unique` | Final compound unique index is represented by the final Prisma relation/schema; fold final state directly into baseline. |
| `20260820001500_world_character_entity_continuity` | Column/index/FK are final structural state. Historical `UPDATE ... FROM` provenance backfill is omitted for an empty baseline. |
| `20260820002500_world_character_continuity_index` | Confirms provenance is intentionally non-unique. Baseline creates only the final non-unique `[worldId, originCharacterId]` index. |
| `20260820010000_membership_invitations` | Structural DDL plus database-only invitation target/role CHECK; preserve manually. |
| `20260821020000_world_events_and_reckonings` | Structural DDL plus four database-only WorldEvent consistency CHECKs; preserve manually. |
| `20260823011828_living_world_campaign_context` | Structural enum/columns/index/FK represented by final schema. |
| `20260824113000_campaign_archived_world_snapshot` | Final nullable JSON column represented directly in baseline. |

## Historical data statements deliberately omitted

The following statements existed only to transform already-populated disposable
development databases and have no purpose when installing onto an empty database:

1. `20260814211500_world_main_timeline`
   - inserted a deterministic `Main` timeline for Worlds that already existed.
2. `20260819000500_world_character_entity_graph`
   - inserted deterministic Character-backed WorldEntity rows for WorldCharacters that
     already existed.
3. `20260820001500_world_character_entity_continuity`
   - backfilled `WorldEntity.originCharacterId` from existing WorldCharacters.

No production/user data migration is being discarded: the baseline starts from an
empty database before the first stable release.

## Database-only structural SQL that must survive

Prisma schema syntax does not represent these CHECK constraints, so the baseline owns
them explicitly.

### Campaign

`Campaign_active_context_check`

An ACTIVE Campaign must have:

- `worldId`;
- `timelineId`;
- `currentWorldPosition`;
- `currentWorldDateLabel`.

### WorldEntity

`WorldEntity_worldCharacter_same_world_check`

The composite WorldCharacter relation is either fully null or fully populated, and
`worldCharacterWorldId` must equal the entity's own `worldId`.

`WorldEntity_image_focus_x_check`

- `imageFocusX BETWEEN 0 AND 100`.

`WorldEntity_image_focus_y_check`

- `imageFocusY BETWEEN 0 AND 100`.

### MembershipInvitation

`MembershipInvitation_target_role_check`

A `WORLD` invitation has only World target/role fields; a `CAMPAIGN` invitation has
only Campaign target/role fields.

### WorldEvent

- `WorldEvent_end_not_before_start_check`
- `WorldEvent_start_reckoning_pair_check`
- `WorldEvent_end_reckoning_pair_check`
- `WorldEvent_end_date_pair_check`

Together these ensure duration ordering and that optional reckoning/end-date fields
are populated as coherent pairs.

## Custom indexes / triggers

The audit found no application trigger that must be carried forward.

The continuity migration briefly removed an obsolete uniqueness assumption and kept
`WorldEntity_worldId_originCharacterId_idx` non-unique. The final Prisma schema
already represents that non-unique index and the baseline creates only the final
state.

All other final indexes/unique indexes in the audited history are represented by the
current `prisma/schema.prisma` and are created directly in the baseline.

## Clean-install verification gate

Before #140 can merge, validate the new baseline against a disposable, empty
PostgreSQL database. At minimum:

```bash
npx prisma migrate deploy
npx prisma validate
npx prisma generate
npm run test:integration
npm run validate
npm run test:e2e
```

Also run the production/container checks already defined by CI and explicitly inspect
PostgreSQL metadata to confirm every database-only CHECK listed above exists after
applying only the new baseline.

The existing development database must remain untouched throughout this validation.
