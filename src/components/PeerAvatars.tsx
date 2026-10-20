import type { CSSProperties } from 'react'
import type { Presence } from '../../shared/types'
import { useStore } from '../lib/store'
import { locatePresence } from '../lib/locate'
import { AgentIcon } from './AgentIcon'
import { cn } from '@/lib/utils'

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** True for an agent that is working right now — it posted a status. */
export function isActiveAgent(p: Presence): boolean {
  return p.kind === 'agent' && !!p.status
}

/** One face in the presence stack: a 24px disc on a 2px surface collar. A
 *  person is their initials on a tint of their cursor colour; an agent is its
 *  brand mark on white. An agent at work swaps the grey hairline for the
 *  silver one, rises above its neighbours and wears the sweeping glaze. */
export function PresenceFace({
  name,
  color,
  kind,
  glaze = false,
  glazeDelay = 0,
  size = 24,
  className,
  style,
}: {
  name: string
  color: string
  kind: Presence['kind']
  glaze?: boolean
  /** seconds — a second glazed face alternates with the first */
  glazeDelay?: number
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      data-slot="presence-face"
      className={cn(
        'relative z-[1] grid flex-none place-items-center overflow-hidden rounded-full bg-surface text-[9px] font-medium text-ink',
        'shadow-[0_0_0_2px_var(--surface),0_0_0_3px_rgba(0,0,0,0.07)] dark:shadow-[0_0_0_2px_var(--surface),0_0_0_3px_rgba(255,255,255,0.12)]',
        glaze && 'glaze-sweep z-[2] shadow-[0_0_0_2px_var(--surface),0_0_0_3px_var(--glaze-ring)]',
        className,
      )}
      style={{
        width: size,
        height: size,
        ...(kind === 'user' ? { background: `color-mix(in srgb, ${color} 22%, var(--surface))` } : {}),
        ...(glaze ? ({ '--glaze-delay': `${glazeDelay}s` } as CSSProperties) : {}),
        ...style,
      }}
    >
      {kind === 'agent' ? <AgentIcon name={name} size={Math.round(size * 0.58)} /> : initialsOf(name)}
    </span>
  )
}

/** The other people and agents on the canvas, as faces in the presence
 *  stack. A person's face is a toggle: click to follow their camera around,
 *  click again to let go. An agent's face jumps the camera to the frame it is
 *  working on. The stack is a fixed roster — working agents glaze in place. */
export function PeerAvatars({ others }: { others: Presence[] }) {
  /* the second, third… active agent offsets its sweep so they alternate */
  let glazed = 0
  return (
    <>
      {others.map((p) => {
        const glazeDelay = isActiveAgent(p) ? (glazed++ % 2) * 1.3 : 0
        return p.kind === 'user' ? (
          <FollowAvatar key={p.clientId} presence={p} />
        ) : (
          <JumpAvatar key={p.clientId} presence={p} glazeDelay={glazeDelay} />
        )
      })}
    </>
  )
}

/* Every face sits on a fixed stacking level (later faces overlap earlier
   ones, working agents above the rest). The hover lift is a transform, and a
   transform makes its own stacking layer: without the fixed level the face
   would drop behind its neighbours while the lift animates in or out. The
   hovered or focused face is raised above them all. */
const stacked = 'relative z-[1] -ml-[7px] rounded-full first:ml-0'
const clickable =
  'transition-transform hover:z-10 hover:-translate-y-px focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-faint'

function presenceLabel(p: Presence) {
  return `${p.name}${p.kind === 'agent' ? (p.owner ? ` (${p.owner}'s agent)` : ' (agent)') : ''}${p.status ? ` — ${p.status}` : ''}`
}

function FollowAvatar({ presence: p }: { presence: Presence }) {
  const followed = useStore((s) => s.following === p.clientId)
  const setFollowing = useStore((s) => s.setFollowing)
  return (
    <button
      type="button"
      /* lifted so the next avatar in the stack does not paint over the halo */
      className={cn(stacked, clickable, followed && 'relative z-10')}
      aria-pressed={followed}
      title={followed ? `Stop following ${p.name}` : `Follow ${p.name} around the canvas`}
      onClick={() => setFollowing(followed ? null : p.clientId)}
    >
      <PresenceFace
        name={p.name}
        color={p.color}
        kind={p.kind}
        /* a halo in their colour marks who we are following */
        style={followed ? { boxShadow: `0 0 0 2px var(--surface), 0 0 0 3.5px ${p.color}` } : undefined}
      />
    </button>
  )
}

function JumpAvatar({ presence: p, glazeDelay }: { presence: Presence; glazeDelay: number }) {
  const locatable = useStore((s) => locatePresence(p, s) !== undefined)
  const active = isActiveAgent(p)
  const face = <PresenceFace name={p.name} color={p.color} kind={p.kind} glaze={active} glazeDelay={glazeDelay} />
  if (!locatable) {
    return (
      <span className={cn(stacked, 'relative', active && 'z-[2]')} title={presenceLabel(p)}>
        {face}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={cn(stacked, clickable, 'relative', active && 'z-[2]')}
      title={`${presenceLabel(p)} — click to go where it is working`}
      onClick={() => {
        const s = useStore.getState()
        const at = locatePresence(p, s)
        if (!at) return
        if ('frameId' in at) s.requestFlyTo(at.frameId)
        else s.requestFlyToPoint(at.point.x, at.point.y)
      }}
    >
      {face}
    </button>
  )
}
