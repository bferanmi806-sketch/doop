import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'
import type { Browser, Page } from 'puppeteer-core'
import { findBrowserPath, getBrowser } from '../server/screenshot.ts'

type Rect = { x: number; y: number; width: number; height: number }
declare global {
  interface Window {
    testReady: boolean
    rect: (selector: string) => Promise<Rect>
    viewport: () => Promise<{ innerWidth: number; innerHeight: number; dpr: number }>
    raster: (k: number) => Promise<{ width: number; height: number }>
  }
}

/* The crisp render past 100% canvas zoom is a CSS zoom on the iframe element,
   counter-scaled: the document draws at k× the device pixels while its
   viewport stays the design size. The earlier scheme sized the iframe k× and
   zoomed the document inside, and CSS zoom does not scale viewport units, so
   a 100vh column grew k× and pushed its footer off the clipped bottom for as
   long as the canvas sat past 100%. A real browser is needed: DOM emulators
   have no layout, zoom or pixel density. */
describe.skipIf(!findBrowserPath())('crisp-render zoom', () => {
  let server: ViteDevServer
  let browser: Browser
  let page: Page
  beforeAll(async () => {
    server = await createServer({ server: { port: 0 }, logLevel: 'error' })
    await server.listen()
    browser = await getBrowser()
    page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 })
    await page.goto(`${server.resolvedUrls!.local[0]}tests/fixtures/frameRasterZoom.html`)
    await page.waitForFunction(() => window.testReady, { timeout: 60_000 })
  }, 60_000)
  afterAll(async () => {
    await page?.close()
    await browser?.close()
    await server?.close()
  })

  it('keeps the viewport at design size and multiplies the pixel density', async () => {
    expect(await page.evaluate(() => window.viewport())).toEqual({ innerWidth: 400, innerHeight: 300, dpr: 1 })
    const box = await page.evaluate(() => window.raster(2))
    /* the element's box on the canvas is unchanged: zoom ×2, counter-scaled ×½ */
    expect(box).toEqual({ width: 400, height: 300 })
    expect(await page.evaluate(() => window.viewport())).toEqual({ innerWidth: 400, innerHeight: 300, dpr: 2 })
  })

  it('leaves a 100vh column and its bottom-anchored footer where they were', async () => {
    await page.evaluate(() => window.raster(1))
    const rest = {
      body: await page.evaluate(() => window.rect('body')),
      foot: await page.evaluate(() => window.rect('.foot')),
    }
    expect(rest.body).toEqual({ x: 0, y: 0, width: 400, height: 300 })
    expect(rest.foot.y).toBe(250)

    for (const k of [1.5, 2, 3]) {
      await page.evaluate((k) => window.raster(k), k)
      expect(await page.evaluate(() => window.rect('body'))).toEqual(rest.body)
      expect(await page.evaluate(() => window.rect('.foot'))).toEqual(rest.foot)
    }
    await page.evaluate(() => window.raster(1))
    expect(await page.evaluate(() => window.rect('.foot'))).toEqual(rest.foot)
  })
})
