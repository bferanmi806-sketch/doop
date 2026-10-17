import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'
import type { Browser, Page } from 'puppeteer-core'
import { findBrowserPath, getBrowser } from '../server/screenshot'
import type { Canvas, ElementComment, Frame } from '../shared/types'

declare global {
  interface Window {
    drawingHarness: {
      seed: (canvas: Canvas) => void
      comments: (comments: ElementComment[]) => void
      viewport: (viewport: { x: number; y: number; zoom: number }) => void
      page: (id: string) => void
      state: () => { frames: Frame[]; tool: string }
      undo: () => Promise<void>
      redo: () => Promise<void>
    }
  }
}

describe.skipIf(!findBrowserPath())('drawing on the canvas', { timeout: 30_000 }, () => {
  let vite: ViteDevServer
  let browser: Browser
  let page: Page
  let saved: Frame[] = []
  let nextId = 0
  const errors: string[] = []

  beforeAll(async () => {
    vite = await createServer({ server: { port: 0 }, logLevel: 'error' })
    await vite.listen()
    browser = await getBrowser()
    page = await browser.newPage()
    page.on('pageerror', (err) => errors.push(String(err)))
    await page.setRequestInterception(true)
    page.on('request', async (req) => {
      const path = new URL(req.url()).pathname
      if (path === '/api/canvases/c/frames' && req.method() === 'POST') {
        const frame = {
          ...JSON.parse(req.postData()!),
          id: `drawn-${++nextId}`,
          canvasId: 'c',
          createdAt: 0,
          updatedAt: 0,
        }
        saved.push(frame)
        await req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(frame) })
      } else if (path.startsWith('/api/frames/') && req.method() === 'PATCH') {
        const id = path.split('/').at(-1)
        const frame = { ...saved.find((f) => f.id === id), ...JSON.parse(req.postData()!) }
        saved = saved.map((f) => (f.id === id ? frame : f))
        await req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(frame) })
      } else if (path.startsWith('/api/frames/') && req.method() === 'DELETE') {
        saved = saved.filter((f) => f.id !== path.split('/').at(-1))
        await req.respond({ status: 200, contentType: 'application/json', body: '{}' })
      } else await req.continue()
    })
  }, 60_000)

  beforeEach(async () => {
    saved = []
    nextId = 0
    await page.setViewport({ width: 1200, height: 800 })
    await page.goto(`${vite.resolvedUrls!.local[0]}tests/fixtures/drawing.html`)
    await page.waitForFunction(() => !!window.drawingHarness)
    await page.evaluate(() =>
      window.drawingHarness.seed({
        id: 'c',
        name: 'Draw',
        frames: [],
        pages: [
          { id: 'first', name: 'Main' },
          { id: 'second', name: 'Other' },
        ],
        createdAt: 0,
        updatedAt: 0,
      }),
    )
    await page.waitForSelector('[aria-label="Canvas tools"]')
    await page.evaluate(() => window.drawingHarness.viewport({ x: 40, y: 20, zoom: 2 }))
  })

  afterAll(async () => {
    await page?.close()
    await browser?.close()
    await vite?.close()
    expect(errors).toEqual([])
  })

  async function drag(from: [number, number], to: [number, number]) {
    await page.mouse.move(...from)
    await page.mouse.down()
    await page.mouse.move(...to, { steps: 5 })
    await page.mouse.up()
  }
  async function waitForFrames(count: number) {
    await page.waitForFunction((n) => window.drawingHarness.state().frames.length === n, {}, count)
    return page.evaluate(() => window.drawingHarness.state().frames)
  }

  it('draws a frame with reverse drag at a panned/zoomed viewport, then adds editable shapes inside it', async () => {
    await page.click('[aria-label="Frame"]')
    await drag([700, 500], [200, 200])
    const [frame] = await waitForFrames(1)
    expect(frame).toMatchObject({ name: 'Frame', x: 80, y: 70, width: 250, height: 150, pageId: 'first' })
    await page.keyboard.press('r')
    await drag([240, 240], [400, 320])
    await page.waitForFunction(() =>
      window.drawingHarness.state().frames[0]?.html.includes('data-doop-drawing="rectangle"'),
    )
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ x: 80, y: 70, width: 250, height: 150 })
    await page.keyboard.press('o')
    await drag([460, 240], [540, 280])
    await page.waitForFunction(() =>
      window.drawingHarness.state().frames[0]?.html.includes('data-doop-drawing="circle"'),
    )
    const iframe = await (await page.$('iframe'))!.contentFrame()
    await iframe!.waitForSelector('[data-doop-drawing="circle"]')
    expect(
      await iframe!.$eval('[data-doop-drawing="circle"]', (el) => ({
        width: getComputedStyle(el).width,
        height: getComputedStyle(el).height,
      })),
    ).toEqual({ width: '40px', height: '40px' })
    await page.evaluate(() => window.drawingHarness.undo())
    expect(saved[0]!.html).not.toContain('data-doop-drawing="circle"')
    expect(saved[0]!.html).toContain('data-doop-drawing="rectangle"')
    await page.evaluate(() => window.drawingHarness.redo())
    expect(saved[0]!.html).toContain('data-doop-drawing="circle"')
  })

  it('creates standalone transparent circles, constrained rectangles and SVG paths', async () => {
    await page.click('[aria-label="Circle"]')
    await drag([220, 200], [320, 260])
    expect((await waitForFrames(1))[0]).toMatchObject({ width: 50, height: 50 })
    expect(await page.$eval('iframe', (el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    await page.keyboard.press('r')
    await page.keyboard.down('Shift')
    await drag([450, 200], [600, 270])
    await page.keyboard.up('Shift')
    expect((await waitForFrames(2))[1]).toMatchObject({ width: 75, height: 75 })
    await page.click('[aria-label="Vector path"]')
    await page.mouse.click(220, 420)
    await page.mouse.click(320, 380)
    await page.mouse.click(420, 450)
    await page.keyboard.press('Enter')
    expect((await waitForFrames(3))[2]!.html).toContain('M 2 22 L 52 2 L 102 37')
    await page.keyboard.press('p')
    await page.mouse.click(600, 420)
    await page.mouse.click(700, 420)
    await page.mouse.click(700, 520)
    await page.mouse.click(600, 420)
    expect((await waitForFrames(4))[3]!.html).toContain(' Z"')
    await page.keyboard.press('p')
    await page.mouse.click(800, 420)
    await page.mouse.click(900, 500, { count: 2, delay: 60 })
    expect((await waitForFrames(5))[4]!.html).toContain('M 2 2 L 52 42')
    await page.screenshot({ path: '/tmp/doop-drawing-desktop.png' })
  })

  it('types literal multiline text without triggering shortcuts, and cancels empty or escaped drafts', async () => {
    await page.keyboard.press('t')
    await page.mouse.click(220, 200)
    await page.waitForSelector('textarea[data-drawing-input]')
    await page.keyboard.type('<b>Rectangle & circle</b>')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Second line')
    expect(await page.evaluate(() => window.drawingHarness.state().tool)).toBe('text')
    await page.keyboard.down('Control')
    await page.keyboard.press('Enter')
    await page.keyboard.up('Control')
    const [frame] = await waitForFrames(1)
    expect(frame!.html).toContain('&lt;b&gt;Rectangle &amp; circle&lt;/b&gt;\nSecond line')
    await page.keyboard.press('t')
    await page.mouse.click(800, 400)
    await page.keyboard.type('discard me')
    await page.keyboard.press('Escape')
    expect(await page.$('textarea[data-drawing-input]')).toBeNull()
    expect(saved).toHaveLength(1)
    await page.keyboard.press('t')
    await page.mouse.click(800, 400)
    await page.mouse.click(800, 500)
    expect(await page.$('textarea[data-drawing-input]')).toBeNull()
    expect(saved).toHaveLength(1)
  })

  it('cancels interrupted gestures and lets Space pan without drawing', async () => {
    await page.keyboard.press('r')
    await page.mouse.move(220, 200)
    await page.mouse.down()
    await page.mouse.move(320, 300)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.keyboard.press('r')
    await page.mouse.down()
    await page.mouse.move(420, 400)
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })))
    await page.mouse.up()
    await page.keyboard.down('Space')
    await drag([220, 200], [320, 300])
    await page.keyboard.up('Space')
    expect(saved).toHaveLength(0)
    await page.mouse.down()
    await page.mouse.move(420, 400)
    await page.evaluate(() => window.drawingHarness.page('second'))
    await page.mouse.up()
    expect(saved).toHaveLength(0)
    await page.mouse.click(400, 300)
    expect((await waitForFrames(1))[0]!.pageId).toBe('second')
  })

  it('leaves editing keys in unrelated fields alone while a vector path is unfinished', async () => {
    await page.click('[aria-label="Vector path"]')
    await page.mouse.click(220, 200)
    await page.mouse.click(320, 280)
    for (const kind of ['input', 'textarea', 'contenteditable']) {
      await page.evaluate((kind) => {
        document.querySelector('#outside-field')?.remove()
        const field = document.createElement(kind === 'contenteditable' ? 'div' : kind)
        field.id = 'outside-field'
        field.style.cssText = 'position:fixed;top:0;left:0;width:200px;height:30px;z-index:100;background:white;'
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = 'AB'
        else {
          field.contentEditable = 'true'
          field.textContent = 'AB'
        }
        field.addEventListener('keydown', (event) => {
          field.dataset.keys = `${field.dataset.keys ?? ''}${event.key},`
        })
        document.body.append(field)
        field.focus()
      }, kind)
      await page.keyboard.press('End')
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Home')
      await page.keyboard.press('Delete')
      expect(
        await page.$eval('#outside-field', (field) =>
          field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.value : field.textContent,
        ),
      ).toBe('')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
      expect(await page.$eval('#outside-field', (field) => field.getAttribute('data-keys'))).toContain(
        'Backspace,Home,Delete,Enter,Escape,',
      )
      expect(await page.evaluate(() => window.drawingHarness.state().tool)).toBe('path')
      expect(saved).toHaveLength(0)
    }
    await page.evaluate(() => document.querySelector('#outside-field')?.remove())
    await page.keyboard.press('Enter')
    const [path] = await waitForFrames(1)
    expect(path!.html).toContain('M 2 2 L 52 42')
  })

  it('preserves canvas comments and lets comment pins interrupt drawing without creating a shape', async () => {
    await page.keyboard.press('c')
    await page.mouse.click(220, 200)
    await page.waitForSelector('textarea[placeholder="Leave a comment here…"]')
    expect(await page.$eval('.stage', (el) => getComputedStyle(el).cursor)).toContain('url(')
    await page.keyboard.press('Escape')
    await page.evaluate(() =>
      window.drawingHarness.comments([
        {
          id: 'comment',
          canvasId: 'c',
          pageId: 'first',
          x: 200,
          y: 160,
          from: 'Alice',
          text: 'Keep this',
          selector: '',
          snippet: '',
          at: 0,
        },
      ]),
    )
    await page.click('[aria-label="Rectangle"]')
    await page.click('[title="Alice: Keep this"]')
    const reply = 'textarea[placeholder="Reply… (@doop to ask the agent)"]'
    await page.waitForSelector(reply)
    await page.click(reply)
    await page.keyboard.type('Reply text')
    expect(await page.$eval(reply, (el) => el.value)).toBe('Reply text')
    expect(await page.$eval(reply, (el) => getComputedStyle(el).cursor)).not.toBe('crosshair')
    expect(saved).toHaveLength(0)
    await page.click('[aria-label="Vector path"]')
    await page.mouse.click(800, 200)
    await page.mouse.click(900, 220)
    await page.click('[title="Alice: Keep this"]')
    await page.waitForSelector(reply)
    await page.click(reply)
    await page.keyboard.press('Enter')
    expect(await page.$eval('[data-drawing-hint]', (el) => el.textContent)).not.toContain('Finish path')
    expect(saved).toHaveLength(0)
  })

  it('keeps all tools reachable on phones, clear of zoom, and accepts touch drawing', async () => {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    // Changing mobile emulation reloads the page in Chromium.
    await page.waitForFunction(() => !!window.drawingHarness)
    await page.evaluate(() =>
      window.drawingHarness.seed({
        id: 'c',
        name: 'Draw',
        frames: [],
        pages: [{ id: 'first', name: 'Main' }],
        createdAt: 0,
        updatedAt: 0,
      }),
    )
    await page.waitForSelector('[aria-label="Canvas tools"]')
    expect(await page.evaluate(() => window.innerWidth)).toBe(390)
    const boxes = await page.evaluate(() => {
      const tools = document.querySelector('[aria-label="Canvas tools"]')!.getBoundingClientRect()
      const zoom = document.querySelector('[aria-label="Zoom level"]')!.getBoundingClientRect()
      return { left: tools.left, right: tools.right, top: tools.top, zoomBottom: zoom.bottom }
    })
    expect(boxes.left).toBeGreaterThanOrEqual(0)
    expect(boxes.right).toBeLessThanOrEqual(390)
    expect(boxes.zoomBottom).toBeLessThan(boxes.top)
    await page.click('[aria-label="Rectangle"]')
    const hintClear = await page.evaluate(
      () =>
        document.querySelector('[aria-label="Zoom level"]')!.getBoundingClientRect().bottom <
        document.querySelector('[data-drawing-hint]')!.getBoundingClientRect().top,
    )
    expect(hintClear).toBe(true)
    await page.screenshot({ path: '/tmp/doop-drawing-mobile-tools.png' })
    await page.touchscreen.tap(180, 250)
    expect((await waitForFrames(1))[0]!.name).toBe('Rectangle')
    await page.screenshot({ path: '/tmp/doop-drawing-mobile.png' })
  })
})
