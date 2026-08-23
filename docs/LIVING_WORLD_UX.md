# Living World UX Direction

## Status and purpose

This document records the shared product and interaction direction for the next
Weaveryn foundations. `VISION_2-0.md` remains authoritative for long-term product
direction. `ARCHITECTURE.md` and `DATA_MODEL.md` remain authoritative for current
implemented domain behavior.

## Product principles

1. **Weaveryn is a fantasy game launcher opening into a living world.** Entry is
   about who the user is entering as, not a sequence of administration screens.
2. **Each major screen answers one primary question.** Select answers “Who am I
   entering as?”, World answers “Where am I and what exists here?”, Campaign Now
   answers “Where are we, what is around us, and what is next?”, Character answers
   “Who am I, what do I know, and what can I do?”, Entity answers “What is this and
   what is it connected to?”, Map answers “Where?”, and Chronicle/Timeline answers
   “What happened and when?”
3. **World home ultimately becomes the Atlas.** Until map foundations exist, it is
   an atmospheric content-first overview. It is not paired with an equally
   important permanent dashboard.
4. **Campaign Now works without Scenes.** A Scene may later add focus, but it is
   never a prerequisite for normal Campaign play.
5. **Preparation enhances play but is never required.** Live play must not depend
   on completing a preparation wizard.
6. **Capture now, enrich later.** A minimal name is enough for initial live capture
   when the existing domain permits the action. Detail and relationships can be
   added later.
7. **Player knowledge and canonical World truth are separate.** Personal Notes,
   Party Chronicle, and Weaver Notes may disagree. Player contributions do not
   silently become canonical or hidden Weaver lore.
8. **Chronicler is a capability, not a top-level role.** A Threadwalker may receive
   one or more explicit capabilities. This never grants hidden lore by implication
   and does not require exactly one Chronicler.
9. **The player phone is a session companion.** It prioritizes Campaign Now,
   Character access, and real quick lookups. It may use limited natural scrolling,
   but should prefer compact views and switching over an endless dashboard.
10. **The Weaver desktop is a live control and worldbuilding workspace.** It uses
    available space for current context and fast actions without becoming a
    generic admin dashboard or permanent global sidebar.
11. **Use fantasy terminology for product concepts and plain language for
    actions.** Weaver, Threadwalker, Threadwatcher, Weave, and Party Chronicle are
    useful concepts. Edit, Delete, Add Person, Change Location, Settings, Members,
    and Permissions remain plain actions.

## Implemented foundation

- `/select` shows at most three pinned/recent Character–World–Campaign entries by
  default. “More Characters” opens a searchable, sortable, World-filterable entry
  browser using the same card language. Manage Characters stays separate.
- Campaign Now is built around Current Location, visible relationships Around You,
  a short player-visible current focus, Weaver information that actually exists,
  Character access, and compact party context.
- `Campaign.currentLocationId` is nullable and references a `WorldEntity` of the
  existing `location` type in the Campaign World.
- `Campaign.currentFocus` is nullable short text for “What’s Next?”. It is not an
  Objective or Quest domain.
- `CampaignMembership.capabilities` is an extensible typed capability set. The
  first capability is `UPDATE_CURRENT_LOCATION`. Only existing Campaign
  membership-management authority may grant or revoke it, and it applies to a
  `PLAYER`/Threadwalker membership.
- Current Location and Around You are projected through existing entity and
  relationship visibility authorization. A referenced hidden location is not
  exposed to a player.
- Campaign context changes are discovered with a small polling/refresh mechanism
  that pauses while the document is hidden and refreshes on focus. It does not
  force navigation and is not the final realtime architecture.
- World home is atmospheric and content-first, with real Campaign, entity, and
  timeline paths. Full Atlas/map behavior remains future work.

## Deliberately deferred

This foundation does not introduce a second major gameplay model. The following
remain separate follow-up work: Sessions, Party Chronicles, Personal/Weaver Notes,
Scenes, Maps, player contributions/suggestions, public World access, Campaign
listing/watchability, Rulesets, Character Sheets, and a full Objective/Quest model.

Suggested follow-up order:

1. Notes and knowledge-source separation, then per-Session Party Chronicle.
2. Player contribution/suggestion workflow and additional Chronicler capabilities.
3. Session state and optional Quick/Prepared Scenes.
4. Map relationships and the World Atlas.
5. Listed/watchable Campaign and public read-only World visibility.
6. Ruleset-specific Character Sheet mechanics.
