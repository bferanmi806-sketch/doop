import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CanvasMeta, WorkspaceSummary } from '../../shared/types'
import { colorFor } from '../../shared/types'
import { api } from '../lib/api'
import { authClient } from '../lib/auth'
import { navigate } from '../App'
import { timeAgo } from '../lib/time'
import { openCanvasTab } from '../lib/desktop'
import { cn } from '@/lib/utils'
import { AgentIcon } from './AgentIcon'
import { AccountMenu } from './DashShell'
import { CanvasSearchModal } from './CanvasSearchModal'
import { ConnectModal } from './ConnectModal'
import { Logo } from './Logo'
import { DashNavItem, DashSectionLabel, DashSidebar } from './ui/dash'
import { Dot } from './ui/dot'
import {
  BlocksIcon,
  BuildingIcon,
  ChevronDownIcon,
  CirclePlusIcon,
  FolderPlusIcon,
  GridIcon,
  LockIcon,
  PanelCollapseIcon,
  PanelExpandIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
  WebIcon,
  WorkflowIcon,
} from './ui/icons'

/**
 * The signed-in shell's rail, as the home design draws it: canvases,
 * workspaces, explore, resources and agents in 12.5px rows, a search palette
 * and a collapse control up top, and the account face at the bottom. Every
 * dashboard page mounts the same one, so the chrome cannot drift between
 * Home, Automations, Integrations, Community and Settings.
 *
 * It owns the search palette, the connect-an-agent modal and its collapsed
 * state (remembered per browser). A page that needs its own group — the
 * settings panes, the community shelves — passes it as children, and it
 * lands after Resources.
 */

/** which row is lit: a home scope, a workspace, or one of the other pages */
export type RailActive =
  'all' | 'mine' | 'shared' | 'automations' | 'integrations' | 'community' | `ws:${string}` | null

/** an agent that worked this recently is treated as still at the desk */
const LIVE_WINDOW = 5 * 60 * 1000
const RAIL_STORAGE_KEY = 'doop-rail'
/* the rail's glyphs sit at 14px, a hair under the 12.5px label's cap height */
const rail = { width: 14, height: 14, 'aria-hidden': true } as const

function readRailOpen(): boolean {
  try {
    return localStorage.getItem(RAIL_STORAGE_KEY) !== 'narrow'
  } catch {
    return true
  }
}

export function AppRail({
  active,
  canvases,
  workspaces,
  onScope,
  onCreateWorkspace,
  searchShortcut = true,
  children,
}: {
  active: RailActive
  /** the lists the rail counts and reads agents from; fetched here when a page has none */
  canvases?: CanvasMeta[]
  workspaces?: WorkspaceSummary[]
  /** Home filters in place; any other page goes home with the scope in the URL */
  onScope?: (scope: 'all' | 'mine' | 'shared' | `ws:${string}`) => void
  onCreateWorkspace?: () => void
  /** off on a page whose own search owns ⌘K (the community gallery) */
  searchShortcut?: boolean
  children?: ReactNode
}) {
  const [own, setOwn] = useState<{ canvases: CanvasMeta[]; workspaces: WorkspaceSummary[] } | null>(null)
  const needsOwn = canvases === undefined || workspaces === undefined
  useEffect(() => {
    if (!needsOwn) return
    Promise.all([api.listCanvases(), api.listWorkspaces()])
      .then(([c, w]) => setOwn({ canvases: c, workspaces: w.workspaces }))
      .catch(console.error)
  }, [needsOwn])
  const list = useMemo(() => canvases ?? own?.canvases ?? [], [canvases, own])
  const spaces = workspaces ?? own?.workspaces ?? []

  const [open, setOpen] = useState(readRailOpen)
  const [searching, setSearching] = useState(false)
  const [connecting, setConnecting] = useState(false)
  /* a clock the render can read: an agent that just worked shows as live */
  const [now, setNow] = useState(0)
  useEffect(() => {
    const start = window.setTimeout(() => setNow(Date.now()), 0)
    const tick = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(tick)
    }
  }, [])

  /* ⌘K opens the search palette from anywhere in the shell */
  useEffect(() => {
    if (!searchShortcut) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearching(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchShortcut])

  function setRail(next: boolean) {
    setOpen(next)
    try {
      localStorage.setItem(RAIL_STORAGE_KEY, next ? 'wide' : 'narrow')
    } catch {
      /* private mode: the choice lives for this page only */
    }
  }

  function scope(next: 'all' | 'mine' | 'shared' | `ws:${string}`) {
    if (onScope) onScope(next)
    else navigate(next === 'all' ? '/' : `/?scope=${encodeURIComponent(next)}`)
  }

  function createWorkspace() {
    if (onCreateWorkspace) onCreateWorkspace()
    else navigate('/?workspace=new')
  }

  function openCanvas(c: CanvasMeta) {
    if (!openCanvasTab(c.id, c.name)) navigate(`/c/${c.id}`)
  }

  const workspaceCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of list) if (c.workspaceId) map.set(c.workspaceId, (map.get(c.workspaceId) ?? 0) + 1)
    return map
  }, [list])

  /* every agent that has worked on these canvases, aggregated across them */
  const agents = useMemo(() => {
    const map = new Map<string, { name: string; lastAt: number; canvases: number }>()
    for (const c of list) {
      for (const a of c.agents ?? []) {
        const e = map.get(a.name)
        if (e) {
          e.canvases += 1
          e.lastAt = Math.max(e.lastAt, a.lastAt ?? 0)
        } else map.set(a.name, { name: a.name, lastAt: a.lastAt ?? 0, canvases: 1 })
      }
    }
    return [...map.values()].sort((x, y) => y.lastAt - x.lastAt).slice(0, 5)
  }, [list])

  const modals = (
    <>
      {connecting && <ConnectModal onClose={() => setConnecting(false)} />}
      {searching && (
        <CanvasSearchModal
          canvases={list}
          onClose={() => setSearching(false)}
          onOpen={(c) => {
            setSearching(false)
            openCanvas(c)
          }}
        />
      )}
    </>
  )

  const narrow = (
    <div
      key="narrow"
      className="flex min-h-full w-full animate-[fade-in_0.25s_ease] flex-col items-center motion-reduce:animate-none"
    >
      <Logo className="mb-3 size-[26px] rounded-[7px]" />
      <RailIconButton label="Show sidebar" onClick={() => setRail(true)} size="lg">
        <PanelExpandIcon width={15} height={15} />
      </RailIconButton>
      <RailIconButton label="Search canvases (⌘K)" onClick={() => setSearching(true)} size="lg">
        <SearchIcon width={15} height={15} />
      </RailIconButton>
      <Rule />
      <RailIconButton label="All canvases" on={active === 'all'} onClick={() => scope('all')} size="lg">
        <GridIcon {...rail} />
      </RailIconButton>
      <RailIconButton label="Owned by me" on={active === 'mine'} onClick={() => scope('mine')} size="lg">
        <UserIcon {...rail} />
      </RailIconButton>
      <RailIconButton label="Shared with me" on={active === 'shared'} onClick={() => scope('shared')} size="lg">
        <UsersIcon {...rail} />
      </RailIconButton>
      <Rule />
      {spaces.map((w) => (
        <RailIconButton
          key={w.id}
          label={w.name}
          on={active === `ws:${w.id}`}
          onClick={() => scope(`ws:${w.id}`)}
          size="lg"
        >
          <BuildingIcon {...rail} />
        </RailIconButton>
      ))}
      <RailIconButton label="New workspace" onClick={createWorkspace} size="lg">
        <FolderPlusIcon {...rail} />
      </RailIconButton>
      <Rule />
      <RailIconButton label="Community" on={active === 'community'} onClick={() => navigate('/community')} size="lg">
        <WebIcon {...rail} />
      </RailIconButton>
      <RailIconButton
        label="Automations"
        on={active === 'automations'}
        onClick={() => navigate('/automations')}
        size="lg"
      >
        <WorkflowIcon {...rail} />
      </RailIconButton>
      <RailIconButton
        label="Integrations"
        on={active === 'integrations'}
        onClick={() => navigate('/integrations')}
        size="lg"
      >
        <BlocksIcon {...rail} />
      </RailIconButton>
      <Rule />
      {agents.map((a) => (
        <span
          key={a.name}
          className="grid size-8 place-items-center"
          title={a.name}
          style={{ color: colorFor(a.name) }}
        >
          <AgentIcon name={a.name} size={14} />
        </span>
      ))}
      <RailIconButton label="Connect an agent" onClick={() => setConnecting(true)} size="lg">
        <CirclePlusIcon {...rail} />
      </RailIconButton>
      <div className="mt-auto pt-4">
        <AccountMenu face side="top" align="start" />
      </div>
    </div>
  )

  const wide = (
    <div key="wide" className="flex min-h-full w-full animate-[fade-in_0.25s_ease] flex-col motion-reduce:animate-none">
      <div className="mb-2.5 flex h-[30px] items-center gap-2 px-1.5">
        <button type="button" aria-label="Doop home" className="rounded-[7px]" onClick={() => navigate('/')}>
          <Logo className="size-[26px] rounded-[7px]" />
        </button>
        <span className="ml-auto flex items-center gap-2.5 text-ink-soft">
          <RailIconButton label="Search canvases (⌘K)" onClick={() => setSearching(true)}>
            <SearchIcon width={15} height={15} />
          </RailIconButton>
          <RailIconButton label="Hide sidebar" onClick={() => setRail(false)}>
            <PanelCollapseIcon width={15} height={15} />
          </RailIconButton>
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        <RailItem icon={<GridIcon {...rail} />} label="All canvases" on={active === 'all'} go={() => scope('all')} />
        <RailItem icon={<UserIcon {...rail} />} label="Owned by me" on={active === 'mine'} go={() => scope('mine')} />
        <RailItem
          icon={<UsersIcon {...rail} />}
          label="Shared with me"
          on={active === 'shared'}
          go={() => scope('shared')}
        />
      </nav>

      <RailLabel>Workspaces</RailLabel>
      <nav className="flex flex-col gap-0.5">
        {spaces.map((w) => (
          <RailItem
            key={w.id}
            icon={<BuildingIcon {...rail} />}
            label={w.name}
            trail={
              w.active ? (
                <em className="not-italic">{workspaceCounts.get(w.id) ?? 0}</em>
              ) : (
                <span className="inline-flex items-center gap-1" title="No plan yet">
                  <LockIcon width={12} height={12} aria-hidden />
                </span>
              )
            }
            on={active === `ws:${w.id}`}
            go={() => scope(`ws:${w.id}`)}
          />
        ))}
        <RailItem
          icon={<FolderPlusIcon {...rail} />}
          label={spaces.length ? 'New workspace' : 'Create workspace'}
          on={false}
          go={createWorkspace}
        />
      </nav>

      <RailLabel>Explore</RailLabel>
      <nav className="flex flex-col gap-0.5">
        <RailItem
          icon={<WebIcon {...rail} />}
          label="Community"
          on={active === 'community'}
          go={() => navigate('/community')}
        />
      </nav>

      <RailLabel>Resources</RailLabel>
      <nav className="flex flex-col gap-0.5">
        <RailItem
          icon={<WorkflowIcon {...rail} />}
          label="Automations"
          on={active === 'automations'}
          go={() => navigate('/automations')}
        />
        <RailItem
          icon={<BlocksIcon {...rail} />}
          label="Integrations"
          on={active === 'integrations'}
          go={() => navigate('/integrations')}
        />
      </nav>

      {children}

      <RailLabel>Agents</RailLabel>
      <div className="flex flex-col gap-0.5">
        {agents.map((a) => (
          <div
            key={a.name}
            className="flex h-[31px] min-w-0 items-center gap-[11px] px-[11px] text-[12.5px] text-ink-soft"
            title={`${a.canvases} canvas${a.canvases === 1 ? '' : 'es'}`}
          >
            <span className="grid size-[14px] flex-none place-items-center" style={{ color: colorFor(a.name) }}>
              <AgentIcon name={a.name} size={14} />
            </span>
            <span className="truncate">{a.name}</span>
            {a.lastAt > 0 && now - a.lastAt < LIVE_WINDOW ? (
              <Dot size="sm" className="ml-auto bg-success" title="working right now" />
            ) : (
              <span className="ml-auto flex-none text-[11px] text-ink-faint">
                {a.lastAt > 0 ? timeAgo(a.lastAt) : ''}
              </span>
            )}
          </div>
        ))}
        <RailItem
          icon={<CirclePlusIcon {...rail} />}
          label="Connect an agent"
          on={false}
          go={() => setConnecting(true)}
        />
      </div>

      <div className="mt-auto flex items-center gap-2.5 px-1 pt-4">
        <AccountMenu face side="top" align="start" />
        <AccountName />
      </div>
    </div>
  )

  return (
    <>
      {/* one aside whose width glides between the two sizes; the layout's
          column follows it (railLayout), and each state fades in over it */}
      <DashSidebar
        className={cn(
          'overflow-x-hidden border-r-0 bg-sub pb-3 pt-3.5 transition-[width] duration-normal ease-out-quad motion-reduce:transition-none',
          open ? 'px-3 md:w-[236px]' : 'px-2 md:w-14',
        )}
      >
        {open ? wide : narrow}
      </DashSidebar>
      {modals}
    </>
  )
}

/** page headings in this shell: the UI sans, medium, one size up from the rows */
export const pageTitleCls = 'font-sans text-[22px] font-medium leading-tight tracking-[-0.01em] md:text-[24px]'

/** the DashLayout column spec that lets the rail set its own width */
export const railLayout = 'md:grid-cols-[auto_1fr]'

function AccountName() {
  const { data: session } = authClient.useSession()
  return <span className="truncate text-[12.5px] text-ink-soft">{session?.user.name}</span>
}

function Rule() {
  return <div className="my-2 h-px w-6 bg-line" />
}

/** a quiet icon button in the rail's top row (sm) or the narrow rail (lg) */
export function RailIconButton({
  label,
  on = false,
  size = 'sm',
  onClick,
  children,
}: {
  label: string
  on?: boolean
  size?: 'sm' | 'lg'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={on || undefined}
      className={cn(
        'grid flex-none place-items-center text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        size === 'sm' ? 'size-6 rounded-md' : 'size-8 rounded-[7px]',
        on && 'bg-paper-deep text-ink',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** a group caption in the rail: sentence case, a quiet grey */
export function RailLabel({ children }: { children: ReactNode }) {
  return (
    <DashSectionLabel className="flex items-center gap-[5px] px-[11px] pb-1.5 pt-3.5 text-[11px] font-normal normal-case tracking-normal">
      {children}
      <ChevronDownIcon width={11} height={11} className="text-ink-ghost" aria-hidden />
    </DashSectionLabel>
  )
}

/** one row of the rail */
export function RailItem({
  icon,
  label,
  trail,
  on,
  go,
}: {
  icon: ReactNode
  label: string
  trail?: ReactNode
  on: boolean
  go: () => void
}) {
  return (
    <DashNavItem
      icon={icon}
      count={trail}
      active={on}
      onClick={go}
      className="h-[31px] gap-[11px] rounded-[7px] px-[11px] py-0 text-[12.5px] font-normal hover:bg-paper-deep data-[active]:font-normal [&_svg]:flex-none"
    >
      {label}
    </DashNavItem>
  )
}
