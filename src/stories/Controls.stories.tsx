import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { IconButton } from '@/components/ui/icon-button'
import { Chip } from '@/components/ui/chip'
import { Kbd } from '@/components/ui/kbd'
import { SearchField } from '@/components/ui/search-field'
import { MenuButton } from '@/components/ui/menu-button'
import { Pressable } from '@/components/ui/pressable'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  CalendarIcon,
  CopyIcon,
  GridIcon,
  HistoryIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  PanelCollapseIcon,
  SearchIcon,
  UserIcon,
} from '@/components/ui/icons'

/**
 * The small controls the dashboard chrome is assembled from. Each exists so
 * a screen never draws its own icon square, ring pill or key cap again.
 */
const meta = { title: 'Primitives/Controls' } satisfies Meta
export default meta

type Story = StoryObj<typeof meta>

function IconButtonDemo() {
  const [on, setOn] = useState<'grid' | 'user'>('grid')
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <IconButton size="sm" aria-label="Search canvases (⌘K)">
          <SearchIcon width={15} height={15} />
        </IconButton>
        <IconButton size="sm" aria-label="Hide sidebar">
          <PanelCollapseIcon width={15} height={15} />
        </IconButton>
        <span className="text-caption text-ink-faint">sm · 24px, the rail's header row</span>
      </div>
      <div className="flex items-center gap-2.5">
        <IconButton aria-label="All canvases" on={on === 'grid'} onClick={() => setOn('grid')}>
          <GridIcon width={14} height={14} />
        </IconButton>
        <IconButton aria-label="Owned by me" on={on === 'user'} onClick={() => setOn('user')}>
          <UserIcon width={14} height={14} />
        </IconButton>
        <IconButton aria-label="Actions" shape="round" className="text-ink-faint">
          <MoreHorizontalIcon className="size-4" />
        </IconButton>
        <IconButton aria-label="Disabled" disabled>
          <GridIcon width={14} height={14} />
        </IconButton>
        <span className="text-caption text-ink-faint">
          md · 32px; `on` keeps the paper-deep fill; round for row actions
        </span>
      </div>
    </div>
  )
}

export const IconButtons: Story = { name: 'IconButton', render: () => <IconButtonDemo /> }

function ChipDemo() {
  const [on, setOn] = useState(0)
  const chips = [
    { label: 'Draft a landing page', icon: <LayoutTemplateIcon width={13} height={13} /> },
    { label: 'Recap a session', icon: <CalendarIcon width={13} height={13} /> },
    { label: 'What changed', icon: <HistoryIcon width={13} height={13} /> },
    { label: 'Run an automation', icon: <span className="font-mono text-caption">/</span> },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3">
      {chips.map((c, i) => (
        <Chip key={c.label} icon={c.icon} on={i === on} onMouseEnter={() => setOn(i)}>
          {c.label}
        </Chip>
      ))}
    </div>
  )
}

/** Chips rest at 60%; the pointer, keyboard focus or `on` bring one fully up. */
export const Chips: Story = { name: 'Chip', render: () => <ChipDemo /> }

export const KeyCaps: Story = {
  name: 'Kbd',
  render: () => (
    <div className="flex items-center gap-4 text-body text-ink-soft">
      <span className="flex items-center gap-1">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
        <span className="ml-1.5">Search</span>
      </span>
      <span className="flex items-center gap-1">
        <Kbd>⌘</Kbd>
        <Kbd>/</Kbd>
        <span className="ml-1.5">Ask Doop</span>
      </span>
      <span className="flex items-center gap-1">
        <Kbd>Esc</Kbd>
        <span className="ml-1.5">Close</span>
      </span>
    </div>
  ),
}

export const SearchFields: Story = {
  name: 'SearchField',
  render: () => (
    <div className="flex max-w-[460px] flex-col gap-5">
      <SearchField
        className="w-[260px]"
        placeholder="Search the gallery"
        aria-label="Search the gallery"
        trailing={<Kbd>⌘K</Kbd>}
      />
      <div className="overflow-hidden rounded-panel bg-surface shadow-float">
        <SearchField
          variant="bar"
          placeholder="Search canvases"
          aria-label="Search canvases"
          inputClassName="text-copy md:text-copy"
        />
        <p className="px-4 py-5 text-body text-ink-faint">the palette's results go here</p>
      </div>
    </div>
  ),
}

function MenuButtonDemo() {
  const [sort, setSort] = useState('Last edited')
  const [drafts, setDrafts] = useState(1)
  return (
    <div className="flex items-center gap-5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton aria-label={`Sort: ${sort}`}>{sort}</MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          {['Last edited', 'Name', 'Created'].map((s) => (
            <DropdownMenuItem key={s} onSelect={() => setSort(s)}>
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton variant="quiet" icon={<CopyIcon width={14} height={14} />} aria-label={`Drafts: ${drafts}`}>
            {drafts} {drafts === 1 ? 'draft' : 'drafts'}
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          {[1, 2, 3].map((n) => (
            <DropdownMenuItem key={n} onSelect={() => setDrafts(n)}>
              {n} {n === 1 ? 'draft' : 'drafts'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="text-caption text-ink-faint">ring in a header; quiet inside a composer</span>
    </div>
  )
}

export const MenuButtons: Story = { name: 'MenuButton', render: () => <MenuButtonDemo /> }

/** The reset under every card tile and list row: no chrome, a focus ring. Tab to it. */
export const Pressables: Story = {
  name: 'Pressable',
  render: () => (
    <div className="flex max-w-[420px] flex-col gap-4">
      <div className="overflow-hidden rounded-card bg-surface shadow-elevation-1">
        <Pressable className="px-3 py-2.5">
          <span className="block text-body font-medium text-ink">Pricing page</span>
          <span className="mt-px block text-caption text-ink-faint">3 frames · edited 2d ago</span>
        </Pressable>
      </div>
      <Pressable layout="inline" focus="ring" className="gap-[7px] rounded-md text-body text-ink-soft hover:text-ink">
        <CopyIcon width={14} height={14} /> Inline action
      </Pressable>
    </div>
  ),
}
