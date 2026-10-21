import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardBody, CardDescription, CardHeader, CardRow, CardTitle } from '@/components/ui/card'
import { Callout } from '@/components/ui/callout'
import { Note } from '@/components/ui/note'
import { Badge } from '@/components/ui/badge'
import { Dot } from '@/components/ui/dot'
import { Skeleton } from '@/components/ui/skeleton'
import { Toast, ToastAction, ToastSpinner } from '@/components/ui/toast'
import { CodeBlock } from '@/components/ui/code-block'
import { Button } from '@/components/ui/button'

const meta = { title: 'Primitives/Surfaces' } satisfies Meta
export default meta

type Story = StoryObj<typeof meta>

export const Cards: Story = {
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Doop Agent</CardTitle>
          <CardDescription>
            Choose how the Doop Agent runs on your canvases: a connected model account or Claude CLI on your desktop.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <CardRow label="Model" action={<Button size="sm">Change</Button>}>
            Claude Opus 5.5
          </CardRow>
        </CardBody>
      </Card>
      <Card tone="flat">
        <CardBody>A flat card: a hairline instead of the elevation ring.</CardBody>
      </Card>
    </div>
  ),
}

export const Notices: Story = {
  name: 'Callouts, notes, badges, dots',
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Callout>Your free tasks are used up.</Callout>
        <Callout tone="success">Connected — the agent runs on your subscription.</Callout>
        <Callout tone="error">Couldn’t reach Figma. Check the token and try again.</Callout>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Note>12 frames · edited 2d ago</Note>
        <Note tone="success">Saved</Note>
        <Note tone="error">Couldn’t save</Note>
        <Note size="sm">A larger note</Note>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>free</Badge>
        <Badge tone="accent">team</Badge>
        <Badge tone="outline">Not connected</Badge>
        <Badge tone="admin">admin</Badge>
        <Badge tone="banned">banned</Badge>
        <Badge tone="accent" interactive>
          unclaimed — make mine
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-body text-ink-soft">
        <span className="flex items-center gap-2">
          <Dot tone="running" /> running
        </span>
        <span className="flex items-center gap-2">
          <Dot tone="done" /> done
        </span>
        <span className="flex items-center gap-2">
          <Dot tone="failed" /> failed
        </span>
        <span className="flex items-center gap-2">
          <Dot tone="idle" /> idle
        </span>
        <span className="flex items-center gap-2">
          <Dot tone="muted" size="sm" /> muted, small
        </span>
      </div>
    </div>
  ),
}

export const Loading: Story = {
  name: 'Skeleton & toast',
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton index={1} className="h-24 rounded-card" />
        <Skeleton index={2} className="h-24 rounded-card" />
      </div>
      <div className="relative h-20">
        <Toast className="absolute bottom-0 left-0">
          <ToastSpinner /> Duplicating canvas…
          <ToastAction>Undo</ToastAction>
        </Toast>
      </div>
    </div>
  ),
}

export const Code: Story = {
  render: () => (
    <div className="flex max-w-[520px] flex-col gap-3">
      <CodeBlock text="claude mcp add --transport http doop https://doop.design/mcp" />
      <CodeBlock density="rail" text="claude mcp add --transport http doop https://doop.design/mcp" />
    </div>
  ),
}
