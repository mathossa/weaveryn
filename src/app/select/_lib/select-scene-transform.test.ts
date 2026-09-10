import { describe, expect, it } from 'vitest'
import {
  SELECT_HERO_FOOT_X,
  SELECT_HERO_FOOT_Y,
  SELECT_SCENE_HEIGHT,
  SELECT_SCENE_WIDTH,
  calculateSelectSceneTransform,
} from './select-scene-transform'

describe('calculateSelectSceneTransform', () => {
  it('preserves the 2560x1440 reference scene without crop', () => {
    expect(calculateSelectSceneTransform(2560, 1440)).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('uses cover scaling and horizontal crop for 1200x900', () => {
    const transform = calculateSelectSceneTransform(1200, 900)

    expect(transform.scale).toBeCloseTo(0.625)
    expect(transform.offsetX).toBeCloseTo(-200)
    expect(transform.offsetY).toBeCloseTo(0)
  })

  it('uses cover scaling and horizontal crop for a tall 820x1180 viewport', () => {
    const transform = calculateSelectSceneTransform(820, 1180)

    expect(transform.scale).toBeCloseTo(1180 / 1440)
    expect(transform.offsetX).toBeCloseTo(
      (820 - SELECT_SCENE_WIDTH * transform.scale) * 0.5,
    )
    expect(transform.offsetY).toBeCloseTo(0)
  })

  it('keeps the foot anchor in scene coordinates', () => {
    expect(SELECT_HERO_FOOT_X).toBe(700)
    expect(SELECT_HERO_FOOT_Y).toBe(1334)
    expect(SELECT_HERO_FOOT_X).toBeLessThan(SELECT_SCENE_WIDTH)
    expect(SELECT_HERO_FOOT_Y).toBeLessThan(SELECT_SCENE_HEIGHT)
  })
})
