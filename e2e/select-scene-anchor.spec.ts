import { expect, test, type Page } from '@playwright/test'
import {
  SELECT_SCENE_HEIGHT,
  SELECT_SCENE_WIDTH,
  calculateSelectSceneTransform,
} from '../src/app/select/_lib/select-scene-transform'
import { registerAndSignIn } from './support/browser'
import {
  cleanupE2EFixture,
  createE2EPrismaClient,
} from './support/database'
import {
  assertE2EEnvironment,
  createE2EFixture,
} from './support/environment'
import { E2EProductionServer } from './support/server'

const baseEnvironment = assertE2EEnvironment()
const sceneRunId = `scene${baseEnvironment.runId}`.slice(0, 16)
const environment = {
  ...baseEnvironment,
  runId: sceneRunId,
  marker: `[e2e:${sceneRunId}]`,
}
const fixture = createE2EFixture(environment)
const prisma = createE2EPrismaClient(environment)
const server = new E2EProductionServer()

async function readSceneGeometry(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(
      "section[aria-label='Choose how to enter Weaveryn']",
    )
    const backgroundScene = document.querySelector<HTMLElement>(
      '[data-select-background-scene]',
    )
    const heroScene = document.querySelector<HTMLElement>(
      '[data-select-hero-scene]',
    )
    const hero = document.querySelector<HTMLElement>(
      '[data-select-hero-artwork]',
    )
    if (!stage || !backgroundScene || !heroScene || !hero) return null

    const stageRect = stage.getBoundingClientRect()
    const backgroundRect = backgroundScene.getBoundingClientRect()
    const heroSceneRect = heroScene.getBoundingClientRect()
    const heroRect = hero.getBoundingClientRect()

    return {
      stage: {
        left: stageRect.left,
        top: stageRect.top,
        width: stageRect.width,
        height: stageRect.height,
      },
      background: {
        left: backgroundRect.left,
        top: backgroundRect.top,
        width: backgroundRect.width,
        height: backgroundRect.height,
      },
      heroScene: {
        left: heroSceneRect.left,
        top: heroSceneRect.top,
        width: heroSceneRect.width,
        height: heroSceneRect.height,
      },
      hero: {
        left: heroRect.left,
        bottom: heroRect.bottom,
        width: heroRect.width,
      },
      footX: Number(hero.dataset.footX),
      footY: Number(hero.dataset.footY),
    }
  })
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await cleanupE2EFixture(prisma, fixture)
  await server.start()
})

test.afterAll(async () => {
  await server.stop()
  try {
    const cleanup = await cleanupE2EFixture(prisma, fixture)
    expect(cleanup.retained).toEqual([])
  } finally {
    await prisma.$disconnect()
  }
})

test('anchors /select Character feet to the background scene', async ({
  browser,
}) => {
  const { context, page } = await registerAndSignIn(
    browser,
    server.baseURL,
    fixture.users.owner,
  )

  try {
    await page.goto('/select/create-character')
    await page
      .getByLabel('Name', { exact: true })
      .fill(fixture.character.name)
    await page.getByRole('button', { name: 'Create Character' }).click()
    await page
      .getByRole('button', { name: 'Keep character for later' })
      .click()
    await page.waitForURL('**/select')

    const viewports = [
      { width: 820, height: 1180 },
      { width: 1200, height: 900 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await expect(page.locator('[data-select-hero-artwork]')).toBeVisible()

      await expect
        .poll(async () => {
          const geometry = await readSceneGeometry(page)
          if (!geometry) return Number.POSITIVE_INFINITY

          const transform = calculateSelectSceneTransform(
            geometry.stage.width,
            geometry.stage.height,
          )
          const expectedSceneLeft = geometry.stage.left + transform.offsetX
          const expectedSceneTop = geometry.stage.top + transform.offsetY
          const expectedSceneWidth = SELECT_SCENE_WIDTH * transform.scale
          const expectedSceneHeight = SELECT_SCENE_HEIGHT * transform.scale
          const actualFootX = geometry.hero.left + geometry.hero.width / 2
          const actualFootY = geometry.hero.bottom
          const expectedFootX =
            expectedSceneLeft + geometry.footX * transform.scale
          const expectedFootY =
            expectedSceneTop + geometry.footY * transform.scale

          return Math.max(
            Math.abs(geometry.background.left - expectedSceneLeft),
            Math.abs(geometry.background.top - expectedSceneTop),
            Math.abs(geometry.background.width - expectedSceneWidth),
            Math.abs(geometry.background.height - expectedSceneHeight),
            Math.abs(geometry.heroScene.left - geometry.background.left),
            Math.abs(geometry.heroScene.top - geometry.background.top),
            Math.abs(geometry.heroScene.width - geometry.background.width),
            Math.abs(geometry.heroScene.height - geometry.background.height),
            Math.abs(actualFootX - expectedFootX),
            Math.abs(actualFootY - expectedFootY),
          )
        })
        .toBeLessThanOrEqual(1.5)
    }

    await page.setViewportSize({ width: 760, height: 900 })
    await expect(page.locator('[data-select-hero-artwork]')).toBeHidden()
  } finally {
    await context.close()
  }
})
