import { describe, expect, it } from 'vitest'
import { resolveEntityFallbackArtwork, uiAssets } from './ui-assets'

describe('resolveEntityFallbackArtwork', () => {
  it.each([
    ['person', uiAssets.entityFallbacks.person.src],
    ['location', uiAssets.entityFallbacks.location.src],
    ['organization', uiAssets.entityFallbacks.organization.src],
    ['item', uiAssets.entityFallbacks.item.src],
    ['event', uiAssets.entityFallbacks.event.src],
    ['deity', uiAssets.entityFallbacks.deity.src],
    ['creature', uiAssets.entityFallbacks.creature.src],
    ['quest', uiAssets.entityFallbacks.quest.src],
  ])('resolves canonical %s artwork', (entityType, expected) => {
    expect(resolveEntityFallbackArtwork(entityType)).toBe(expected)
  })

  it.each([
    ['npc', uiAssets.entityFallbacks.person.src],
    ['Person / NPC', uiAssets.entityFallbacks.person.src],
    ['faction', uiAssets.entityFallbacks.organization.src],
    ['Faction / Organization', uiAssets.entityFallbacks.organization.src],
    ['story object', uiAssets.entityFallbacks.quest.src],
    ['Quest / story object', uiAssets.entityFallbacks.quest.src],
  ])('resolves supported display label alias %s', (entityType, expected) => {
    expect(resolveEntityFallbackArtwork(entityType)).toBe(expected)
  })

  it('ignores case and surrounding whitespace', () => {
    expect(resolveEntityFallbackArtwork('  PERSON / npc  ')).toBe(
      uiAssets.entityFallbacks.person.src,
    )
    expect(resolveEntityFallbackArtwork('  FaCtIoN  ')).toBe(
      uiAssets.entityFallbacks.organization.src,
    )
  })

  it('normalizes harmless separator and spacing differences', () => {
    expect(resolveEntityFallbackArtwork('person_npc')).toBe(
      uiAssets.entityFallbacks.person.src,
    )
    expect(resolveEntityFallbackArtwork('faction-organization')).toBe(
      uiAssets.entityFallbacks.organization.src,
    )
    expect(resolveEntityFallbackArtwork('quest_story-object')).toBe(
      uiAssets.entityFallbacks.quest.src,
    )
  })

  it('keeps Character on the existing Character fallback', () => {
    expect(resolveEntityFallbackArtwork('Character')).toBe(
      uiAssets.fallbacks.character,
    )
  })

  it.each(['', '   ', 'Astral Beacon', 'Custom Lore'])(
    'uses Generic artwork for blank or unknown type %j',
    (entityType) => {
      expect(resolveEntityFallbackArtwork(entityType)).toBe(
        uiAssets.entityFallbacks.generic.src,
      )
    },
  )

  it.each(['npc guild', 'location history', 'questmaster', 'creaturely'])(
    'does not fuzzy-match unrelated custom type %s',
    (entityType) => {
      expect(resolveEntityFallbackArtwork(entityType)).toBe(
        uiAssets.entityFallbacks.generic.src,
      )
    },
  )
})

describe('entity artwork choices', () => {
  it.each([
    'person',
    'location',
    'organization',
    'item',
    'event',
    'deity',
    'creature',
    'quest',
    'Astral Beacon',
  ])('exposes six creator-selectable choices for %s', (entityType) => {
    const choices = uiAssets.resolveEntityArtworkChoices(entityType)

    expect(choices).toHaveLength(6)
    expect(uiAssets.resolveEntityFallbackArtwork(entityType)).toBe(
      choices[0]?.src,
    )
    expect(
      choices.every((choice) => uiAssets.isEntityArtworkSource(choice.src)),
    ).toBe(true)
  })

  it('keeps Character on its existing fallback without entity artwork choices', () => {
    expect(uiAssets.resolveEntityArtworkChoices('Character')).toEqual([])
    expect(uiAssets.resolveEntityFallbackArtwork('Character')).toBe(
      uiAssets.fallbacks.character,
    )
  })

  it('does not treat arbitrary image URLs as built-in choices', () => {
    expect(
      uiAssets.isEntityArtworkSource('https://example.com/portrait.webp'),
    ).toBe(false)
  })
})
