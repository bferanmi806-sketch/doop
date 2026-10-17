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
      state: () => { frames: Frame[]; tool: string; selectedElement: { frameId: string; selector: string } | null }
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
    page.setDefaultTimeout(10_000)
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
    await page.mouse.reset()
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

  async function seedFrames(frames: Frame[]) {
    saved = frames
    await page.evaluate(
      (frames) =>
        window.drawingHarness.seed({
          id: 'c',
          name: 'Draw',
          frames,
          pages: [{ id: 'first', name: 'Main' }],
          createdAt: 0,
          updatedAt: 0,
        }),
      frames,
    )
  }

  async function visibleDrawing(title: string, selector = '[data-doop-drawing]') {
    const handle = await page.waitForSelector(`iframe[title="${title}"]`)
    const iframe = (await handle!.contentFrame())!
    await iframe.waitForSelector(selector)
    const readOuter = () =>
      handle!.evaluate((el) => {
        const box = el.getBoundingClientRect()
        const css = getComputedStyle(el)
        return {
          x: box.x,
          y: box.y,
          scale: box.width / Number.parseFloat(css.width),
          raster: 1 / new DOMMatrixReadOnly(css.transform).a,
        }
      })
    let result: { x: number; y: number; width: number; height: number } | null = null
    // Stage changes the outer raster scale before the iframe receives its zoom
    // message. Never combine bounds from opposite sides of that transition.
    await expect
      .poll(
        async () => {
          const outer = await readOuter()
          const inner = await iframe.$eval(selector, (el) => {
            const box = el.getBoundingClientRect()
            return {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
              zoom: Number.parseFloat(getComputedStyle(document.documentElement).zoom),
            }
          })
          const after = await readOuter()
          if (
            Math.abs(outer.raster - inner.zoom) > 0.0001 ||
            (['x', 'y', 'scale', 'raster'] as const).some((key) => outer[key] !== after[key])
          )
            return false
          result = {
            x: outer.x + inner.x * outer.scale,
            y: outer.y + inner.y * outer.scale,
            width: inner.width * outer.scale,
            height: inner.height * outer.scale,
          }
          return true
        },
        { timeout: 10_000 },
      )
      .toBe(true)
    return result!
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

  it('draws smooth Bézier curves by dragging anchors, including a curved closed path', async () => {
    await page.click('[aria-label="Vector path"]')
    await drag([220, 300], [220, 180])
    await drag([520, 300], [520, 420])
    await page.keyboard.press('Enter')
    const [curve] = await waitForFrames(1)
    expect(curve).toMatchObject({ x: 88, y: 73, width: 154, height: 49 })
    expect(curve!.html).toContain('M 2 47 C 2 -13 152 -13 152 47')
    await page.keyboard.press('p')
    await drag([650, 300], [700, 220])
    await page.mouse.click(850, 300)
    await drag([850, 500], [800, 540])
    await drag([650, 300], [620, 230])
    const closed = (await waitForFrames(2))[1]!
    expect(closed.html.match(/ C /g)).toHaveLength(3)
    expect(closed.html).toContain(' Z"')
    await page.screenshot({ path: '/tmp/doop-canvas-curves.png' })
    await page.evaluate(() => window.drawingHarness.undo())
    await waitForFrames(1)
    await page.evaluate(() => window.drawingHarness.redo())
    expect((await waitForFrames(2))[1]!.html).toBe(closed.html)
  })

  it('drags a circle into a frame, into another frame, and back onto the canvas with undo/redo', async () => {
    await page.click('[aria-label="Frame"]')
    await drag([200, 200], [500, 500])
    await waitForFrames(1)
    await page.keyboard.press('f')
    await drag([650, 200], [950, 500])
    await waitForFrames(2)
    await page.keyboard.press('o')
    await drag([250, 570], [330, 650])
    await waitForFrames(3)
    await page.mouse.move(290, 610)
    await page.mouse.down()
    await page.mouse.move(350, 360, { steps: 5 })
    await page.waitForSelector('[data-drawing-drop-target="drawn-1"]')
    await page.screenshot({ path: '/tmp/doop-canvas-drop.png' })
    await page.mouse.up()
    const inserted = await waitForFrames(2)
    expect(inserted[0]!.html).toContain('data-doop-drawing="circle"')
    expect(inserted[0]!.html).toContain('left: 55px; top: 60px; width: 40px; height: 40px;')
    await page.waitForFunction(() => window.drawingHarness.state().selectedElement?.frameId === 'drawn-1')
    await page.waitForSelector('[data-comment-ui] button')
    // Deselect first: a shape can be grabbed directly, not only after a prior pick.
    await page.mouse.click(1100, 550)
    await drag([350, 360], [750, 360])
    await page.waitForFunction(() =>
      window.drawingHarness.state().frames[1]?.html.includes('data-doop-drawing="circle"'),
    )
    expect(saved[0]!.html).not.toContain('data-doop-drawing')
    await page.waitForFunction(() => window.drawingHarness.state().selectedElement?.frameId === 'drawn-2')
    await page.waitForSelector('[data-comment-ui] button')
    await page.mouse.click(1100, 550)
    await drag([750, 360], [500, 600])
    const outside = (await waitForFrames(3))[2]!
    expect(outside).toMatchObject({ x: 210, y: 250, width: 40, height: 40, name: 'Circle' })
    expect(saved[1]!.html).not.toContain('data-doop-drawing')
    for (let i = 0; i < 3; i++) await page.evaluate(() => window.drawingHarness.undo())
    const restored = await waitForFrames(3)
    expect(restored[2]).toMatchObject({ x: 105, y: 255, width: 40, height: 40 })
    expect(restored.slice(0, 2).every((f) => !f.html.includes('data-doop-drawing'))).toBe(true)
    for (let i = 0; i < 3; i++) await page.evaluate(() => window.drawingHarness.redo())
    expect((await waitForFrames(3))[2]).toMatchObject({ x: 210, y: 250, width: 40, height: 40 })
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

  it('cancels moving an element on Escape, pointer cancellation, and page changes', async () => {
    await page.click('[aria-label="Circle"]')
    await drag([250, 300], [330, 380])
    const [original] = await waitForFrames(1)
    for (const reason of ['escape', 'pointer', 'page']) {
      await page.mouse.move(290, 340)
      await page.mouse.down()
      await page.mouse.move(700, 300, { steps: 4 })
      await page.waitForSelector('iframe[title="Moving drawing"]')
      if (reason === 'escape') await page.keyboard.press('Escape')
      else if (reason === 'pointer')
        await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })))
      else await page.evaluate(() => window.drawingHarness.page('second'))
      await page.mouse.up()
      expect(await page.$('iframe[title="Moving drawing"]')).toBeNull()
      expect(saved).toEqual([original])
    }
  })

  it.each(['scale(2)', 'rotate(30deg) scale(1.5)'])(
    'preserves transformed shape geometry across moves: %s',
    async (transform) => {
      const source: Frame = {
        id: 'source',
        updatedBy: 'User',
        canvasId: 'c',
        pageId: 'first',
        name: 'Source',
        x: 20,
        y: 20,
        width: 250,
        height: 250,
        createdAt: 0,
        updatedAt: 0,
        html: `<div id="transformed" data-doop-drawing="rectangle" data-name="Rectangle" style="position:fixed;left:80px;top:80px;width:60px;height:40px;background:red;transform:${transform}"></div>`,
      }
      const destination = { ...source, id: 'destination', name: 'Destination', x: 330, width: 220, html: '' }
      await seedFrames([source, destination])
      const initial = await visibleDrawing('Source')
      let current = initial
      for (const [title, to] of [
        ['Source', [current.x + current.width / 2 + 40, current.y + current.height / 2 + 20]],
        ['Destination', [850, 300]],
        ['Rectangle', [500, 650]],
        ['Source', [300, 300]],
      ] as [string, [number, number]][]) {
        const beforeHtml = saved.map((f) => f.html).join()
        const from: [number, number] = [current.x + current.width / 2, current.y + current.height / 2]
        await page.mouse.move(...from)
        await page.mouse.down()
        await page.mouse.move(...to, { steps: 5 })
        const preview = await visibleDrawing('Moving drawing')
        await page.mouse.up()
        expect(preview.width).toBeCloseTo(initial.width, 1)
        expect(preview.height).toBeCloseTo(initial.height, 1)
        await page
          .waitForFunction(
            (before) =>
              window.drawingHarness
                .state()
                .frames.map((f) => f.html)
                .join() !== before,
            {},
            beforeHtml,
          )
          .catch(async (err: unknown) => {
            const state = await page.evaluate(() => ({
              ...window.drawingHarness.state(),
              editing: document.body.textContent?.includes('Click any text to edit'),
            }))
            throw new Error(`${transform}: moving to ${title}: ${JSON.stringify(state)}`, { cause: err })
          })
        await page.waitForFunction(
          (name) =>
            window.drawingHarness.state().frames.some((f) => f.name === name && f.html.includes('data-doop-drawing')),
          {},
          title,
        )
        const target = await page.waitForSelector(`iframe[title="${title}"]`)
        const iframe = (await target!.contentFrame())!
        const html = saved.find((f) => f.name === title)!.html
        const position = await page.evaluate((html) => {
          const el = new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector<HTMLElement>('[data-doop-drawing]')!
          return { left: el.style.left, top: el.style.top }
        }, html)
        await iframe.waitForFunction(
          (position) => {
            const el = document.querySelector<HTMLElement>('[data-doop-drawing]')
            return el?.style.left === position.left && el.style.top === position.top
          },
          {},
          position,
        )
        current = await visibleDrawing(title)
        expect(current.width).toBeCloseTo(initial.width, 1)
        expect(current.height).toBeCloseTo(initial.height, 1)
        // Regular frame chrome adds a design-pixel border around its iframe.
        expect(Math.abs(current.x + current.width / 2 - to[0])).toBeLessThanOrEqual(2.1)
        expect(Math.abs(current.y + current.height / 2 - to[1])).toBeLessThanOrEqual(2.1)
        expect(await iframe.$eval('[data-doop-drawing]', (el) => getComputedStyle(el).width)).toBe('60px')
      }
      await page.screenshot({ path: '/tmp/doop-transformed-drawing.png' })
    },
  )

  it('measures drawing geometry consistently while iframe rasterization catches up with zoom', async () => {
    await page.click('[aria-label="Frame"]')
    await drag([200, 200], [600, 600])
    await waitForFrames(1)
    await page.click('[aria-label="Circle"]')
    await drag([250, 300], [330, 380])
    await waitForFrames(1)
    await page.waitForFunction(() => window.drawingHarness.state().frames[0]?.html.includes('data-doop-drawing'))
    const initial = await visibleDrawing('Frame')
    const iframe = (await (await page.$('iframe[title="Frame"]'))!.contentFrame())!
    await page.evaluate(() => window.drawingHarness.viewport({ x: 40, y: 20, zoom: 3 }))
    await iframe.waitForFunction(() => document.documentElement.style.zoom === '3')
    // Hold the iframe at its previous zoom to reproduce the interval between
    // the parent's raster update and the iframe applying the matching zoom.
    await iframe.evaluate(() => {
      document.documentElement.style.zoom = '2'
      setTimeout(() => {
        document.documentElement.style.zoom = '3'
      }, 500)
    })
    const zoomed = await visibleDrawing('Frame')
    expect(zoomed.width).toBeCloseTo(initial.width * 1.5, 1)
    expect(zoomed.height).toBeCloseTo(initial.height * 1.5, 1)
  })

  it('grabs the visibly top drawing through stacking contexts instead of reverse DOM order', async () => {
    const source: Frame = {
      id: 'stacked',
      updatedBy: 'User',
      canvasId: 'c',
      pageId: 'first',
      name: 'Stacked',
      x: 20,
      y: 20,
      width: 400,
      height: 300,
      createdAt: 0,
      updatedAt: 0,
      html: `<div style="position:relative;z-index:10"><div id="front" data-doop-drawing="rectangle" style="position:fixed;left:60px;top:60px;width:100px;height:100px;background:red"></div></div>
      <div id="back" data-doop-drawing="rectangle" style="position:fixed;left:60px;top:60px;width:100px;height:100px;background:blue;z-index:5"></div>`,
    }
    await seedFrames([source])
    const front = await visibleDrawing('Stacked', '#front')
    await drag([front.x + 30, front.y + 30], [front.x + 70, front.y + 50])
    await page.waitForFunction((before) => window.drawingHarness.state().frames[0]!.html !== before, {}, source.html)
    const positions = await page.evaluate(() => {
      const doc = new DOMParser().parseFromString(window.drawingHarness.state().frames[0]!.html, 'text/html')
      return ['front', 'back'].map((id) => {
        const el = doc.getElementById(id)!
        return [el.style.left, el.style.top]
      })
    })
    expect(positions).toEqual([
      ['80px', '70px'],
      ['60px', '60px'],
    ])
  })

  it.each([false, true])('handles a drag that ends before its iframe hit test returns (cancel: %s)', async (cancel) => {
    const source: Frame = {
      id: 'slow',
      canvasId: 'c',
      pageId: 'first',
      name: 'Slow',
      updatedBy: 'User',
      x: 20,
      y: 20,
      width: 250,
      height: 250,
      createdAt: 0,
      updatedAt: 0,
      html: '<div data-doop-drawing="rectangle" data-name="Rectangle" style="position:fixed;left:60px;top:60px;width:100px;height:100px;background:red"></div>',
    }
    await seedFrames([source])
    const rect = await visibleDrawing('Slow')
    const iframe = (await (await page.$('iframe[title="Slow"]'))!.contentFrame())!
    await iframe.evaluate(() =>
      window.addEventListener(
        'message',
        (event) => {
          if (event.data?.type !== 'doop:drawing-hit' || event.data.delayed) return
          event.stopImmediatePropagation()
          setTimeout(() => {
            window.dispatchEvent(
              new MessageEvent('message', { data: { ...event.data, delayed: true }, source: event.source }),
            )
            document.body.dataset.replied = 'true'
          }, 250)
        },
        true,
      ),
    )
    await page.mouse.move(rect.x + 40, rect.y + 40)
    await page.mouse.down()
    await page.mouse.move(900, 600)
    if (cancel) await page.keyboard.press('Escape')
    await page.mouse.up()
    await iframe.waitForFunction(() => document.body.dataset.replied === 'true')
    if (cancel) {
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      )
      expect(saved).toEqual([source])
      expect(await page.$('iframe[title="Moving drawing"]')).toBeNull()
    } else {
      const result = await waitForFrames(2)
      expect(result[0]!.html).not.toContain('data-doop-drawing')
      expect(result[1]).toMatchObject({ width: 100, height: 100, name: 'Rectangle' })
    }
  })

  it('does not grab a drawing behind non-drawing content', async () => {
    const source: Frame = {
      id: 'covered',
      canvasId: 'c',
      pageId: 'first',
      name: 'Covered',
      updatedBy: 'User',
      x: 20,
      y: 20,
      width: 400,
      height: 300,
      createdAt: 0,
      updatedAt: 0,
      html: '<div data-doop-drawing="rectangle" style="position:fixed;left:60px;top:60px;width:100px;height:100px;background:red"></div><div style="position:fixed;left:60px;top:60px;width:100px;height:100px;background:black;z-index:10">Cover</div>',
    }
    await seedFrames([source])
    const covered = await visibleDrawing('Covered')
    await drag([covered.x + 30, covered.y + 30], [covered.x + 70, covered.y + 50])
    await page.waitForFunction(() => window.drawingHarness.state().frames[0]?.x !== 20)
    expect(saved[0]).toMatchObject({ x: 40, y: 30, html: source.html })
    expect(saved).toHaveLength(1)
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
    await page.click('[aria-label="Vector path"]')
    await page.touchscreen.touchStart(80, 450)
    await page.touchscreen.touchMove(80, 390)
    await page.touchscreen.touchEnd()
    await page.touchscreen.touchStart(280, 450)
    await page.touchscreen.touchMove(280, 510)
    await page.touchscreen.touchEnd()
    await page.click('[data-drawing-hint] button')
    expect((await waitForFrames(2))[1]!.html).toContain(' C ')
    await page.screenshot({ path: '/tmp/doop-canvas-curves-mobile.png' })
  })
})
