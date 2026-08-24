import {
  expect,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test'
import type { E2EUserFixture } from './environment'

export interface SignedInBrowser {
  context: BrowserContext
  page: Page
}

export interface JsonApiResult<T> {
  response: APIResponse
  body: T
}

export async function requestJson<T>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  expectedStatus: number,
  data?: unknown,
): Promise<JsonApiResult<T>> {
  const response = await request.fetch(path, {
    method,
    ...(data === undefined ? {} : { data }),
  })
  const text = await response.text()
  expect(
    response.status(),
    `${method} ${path} returned ${response.status()}\n${text}`,
  ).toBe(expectedStatus)

  let body: T
  try {
    body = (text ? JSON.parse(text) : null) as T
  } catch {
    throw new Error(`${method} ${path} did not return JSON:\n${text}`)
  }
  return { response, body }
}

export async function registerAndSignIn(
  browser: Browser,
  baseURL: string,
  user: E2EUserFixture,
): Promise<SignedInBrowser> {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Display name').fill(user.displayName)
  await page.getByLabel('Username').fill(user.username)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByLabel('Confirm password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).last().click()
  await expect(
    page.getByText('Account created. Sign in to enter Weaveryn.'),
  ).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Enter Weaveryn' }).click()
  await page.waitForURL('**/select')
  return { context, page }
}

export async function registerThroughApi(
  browser: Browser,
  baseURL: string,
  user: E2EUserFixture,
) {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' })
  const signUp = await context.request.post('/api/auth/sign-up/email', {
    data: {
      name: user.displayName,
      username: user.username,
      email: user.email,
      password: user.password,
    },
  })
  expect(
    signUp.ok(),
    `Supporting-user sign-up failed: ${signUp.status()} ${await signUp.text()}`,
  ).toBe(true)
  return context
}

export async function signInThroughApi(
  context: BrowserContext,
  user: E2EUserFixture,
) {
  async function attempt() {
    return context.request.post('/api/auth/sign-in/email', {
      data: { email: user.email, password: user.password },
    })
  }

  let response = await attempt()
  if (response.status() === 429) {
    const retryAfter = Number(response.headers()['x-retry-after'])
    expect(
      Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 10,
    ).toBe(true)
    await new Promise((resolve) =>
      setTimeout(resolve, retryAfter * 1_000 + 100),
    )
    response = await attempt()
  }
  expect(
    response.ok(),
    `Supporting-user sign-in failed: ${response.status()} ${await response.text()}`,
  ).toBe(true)
}

export async function signIn(
  browser: Browser,
  baseURL: string,
  user: E2EUserFixture,
): Promise<SignedInBrowser> {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Enter Weaveryn' }).click()
  await page.waitForURL('**/select')
  return { context, page }
}

export async function signOut(page: Page) {
  await page
    .getByRole('button', {
      name: /Primary Weaver|World Member|Assistant GM|Outsider/,
    })
    .click()
  const accountMenu = page.getByRole('dialog', { name: 'Account menu' })
  await expect(accountMenu).toBeVisible()
  await accountMenu.getByRole('button', { name: 'Log out' }).click()
  await page.waitForURL('**/login')
}

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

export async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1)
}

export async function expectInsideViewport(page: Page, selector: string) {
  const result = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })
  expect(result.left).toBeGreaterThanOrEqual(-1)
  expect(result.top).toBeGreaterThanOrEqual(-1)
  expect(result.right).toBeLessThanOrEqual(result.width + 1)
  expect(result.bottom).toBeLessThanOrEqual(result.height + 1)
}
