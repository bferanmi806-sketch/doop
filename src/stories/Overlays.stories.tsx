import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Modal, ModalActions, ModalEyebrow, ModalLede, ModalTitle } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'

const meta = { title: 'Primitives/Overlays' } satisfies Meta
export default meta

type Story = StoryObj<typeof meta>

function ModalDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Name a workspace</Button>
      {open && (
        <Modal size="sm" showClose onClose={() => setOpen(false)}>
          <ModalEyebrow>Workspaces</ModalEyebrow>
          <ModalTitle className="mt-2">Name your workspace</ModalTitle>
          <ModalLede>A workspace is your team’s shared home: everyone in it can open every canvas inside.</ModalLede>
          <Field label="Name" labelVariant="form" htmlFor="ws" className="mt-5">
            <Input id="ws" placeholder="Acme design" autoFocus />
          </Field>
          <ModalActions>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Create workspace
            </Button>
          </ModalActions>
        </Modal>
      )}
    </>
  )
}

export const ModalStory: Story = { name: 'Modal', render: () => <ModalDemo /> }

function ConfirmDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete canvas
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete “Pricing page”?"
        description="This permanently deletes the canvas and everything in it. This can’t be undone."
        confirmLabel="Delete canvas"
        destructive
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

export const Confirm: Story = { name: 'Confirm dialog', render: () => <ConfirmDemo /> }

export const SheetStory: Story = {
  name: 'Sheet',
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Getting started</SheetTitle>
          <SheetDescription>Connect your own agent, or give the Doop Agent a task.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}
