import { useMemo, useState, type ComponentProps } from 'react'
import { colorFor } from '../../shared/types'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { posthog } from '../lib/posthog'
import { timeAgo } from '../lib/time'
import { isComposingEnter } from '../lib/keys'
import { isCanvasComment } from '../../shared/comments'
import { pageThreads, threadState, type CommentThreadGroup, type ThreadState } from '../lib/comments'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { PanelBody } from './ui/panel'
import { PinIcon } from './ui/icons'
import { isResidentLimit } from './TeamAllowance'

const emptyNote = 'px-4 py-6 text-center text-[13px] text-ink-faint'

/** Every comment thread on the current page — pinned to a frame or to the
 *  canvas itself — open ones first. Clicking a thread flies to its pin and
 *  opens it; replying and resolving work from here too, so a review pass
 *  never has to hunt pins across the canvas. */
export function CommentsPanel() {
  const comments = useStore((s) => s.comments)
  const canvas = useStore((s) => s.canvas)
  const activePageId = useStore((s) => s.activePageId)
  const [filter, setFilter] = useState<ThreadState>('open')

  const threads = useMemo(() => pageThreads(comments, canvas, activePageId), [comments, canvas, activePageId])
  const counts = { open: 0, resolved: 0 }
  for (const t of threads) counts[threadState(t)] += 1
  const shown = threads.filter((t) => threadState(t) === filter)

  if (threads.length === 0) {
    return (
      <PanelBody className="py-2">
        <div className={emptyNote}>
          No comments on this page yet. Use the comment tool or right-click an element to leave one.
        </div>
      </PanelBody>
    )
  }

  return (
    <PanelBody className="pb-3">
      <div role="group" aria-label="Comment filter" className="flex gap-1 px-4 pt-2 pb-1.5">
        <FilterChip active={filter === 'open'} onClick={() => setFilter('open')}>
          Open · {counts.open}
        </FilterChip>
        <FilterChip active={filter === 'resolved'} onClick={() => setFilter('resolved')}>
          Resolved · {counts.resolved}
        </FilterChip>
      </div>
      {shown.length === 0 ? (
        <div className={emptyNote}>No {filter} threads on this page.</div>
      ) : (
        shown.map((t) => <ThreadRow key={t.root.id} thread={t} />)
      )}
    </PanelBody>
  )
}

function FilterChip({ active, ...props }: { active: boolean } & ComponentProps<typeof Button>) {
  return (
    <Button
      variant={active ? 'solid' : 'ghost'}
      size="pill"
      mono
      aria-pressed={active}
      className={cn('px-2.5 py-[3px]', !active && 'text-ink-soft')}
      {...props}
    />
  )
}

/* replies and resolves are metered like any other resident task when they
   @mention an agent — a 403 means the free tier ran out, so raise the wall */
function reportLimit(err: unknown) {
  if (isResidentLimit(err)) useStore.getState().setLimitWall(true)
  else console.error(err)
}

function ThreadRow({ thread }: { thread: CommentThreadGroup }) {
  const { root, replies, frame } = thread
  const resolved = threadState(thread) === 'resolved'
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  /* fly to the pin (its frame, or its point on the canvas) and pop it — the
     pin shows the whole conversation, this row is the index entry */
  const goToThread = () => {
    const s = useStore.getState()
    if (frame) {
      s.select(frame.id)
      s.requestFlyTo(frame.id)
    } else if (isCanvasComment(root)) {
      s.select(null)
      s.setActivePage(root.pageId)
      s.requestFlyToPoint(root.x, root.y)
    }
    if (!resolved) s.requestOpenThread(root.id)
  }

  async function reply() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setFailed(false)
    try {
      await api.replyComment(root.id, text)
      posthog.capture('element_comment_replied')
      setDraft((current) => (current === draft ? '' : current))
    } catch (err) {
      setFailed(true)
      reportLimit(err)
    } finally {
      setSending(false)
    }
  }

  function resolve() {
    api
      .resolveComment(root.id)
      .then(() => posthog.capture('element_comment_resolved'))
      .catch(reportLimit)
  }

  return (
    <div className="group border-t border-line-soft px-4 py-2.5 first-of-type:border-t-0">
      <div
        role="button"
        tabIndex={0}
        title={frame ? `Go to “${frame.name}”` : 'Go to the pin on the canvas'}
        onClick={goToThread}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            goToThread()
          }
        }}
        className="-mx-2 cursor-pointer rounded-md px-2 py-1 hover:bg-paper-deep focus-visible:bg-paper-deep focus-visible:outline-none"
      >
        <div className="flex items-baseline gap-2 text-[12px]">
          <b className="min-w-0 truncate" style={{ color: colorFor(root.from) }}>
            {root.from}
          </b>
          <span className="flex-none font-mono text-[10.5px] text-ink-faint">{timeAgo(root.at)}</span>
          <span
            className={cn(
              'ml-auto flex-none rounded-full border border-current px-[7px] py-px font-mono text-[9px] uppercase tracking-[0.08em]',
              resolved ? 'text-ink-faint' : 'text-accent-ink',
            )}
          >
            {resolved ? 'resolved' : 'open'}
          </span>
        </div>
        <div className="mt-1 break-words text-[13px] leading-[1.45] text-ink">{root.text}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-faint">
          {frame ? (
            <span className="min-w-0 truncate" title={frame.name}>
              ▢ {frame.name}
            </span>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-0.5 truncate" title="Pinned to the canvas">
              <PinIcon className="size-3" /> Canvas
            </span>
          )}
          <span className="flex-none">
            · {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          {resolved && root.resolvedBy && <span className="min-w-0 flex-none truncate">· by {root.resolvedBy}</span>}
        </div>
      </div>
      {!resolved && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Input
            inputSize="sm"
            className="min-w-0 flex-1 rounded-lg px-[9px] focus:border-ink-soft focus:ring-0 md:text-xs"
            placeholder="Reply… (@doop to ask the agent)"
            aria-label={`Reply to ${root.from}`}
            value={draft}
            disabled={sending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isComposingEnter(e)) void reply()
            }}
          />
          <Button
            variant="ghost"
            size="pill"
            className="flex-none px-2.5 text-ink-soft hover:border-ink-soft hover:bg-transparent hover:text-ink"
            title="Mark this thread as resolved"
            onClick={resolve}
          >
            ✓ Resolve
          </Button>
        </div>
      )}
      {failed && (
        <div className="mt-1 text-[11px] leading-[1.4] text-accent-ink">
          That reply did not go through — it may be resolved already. Try again.
        </div>
      )}
    </div>
  )
}
