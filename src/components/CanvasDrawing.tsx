import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { useStore } from '../lib/store'
import { isDrawingTool, resolvePointerAction, type DrawingTool } from '../lib/tools'
import { gesture } from '../lib/gesture'
import { isTypingTarget } from '../lib/keys'
import {
  defaultDrawing,
  drawingBounds,
  drawingTarget,
  pathData,
  pathDrawing,
  saveDrawing,
  DRAWING_FILL,
  DRAWING_INK,
  type Drawing,
  type DrawingTarget,
  type Point,
} from '../lib/drawing'

interface Draft {
  drawing: Drawing
  target: DrawingTarget
  typing?: boolean
}

/** Stage owns the pointer capture, including presses over a frame's shield.
 *  The preview lives in world space, so pan/zoom use the same transform as frames. */
export function useCanvasDrawing(stage: RefObject<HTMLDivElement>) {
  const [draft, renderDraft] = useState<Draft | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const cleanup = useRef<(() => void) | null>(null)
  const lastPathPress = useRef(0)
  const [hover, setHover] = useState<Point | null>(null)
  const setDraft = useCallback((value: Draft | null) => {
    draftRef.current = value
    renderDraft(value)
  }, [])
  const cancel = useCallback(() => {
    cleanup.current?.()
    cleanup.current = null
    lastPathPress.current = 0
    setDraft(null)
    setHover(null)
  }, [setDraft])
  const finish = useCallback(
    (closed = false) => {
      const current = draftRef.current
      if (!current) return
      let drawing = current.drawing
      if (drawing.tool === 'path') {
        if (!drawing.points || drawing.points.length < 2) return
        drawing = pathDrawing(drawing.points, closed)
      }
      cancel()
      useStore.getState().setTool('select')
      if (drawing.tool === 'text' && !drawing.text?.trim()) return
      void saveDrawing(drawing, current.target)
    },
    [cancel],
  )

  useEffect(() => {
    const unsub = useStore.subscribe((s, prev) => {
      if (s.tool !== prev.tool || s.activePageId !== prev.activePageId || s.canvas?.id !== prev.canvas?.id) cancel()
    })
    function onKey(e: KeyboardEvent) {
      const current = draftRef.current
      if (!current) return
      if (e.isComposing || (isTypingTarget(e.target) && !e.target.matches('textarea[data-drawing-input]'))) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        cancel()
        useStore.getState().setTool('select')
      } else if (
        e.key === 'Enter' &&
        (current.drawing.tool === 'path' || (current.typing && (e.metaKey || e.ctrlKey)))
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        finish()
      } else if (!current.typing && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        const points = current.drawing.points
        if (points && points.length > 1) setDraft({ ...current, drawing: pathDrawing(points.slice(0, -1)) })
        else cancel()
      }
    }
    function onBlur() {
      // Keep a text draft if focus moved to another application.
      if (!draftRef.current?.typing) cancel()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('blur', onBlur)
    return () => {
      unsub()
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('blur', onBlur)
      cleanup.current?.()
    }
  }, [cancel, finish, setDraft])

  function toWorld(clientX: number, clientY: number): Point {
    const rect = stage.current!.getBoundingClientRect()
    const vp = useStore.getState().viewport
    return { x: (clientX - rect.left - vp.x) / vp.zoom, y: (clientY - rect.top - vp.y) / vp.zoom }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as Element).closest('[data-comment-ui]')) {
      cancel()
      return
    }
    if ((e.target as Element).closest('[data-drawing-input]')) return
    if (!e.isPrimary || gesture.pinching) {
      if (!draftRef.current?.typing) cancel()
      return
    }
    const s = useStore.getState()
    const tool = s.tool
    if (
      !isDrawingTool(tool) ||
      resolvePointerAction({
        tool,
        target: 'background',
        button: e.button,
        pointerType: e.pointerType,
        spaceHeld: s.panMode,
      }) !== 'draw'
    )
      return
    e.preventDefault()
    e.stopPropagation()
    if (draftRef.current?.typing) {
      finish()
      return
    }
    const start = toWorld(e.clientX, e.clientY)
    const target = draftRef.current?.target ?? drawingTarget(start, tool)
    if (!target) return
    s.setFollowing(null)
    if (tool === 'path') {
      const points = draftRef.current?.drawing.points ?? []
      const zoom = s.viewport.zoom
      if (points.length >= 3 && Math.hypot(start.x - points[0]!.x, start.y - points[0]!.y) * zoom < 8) {
        finish(true)
        return
      }
      const last = points.at(-1)
      const repeated = last && Math.hypot(start.x - last.x, start.y - last.y) * zoom <= 2
      // Preventing pointerdown's default suppresses native dblclick in some
      // browsers. Recognize the second press here, including a double tap.
      if (repeated && points.length >= 2 && e.timeStamp - lastPathPress.current < 400) {
        finish()
        return
      }
      lastPathPress.current = e.timeStamp
      if (!repeated) setDraft({ target, drawing: pathDrawing([...points, start]) })
      setHover(start)
      return
    }
    cancel()
    const drawTool: DrawingTool = tool
    setDraft({ target, drawing: drawingBounds(tool, start, start) })
    const el = e.currentTarget
    const pointerId = e.pointerId
    el.setPointerCapture(pointerId)
    function move(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      if (gesture.pinching) return cancel()
      setDraft({
        target: target!,
        drawing: drawingBounds(drawTool, start, toWorld(ev.clientX, ev.clientY), ev.shiftKey),
      })
    }
    function up(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      if (gesture.pinching) return cancel()
      const end = toWorld(ev.clientX, ev.clientY)
      const clicked = Math.hypot(end.x - start.x, end.y - start.y) * useStore.getState().viewport.zoom < 3
      const drawing = clicked ? defaultDrawing(drawTool, start) : drawingBounds(drawTool, start, end, ev.shiftKey)
      cleanup.current?.()
      cleanup.current = null
      if (drawing.width < 1 || drawing.height < 1) return cancel()
      setDraft({ target: target!, drawing, typing: tool === 'text' })
      if (tool !== 'text') finish()
    }
    function cancelled(ev: PointerEvent) {
      if (ev.pointerId === pointerId) cancel()
    }
    cleanup.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancelled)
      el.removeEventListener('lostpointercapture', cancelled)
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancelled)
    el.addEventListener('lostpointercapture', cancelled)
  }

  const preview = draft && (
    <DrawingPreview
      draft={draft}
      hover={hover}
      onText={(text, height) => setDraft({ ...draft, drawing: { ...draft.drawing, text, height } })}
      onFinish={() => finish()}
    />
  )
  return {
    preview,
    pathActive: draft?.drawing.tool === 'path',
    canFinishPath: (draft?.drawing.points?.length ?? 0) >= 2,
    finish: () => finish(),
    cancel,
    onPointerDown,
    onPointerMove: (e: ReactPointerEvent) => {
      if (draftRef.current?.drawing.tool === 'path' && !useStore.getState().panMode)
        setHover(toWorld(e.clientX, e.clientY))
    },
    onDoubleClick: (e: React.MouseEvent) => {
      if (draftRef.current?.drawing.tool !== 'path') return
      e.preventDefault()
      e.stopPropagation()
      finish()
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length >= 2 && !draftRef.current?.typing) cancel()
    },
  }
}

function DrawingPreview({
  draft,
  hover,
  onText,
  onFinish,
}: {
  draft: Draft
  hover: Point | null
  onText: (text: string, height: number) => void
  onFinish: () => void
}) {
  const d = draft.drawing
  if (draft.typing)
    return (
      <textarea
        data-drawing-input
        aria-label="Text to add to canvas"
        autoFocus
        placeholder="Type something…"
        value={d.text ?? ''}
        onChange={(e) => onText(e.target.value, Math.max(d.height, e.target.scrollHeight))}
        onBlur={onFinish}
        className="absolute z-30 resize-none border-0 bg-white/90 p-0 text-[#202124] outline-2 outline-brand"
        style={{
          left: d.x,
          top: d.y,
          width: d.width,
          height: Math.max(34, d.height),
          font: '24px/1.4 Arial,sans-serif',
          overflowWrap: 'anywhere',
        }}
      />
    )
  if (d.tool === 'path') {
    const points = d.points ?? []
    const preview = pathDrawing(hover ? [...points, hover] : points)
    return (
      <svg
        className="pointer-events-none absolute z-20 overflow-visible"
        style={{ left: preview.x, top: preview.y }}
        width={preview.width}
        height={preview.height}
      >
        <path d={pathData(preview)} fill="none" stroke={DRAWING_INK} strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x - preview.x}
            cy={p.y - preview.y}
            r="calc(3px / var(--zoom, 1))"
            fill="white"
            stroke="var(--brand)"
            strokeWidth="calc(1px / var(--zoom, 1))"
          />
        ))}
      </svg>
    )
  }
  return (
    <div
      className="pointer-events-none absolute z-20 [box-shadow:0_0_0_calc(1px/var(--zoom,1))_var(--brand)]"
      style={{
        left: d.x,
        top: d.y,
        width: d.width,
        height: d.height,
        background: d.tool === 'frame' ? '#fff' : d.tool === 'text' ? 'transparent' : DRAWING_FILL,
        borderRadius: d.tool === 'circle' ? '50%' : 0,
      }}
    />
  )
}
