import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Segmented, SegmentedIconItem, SegmentedIcons, SegmentedItem } from '@/components/ui/segmented'
import { ToggleChip, ToggleChipGroup, ToggleChipItem } from '@/components/ui/toggle-chip'
import {
  DropdownMenu,
  DropdownMenuCaption,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { ListItem, ListMeta, ListRow, ListSection, ListSummary, ListTitle } from '@/components/ui/list'
import { ChevronDownIcon, CopyIcon, GridIcon, ListIcon, ShareIcon, TrashIcon } from '@/components/ui/icons'

const meta = { title: 'Primitives/Navigation' } satisfies Meta
export default meta

type Story = StoryObj<typeof meta>

export const TabsStory: Story = {
  name: 'Tabs',
  render: () => (
    <Tabs defaultValue="all" className="max-w-[420px]">
      <TabsList className="h-10 w-full border border-line bg-surface p-1 shadow-card">
        <TabsTrigger value="all">All · 12</TabsTrigger>
        <TabsTrigger value="mine">Mine · 9</TabsTrigger>
        <TabsTrigger value="shared">Shared · 3</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="pt-3 text-body text-ink-soft">
        Every canvas you can open.
      </TabsContent>
      <TabsContent value="mine" className="pt-3 text-body text-ink-soft">
        The ones you made.
      </TabsContent>
      <TabsContent value="shared" className="pt-3 text-body text-ink-soft">
        The ones you were invited to.
      </TabsContent>
    </Tabs>
  ),
}

function SegmentedDemo() {
  const [view, setView] = useState('grid')
  const [tier, setTier] = useState('fast')
  return (
    <div className="flex items-center gap-6">
      <SegmentedIcons value={view} onValueChange={setView} aria-label="View">
        <SegmentedIconItem value="grid" aria-label="Grid view">
          <GridIcon width={14} height={14} />
        </SegmentedIconItem>
        <SegmentedIconItem value="list" aria-label="List view">
          <ListIcon width={14} height={14} />
        </SegmentedIconItem>
      </SegmentedIcons>
      <Segmented value={tier} onValueChange={setTier} aria-label="Model tier">
        <SegmentedItem value="fast">Fast</SegmentedItem>
        <SegmentedItem value="smart">Smart</SegmentedItem>
      </Segmented>
    </div>
  )
}

export const SegmentedStory: Story = { name: 'Segmented', render: () => <SegmentedDemo /> }

function ChipsDemo() {
  const [model, setModel] = useState('gpt-image-2')
  return (
    <ToggleChipGroup aria-label="Image model" value={model} onValueChange={setModel}>
      <ToggleChipItem value="gpt-image-2">GPT Image 2</ToggleChipItem>
      <ToggleChipItem value="nano-banana-2">Nano Banana 2</ToggleChipItem>
      <ToggleChip state="idle" title="Connect a Seedream account first">
        Seedream 5 Pro
      </ToggleChip>
    </ToggleChipGroup>
  )
}

export const ToggleChips: Story = { name: 'Toggle chips', render: () => <ChipsDemo /> }

export const Menu: Story = {
  name: 'Dropdown menu',
  render: () => (
    <div className="flex items-start gap-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            Last edited <ChevronDownIcon width={12} height={12} className="text-ink-faint" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[190px]">
          <DropdownMenuItem>
            <ShareIcon className="size-4" /> Share
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CopyIcon className="size-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCaption>Danger zone</DropdownMenuCaption>
          <DropdownMenuItem tone="danger">
            <TrashIcon className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipProvider>
        <Tooltip label="Working right now">
          <Button variant="ghost">Hover me</Button>
        </Tooltip>
      </TooltipProvider>
    </div>
  ),
}

export const Lists: Story = {
  render: () => (
    <ListSection className="max-w-[420px]">
      <ListRow>
        <ListItem>
          <ListTitle>Recap this week</ListTitle>
          <ListSummary>Claude · 3 frames</ListSummary>
        </ListItem>
        <ListMeta>2m ago</ListMeta>
      </ListRow>
      <ListRow>
        <ListItem>
          <ListTitle>Pricing page, three tiers</ListTitle>
          <ListSummary>Codex · running</ListSummary>
        </ListItem>
        <ListMeta>now</ListMeta>
      </ListRow>
    </ListSection>
  ),
}
