import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { CanvasMeta } from '../../shared/types'
import { cn } from '@/lib/utils'
import { timeAgo } from '../lib/time'
import { Modal } from './ui/modal'
import { Input } from './ui/input'
import { SearchIcon } from './ui/icons'

/**
 * The rail's search: a palette over the page with one field and the
 * matching canvases under it, each with its preview. Arrow keys move the
 * highlight, Enter opens, Escape closes — the keyboard path ⌘K people expect.
 */

const MAX_RESULTS = 8

export function CanvasSearchModal({
  canvases,
  onOpen,
  onClose,
}: {
  canvases: CanvasMeta[]
  onOpen: (canvas: CanvasMeta) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return canvases.slice(0, MAX_RESULTS)
    return canvases.filter((c) => c.name.toLowerCase().includes(q)).slice(0, MAX_RESULTS)
  }, [canvases, query])

  /* the highlight follows the list: a shorter result set cannot leave it past the end */
  const active = Math.min(cursor, Math.max(results.length - 1, 0))

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const hit = results[active]
      if (hit) onOpen(hit)
    }
  }

  return (
    <Modal size="lg" onClose={onClose} className="p-0 sm:p-0" aria-label="Search canvases">
      <label className="flex h-12 items-center gap-2.5 border-b border-line-soft px-4 text-ink-faint">
        <SearchIcon width={15} height={15} aria-hidden />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCursor(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Search canvases"
          aria-label="Search canvases"
          variant="bare"
          inputSize="auto"
          className="flex-1 text-[14px] md:text-[14px]"
        />
      </label>
      <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">No canvas matches “{query.trim()}”.</p>
        ) : (
          results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setCursor(i)}
              onClick={() => onOpen(c)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors focus-visible:outline-none',
                i === active ? 'bg-paper-deep' : 'hover:bg-paper',
              )}
            >
              <span className="grid h-10 w-16 flex-none place-items-center overflow-hidden rounded-[7px] bg-paper-deep shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
                {c.previewFrameId ? (
                  <img
                    src={`/i/${c.previewFrameId}.jpg?preview`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <span className="text-[9px] text-ink-faint">empty</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{c.name}</span>
                <span className="mt-px block text-[11.5px] text-ink-faint">
                  {c.frameCount} frame{c.frameCount === 1 ? '' : 's'} · edited {timeAgo(c.updatedAt)}
                  {c.shared ? ' · shared with you' : ''}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}
