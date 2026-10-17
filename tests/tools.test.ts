import { describe, expect, it } from 'vitest'
import { resolvePointerAction, toolForKey, type PointerContext } from '../src/lib/tools'

/**
 * The bottom toolbar's tools decide what a pointer-down means. Select is the
 * canvas as it always was; Hand pans wherever the press lands; Comment turns
 * a press on a frame into a comment on the element under it. The space bar
 * is a temporary Hand in every tool.
 */

const mouse = (over: Partial<PointerContext>): PointerContext => ({
  tool: 'select',
  target: 'background',
  button: 0,
  pointerType: 'mouse',
  spaceHeld: false,
  ...over,
})

describe('resolvePointerAction', () => {
  it('Select: marquee on the background, drag on a frame', () => {
    expect(resolvePointerAction(mouse({ target: 'background' }))).toBe('marquee')
    expect(resolvePointerAction(mouse({ target: 'frame' }))).toBe('frame-drag')
  })

  it('Hand: pans wherever the press lands, frames included', () => {
    expect(resolvePointerAction(mouse({ tool: 'hand', target: 'background' }))).toBe('pan')
    expect(resolvePointerAction(mouse({ tool: 'hand', target: 'frame' }))).toBe('pan')
  })

  it('Comment: a press on a frame starts a comment; the background pans', () => {
    expect(resolvePointerAction(mouse({ tool: 'comment', target: 'frame' }))).toBe('comment')
    expect(resolvePointerAction(mouse({ tool: 'comment', target: 'background' }))).toBe('pan')
  })

  it('space held is a temporary Hand in every tool', () => {
    for (const tool of ['select', 'comment'] as const) {
      expect(resolvePointerAction(mouse({ tool, target: 'frame', spaceHeld: true }))).toBe('pan')
      expect(resolvePointerAction(mouse({ tool, target: 'background', spaceHeld: true }))).toBe('pan')
    }
  })

  it('the middle button pans in every tool; other buttons are not ours', () => {
    for (const tool of ['select', 'hand', 'comment'] as const) {
      expect(resolvePointerAction(mouse({ tool, target: 'frame', button: 1 }))).toBe('pan')
      expect(resolvePointerAction(mouse({ tool, target: 'frame', button: 2 }))).toBe('none')
    }
  })

  it('a finger on the background pans (phones have no space bar), on a frame it drags', () => {
    expect(resolvePointerAction(mouse({ pointerType: 'touch', target: 'background' }))).toBe('pan')
    expect(resolvePointerAction(mouse({ pointerType: 'touch', target: 'frame' }))).toBe('frame-drag')
  })
})

describe('toolForKey', () => {
  it('maps V / H / C to their tools, either case', () => {
    expect(toolForKey('v')).toBe('select')
    expect(toolForKey('H')).toBe('hand')
    expect(toolForKey('c')).toBe('comment')
  })

  it('knows nothing about other keys', () => {
    expect(toolForKey('f')).toBeNull()
    expect(toolForKey('Escape')).toBeNull()
  })
})
