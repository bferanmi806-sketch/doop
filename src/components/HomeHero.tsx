import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DRAFT_OPTIONS, DRAFTS_STORAGE_KEY, readStoredDrafts, type DraftCount } from '../lib/homePrompt'
import { ModelPicker } from './ModelPicker'
import { CanvaMark, PhotoshopMark } from './ImportSources'
import { FigmaLogo } from '../integrations/figma/Tile'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  ArrowUpIcon,
  AttachmentIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CirclePlusIcon,
  CopyIcon,
  HistoryIcon,
  LayoutTemplateIcon,
  MessageSquareIcon,
  UploadIcon,
} from './ui/icons'

/**
 * The home page's front door: the hopping Disc-D, a greeting, a strip of
 * suggestion chips, the composer that starts a canvas from a prompt, and the
 * "connect your designs" bar under it — all over the brand's gradient wave.
 *
 * The composer does not design on this page. A send makes a new canvas, queues
 * the brief as its first board card and opens it, where the agent's work
 * streams in. The draft count asks for that many takes on the same brief.
 */

export interface HeroActions {
  onPrompt: (text: string, drafts: DraftCount) => Promise<void> | void
  onImport: () => void
  onConnectAgents: () => void
  onAutomations: () => void
  onIntegrations: () => void
}

/** a chip either fills the composer with a brief or runs an action */
interface Chip {
  id: string
  label: string
  icon: ReactNode
  prompt?: string
  action?: keyof Omit<HeroActions, 'onPrompt'>
}

const chipIcon = { width: 13, height: 13 } as const

const CHIPS: Chip[] = [
  {
    id: 'landing',
    label: 'Draft a landing page',
    icon: <LayoutTemplateIcon {...chipIcon} />,
    prompt: 'Draft a landing page for ',
  },
  {
    id: 'recap',
    label: 'Recap a session',
    icon: <CalendarIcon {...chipIcon} />,
    prompt: 'Recap what happened on my canvases this week, as one summary frame.',
  },
  {
    id: 'changed',
    label: 'What changed',
    icon: <HistoryIcon {...chipIcon} />,
    prompt: 'What changed across my canvases this week?',
  },
  {
    id: 'automation',
    label: 'Run an automation',
    icon: <span className="font-mono text-caption">/</span>,
    action: 'onAutomations',
  },
  { id: 'agents', label: 'Connect your agents', icon: <CirclePlusIcon {...chipIcon} />, action: 'onConnectAgents' },
  { id: 'import', label: 'Import a design', icon: <UploadIcon {...chipIcon} />, action: 'onImport' },
  {
    id: 'comments',
    label: 'Review comments',
    icon: <MessageSquareIcon {...chipIcon} />,
    prompt: 'Go through the open comments on my canvases and address each one.',
  },
]

/** the beam walks the strip while nobody hovers, like a slow carousel */
const BEAM_STEP_MS = 4000
const MAX_COMPOSER_LINES = 6

function autosize(ta: HTMLTextAreaElement) {
  ta.style.height = 'auto'
  if (!ta.scrollHeight) return
  const line = parseFloat(getComputedStyle(ta).lineHeight) || 22
  ta.style.height = `${Math.min(ta.scrollHeight, Math.round(line * MAX_COMPOSER_LINES))}px`
}

/** the 28 bar heights of one wave copy, laid out twice for the seamless loop */
const WAVE = [
  24, 31, 27, 38, 34, 46, 41, 55, 50, 63, 70, 78, 86, 95, 100, 97, 89, 81, 72, 64, 56, 49, 42, 36, 44, 30, 35, 26,
]

export function HomeHero({
  firstName,
  busy,
  actions,
  focusAt,
}: {
  firstName?: string
  /** a send in flight: the composer locks until the canvas opens */
  busy: boolean
  actions: HeroActions
  /** a timestamp — the rail's "Ask Doop" and ⌘/ ask for the keyboard */
  focusAt: number
}) {
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<DraftCount>(() =>
    readStoredDrafts(typeof localStorage === 'undefined' ? undefined : localStorage),
  )
  const [beamAt, setBeamAt] = useState(3)
  const [hovered, setHovered] = useState<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    if (inputRef.current) autosize(inputRef.current)
  }, [text])

  useEffect(() => {
    if (focusAt) inputRef.current?.focus()
  }, [focusAt])

  useEffect(() => {
    if (hovered !== null) return
    const timer = window.setInterval(() => setBeamAt((i) => (i + 1) % CHIPS.length), BEAM_STEP_MS)
    return () => window.clearInterval(timer)
  }, [hovered])

  function pickDrafts(n: DraftCount) {
    setDrafts(n)
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, String(n))
    } catch {
      /* private mode: the choice lives for this page only */
    }
  }

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    void actions.onPrompt(trimmed, drafts)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  function runChip(chip: Chip) {
    if (chip.action) return actions[chip.action]()
    if (chip.prompt) {
      setText(chip.prompt)
      inputRef.current?.focus()
    }
  }

  const beamOn = hovered ?? beamAt

  return (
    <section className="relative overflow-hidden" data-slot="home-hero">
      {/* the wave: 2 copies of 28 bars, blurred, fading in from the top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden dark:opacity-60"
        aria-hidden
      >
        <div className="hero-wave absolute bottom-10 left-0 flex h-[250px] w-[200%] items-end opacity-90 blur-[22px] saturate-[1.15] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_42%,#000_82%,transparent)]">
          {[...WAVE, ...WAVE].map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      <div className="relative px-4 pt-10 text-center md:pt-14">
        <svg
          className="mx-auto mb-4 block h-[52px] w-[40px] overflow-visible md:mb-5 md:h-[62px] md:w-[48px]"
          viewBox="42 20 118 149"
          aria-hidden
        >
          <g className="fill-ink" transform="translate(14,0)">
            <path d="M78 36 A 64 64 0 0 1 78 164 Z" />
            <circle
              className="origin-center animate-[disc-hop_2.4s_cubic-bezier(.5,0,.5,1)_infinite] [transform-box:fill-box] motion-reduce:animate-none"
              cx="50"
              cy="146"
              r="19"
            />
          </g>
        </svg>
        <h1 className="font-['Hanken_Grotesk',sans-serif] text-title font-light leading-none tracking-[-0.02em] md:text-display">
          Ask me what to design{firstName ? ', ' : ''}
          {firstName && <span className="text-ink-faint">{firstName}</span>}
        </h1>
      </div>

      {/* the chip strip: wider than its box, clipped and faded at both ends */}
      <div className="relative mx-auto mt-8 hidden h-8 max-w-[1100px] px-[60px] md:block md:mt-10">
        <ChevronLeftIcon
          width={14}
          height={14}
          strokeWidth={1.75}
          className="absolute left-5 top-[9px] text-ink-soft"
          aria-hidden
        />
        <div className="absolute inset-x-[54px] -top-[14px] flex h-[74px] items-start justify-center overflow-hidden pb-7 pt-[14px] [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]">
          <div className="flex flex-none gap-3" onMouseLeave={() => setHovered(null)}>
            {CHIPS.map((chip, i) => {
              const on = i === beamOn
              return (
                <button
                  key={chip.id}
                  type="button"
                  onMouseEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  onClick={() => runChip(chip)}
                  className={cn(
                    /* hover and the beam change colour, opacity and shadow only — nothing
                       shifts, so the row never jitters under the pointer */
                    'relative inline-flex h-8 flex-none items-center gap-2 whitespace-nowrap rounded-pill bg-surface pl-[11px] pr-[13px] text-body text-ink-soft shadow-ring transition-[opacity,box-shadow,color] duration-normal ease-out-quad hover:shadow-ring-hover focus-visible:outline-none',
                    on ? 'text-ink' : 'opacity-60 hover:opacity-100',
                  )}
                >
                  {on && (
                    <span className="chip-beam motion-reduce:animate-none" aria-hidden>
                      <i />
                    </span>
                  )}
                  <span className="grid size-[18px] flex-none place-items-center rounded-[6px] bg-ink/[0.06] text-ink-soft shadow-[inset_0_0_0_0.75px_rgba(0,0,0,0.12)]">
                    {chip.icon}
                  </span>
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
        <ChevronRightIcon
          width={14}
          height={14}
          strokeWidth={1.75}
          className="absolute right-5 top-[9px] text-ink-soft"
          aria-hidden
        />
      </div>

      {/* the composer */}
      <div className="relative mx-auto mt-6 w-full max-w-[740px] px-4 md:mt-[34px] md:px-0">
        <div className="rounded-panel bg-surface px-[18px] pb-3 pt-5 shadow-float">
          <Textarea
            ref={inputRef}
            variant="bare"
            rows={1}
            value={text}
            disabled={busy}
            placeholder="What changed across my canvases this week?"
            aria-label="Ask Doop what to design"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-h-[52px] text-lead leading-[1.45] placeholder:text-ink-ghost md:text-lead"
          />
          <div className="mt-1 flex items-center gap-5 text-body text-ink-soft">
            <button
              type="button"
              className="flex items-center gap-[7px] rounded-md text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={actions.onImport}
              title="Attach a design to start from"
            >
              <AttachmentIcon width={14} height={14} /> Files
            </button>
            <span className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Drafts per prompt: ${drafts}`}
                  className="flex h-7 items-center gap-[6px] rounded-row px-1.5 text-label text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  <CopyIcon width={14} height={14} />
                  {drafts} {drafts === 1 ? 'draft' : 'drafts'}
                  <ChevronDownIcon className="size-3 flex-none text-ink-faint" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-[220px]">
                <DropdownMenuLabel className="px-2.5 pb-1 pt-1.5 text-caption text-ink-faint">
                  Drafts per prompt
                </DropdownMenuLabel>
                {DRAFT_OPTIONS.map((n) => (
                  <DropdownMenuItem key={n} onSelect={() => pickDrafts(n)}>
                    <span className="flex-1">
                      {n} {n === 1 ? 'draft' : 'drafts'}
                      <span className="block text-caption text-ink-faint">
                        {n === 1 ? 'One take on the brief' : `${n} takes, side by side, to pick from`}
                      </span>
                    </span>
                    {n === drafts && <CheckIcon className="size-3.5 flex-none" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ModelPicker disabled={busy} />
            <Button
              variant="primary"
              size="icon"
              className="size-[34px] rounded-full"
              aria-label="Send"
              disabled={busy || !text.trim()}
              onClick={submit}
            >
              <ArrowUpIcon width={14} height={14} strokeWidth={1.75} />
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={actions.onIntegrations}
          className="group mx-[14px] flex w-[calc(100%-28px)] items-center rounded-b-[12px] bg-sub px-5 pb-2.5 pt-3 text-left text-body text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Connect your existing designs for better results
          <ChevronRightIcon
            width={12}
            height={12}
            className="ml-1.5 -translate-x-0.5 text-ink-faint opacity-0 blur-[2px] transition-[opacity,transform,filter] duration-fast ease-out-quad group-hover:translate-x-0 group-hover:opacity-100 group-hover:blur-none motion-reduce:transition-none"
            aria-hidden
          />
          {/* the marks rest a little faded and desaturated; the bar's hover wakes the
              row, and the mark under the pointer comes fully to life and lifts */}
          <span
            className="marks ml-auto flex items-center gap-[9px] [&>*]:opacity-75 [&>*]:saturate-[.8] [&>*]:transition-[opacity,filter,transform] [&>*]:duration-fast [&>*]:ease-out-quad group-hover:[&>*]:opacity-90 group-hover:[&>*]:saturate-[.95] [&>*:hover]:-translate-y-px [&>*:hover]:!opacity-100 [&>*:hover]:!saturate-100 motion-reduce:[&>*]:transition-none"
            aria-hidden
          >
            <span className="grid size-4 place-items-center rounded-[4px] bg-surface shadow-ring">
              <FigmaLogo width={8} height={12} />
            </span>
            <GithubMark />
            <CanvaMark size={16} />
            <PhotoshopMark size={16} />
          </span>
        </button>
      </div>
    </section>
  )
}

/** GitHub's filled mark (Simple Icons, CC0), the one its favicon shows — the
 *  outline in the icon set reads too light next to the other brands here. */
function GithubMark() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" className="fill-ink" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}
