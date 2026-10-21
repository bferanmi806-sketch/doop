import type { Meta, StoryObj } from '@storybook/react-vite'
import { AgentIcon } from '@/components/AgentIcon'
import { DoopMark, Logo } from '@/components/Logo'
import { PresenceFace } from '@/components/PeerAvatars'
import { Avatar } from '@/components/ui/avatar'
import { CanvaMark, GlobeIcon, PhotoshopMark, RadioTowerIcon } from '@/components/ImportSources'
import { FigmaLogo } from '@/integrations/figma/Tile'
import { ClockTile, MetaTile } from '@/components/AutomateShell'
import { colorFor } from '../../shared/types'

/**
 * Every mark the product wears: its own, the agents', the people's and the
 * brands it connects to. These are the only places a logo should come from.
 */
const meta = { title: 'Marks' } satisfies Meta
export default meta

type Story = StoryObj<typeof meta>

export const Doop: Story = {
  render: () => (
    <div className="flex items-center gap-5">
      <Logo />
      <Logo className="size-[26px] rounded-row" />
      <DoopMark size={24} />
      <DoopMark size={13} />
    </div>
  ),
}

export const Agents: Story = {
  render: () => (
    <div className="flex items-center gap-5 text-body">
      {['Claude Code', 'Codex', 'Cursor', 'Doop'].map((name) => (
        <span key={name} className="flex items-center gap-2" style={{ color: colorFor(name) }}>
          <AgentIcon name={name} size={14} />
          <span className="text-ink-soft">{name}</span>
        </span>
      ))}
    </div>
  ),
}

export const People: Story = {
  name: 'People (presence faces)',
  render: () => (
    <div className="flex items-center gap-5">
      <PresenceFace
        name="Kevin Goedecke"
        color={colorFor('kevin')}
        kind="user"
        size={28}
        className="text-caption shadow-none"
      />
      <PresenceFace name="Mia Chen" color={colorFor('mia')} kind="user" size={24} />
      <PresenceFace name="Claude" color={colorFor('Claude')} kind="agent" size={24} glaze />
      <span className="flex">
        <Avatar name="Kevin Goedecke" color={colorFor('kevin')} stacked />
        <Avatar name="Mia Chen" color={colorFor('mia')} stacked />
        <Avatar name="Codex" kind="agent" stacked />
      </span>
    </div>
  ),
}

export const Brands: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <span className="grid size-4 place-items-center rounded-[4px] bg-surface shadow-ring">
        <FigmaLogo width={8} height={12} />
      </span>
      <CanvaMark size={16} />
      <PhotoshopMark size={16} />
      <MetaTile size={24} />
      <ClockTile size={24} />
      <GlobeIcon className="size-5 text-ink" />
      <RadioTowerIcon className="size-5 text-ink" />
      <span className="ml-4 text-caption text-ink-faint">16px in logo rows, 24px on picker tiles</span>
    </div>
  ),
}
