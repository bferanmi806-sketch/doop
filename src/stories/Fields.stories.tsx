import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { Checkbox, CheckboxCard } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { SearchIcon } from '@/components/ui/icons'

const meta = { title: 'Primitives/Fields' } satisfies Meta
export default meta

type Story = StoryObj<typeof meta>

export const Inputs: Story = {
  render: () => (
    <div className="flex max-w-[420px] flex-col gap-5">
      <Field label="Canvas name" hint="Shown in the tab and on the home tiles." htmlFor="f1">
        <Input id="f1" placeholder="Untitled canvas" />
      </Field>
      <Field label="Website URL" labelVariant="form" htmlFor="f2">
        <Input id="f2" variant="mono" inputSize="lg" placeholder="https://example.com" />
      </Field>
      <Field label="Plain label" labelVariant="plain" htmlFor="f3">
        <Input id="f3" inputSize="sm" placeholder="Small field" />
      </Field>
      <Field label="Brief" htmlFor="f4">
        <Textarea id="f4" rows={3} placeholder="What should the agent design?" />
      </Field>
    </div>
  ),
}

/** The ring field the home list and the search palette use: no border, a 1px ring. */
export const SearchField: Story = {
  name: 'Search field (ring)',
  render: () => (
    <label className="flex h-[30px] w-[220px] items-center gap-[7px] rounded-control bg-surface px-[10px] text-ink-faint shadow-ring focus-within:shadow-ring-hover">
      <SearchIcon width={14} height={14} aria-hidden />
      <Input
        placeholder="Search canvases"
        aria-label="Search canvases"
        variant="bare"
        inputSize="auto"
        className="flex-1 text-body md:text-body"
      />
    </label>
  ),
}

function CheckboxDemo() {
  const [on, setOn] = useState(true)
  return (
    <div className="flex max-w-[420px] flex-col gap-4">
      <label className="flex items-center gap-2.5 text-body">
        <Checkbox checked={on} onChange={(e) => setOn(e.target.checked)} /> Extract the design system too
      </label>
      <CheckboxCard
        checked={!on}
        onChange={(checked) => setOn(!checked)}
        title="Pricing page"
        description="3 frames · edited 2d ago"
      />
    </div>
  )
}

export const Checkboxes: Story = { render: () => <CheckboxDemo /> }

export const ProgressBar: Story = {
  name: 'Progress',
  render: () => (
    <div className="flex max-w-[240px] flex-col gap-3">
      <Progress value={3} max={10} aria-label="Free tasks left" />
      <span className="text-caption text-ink-faint">3 of 10 free tasks left.</span>
    </div>
  ),
}
