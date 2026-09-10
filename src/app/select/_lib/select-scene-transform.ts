export const SELECT_SCENE_WIDTH = 2560
export const SELECT_SCENE_HEIGHT = 1440
export const SELECT_SCENE_POSITION_X = 0.5
export const SELECT_SCENE_POSITION_Y = 0.58

// The selected Character is positioned by the point where its feet meet the
// landscape in the 2560×1440 launcher artwork. Keep this in scene coordinates;
// viewport-specific offsets would reintroduce the drift this model prevents.
export const SELECT_HERO_FOOT_X = 700
export const SELECT_HERO_FOOT_Y = 1334

export interface SelectSceneTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export function calculateSelectSceneTransform(
  viewportWidth: number,
  viewportHeight: number,
): SelectSceneTransform {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 }
  }

  const scale = Math.max(
    viewportWidth / SELECT_SCENE_WIDTH,
    viewportHeight / SELECT_SCENE_HEIGHT,
  )
  const renderedWidth = SELECT_SCENE_WIDTH * scale
  const renderedHeight = SELECT_SCENE_HEIGHT * scale

  return {
    scale,
    offsetX: (viewportWidth - renderedWidth) * SELECT_SCENE_POSITION_X,
    offsetY: (viewportHeight - renderedHeight) * SELECT_SCENE_POSITION_Y,
  }
}
