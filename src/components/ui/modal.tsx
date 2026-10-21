import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { XIcon } from './icons'

/* Doop's modal: a hairline card lifted on the soft pop shadow, over a dimmed
   canvas. Built on Radix so it brings a focus trap, Escape and scroll-locking
   with it — the hand-rolled backdrop divs it replaces had none of that. Call
   sites mount it conditionally, so `open` defaults to true and `onClose` is
   the only dismissal wiring they need. */
const modalVariants = cva(
  [
    'fixed left-1/2 top-1/2 z-[60] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
    'rounded-[14px] border border-line bg-surface p-5 text-ink shadow-pop',
    'outline-none motion-safe:data-[state=open]:animate-[modal-in_250ms_var(--ease-out-quint)] motion-safe:data-[state=closed]:animate-[modal-out_150ms_var(--ease-out-quint)_forwards]',
    'max-h-[calc(100dvh-24px)] sm:max-h-[calc(100vh-96px)] sm:rounded-[16px] sm:p-7',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-[min(460px,calc(100vw-24px))]',
        md: 'max-w-[min(520px,calc(100vw-24px))]',
        lg: 'max-w-[min(620px,calc(100vw-24px))] sm:max-w-[660px]',
        xl: 'max-w-[min(760px,calc(100vw-24px))]',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

const overlayCls =
  'fixed inset-0 z-[60] bg-[rgba(18,18,23,0.45)] motion-safe:data-[state=open]:animate-[fade-in_250ms_ease-out] motion-safe:data-[state=closed]:animate-[fade-out_150ms_ease-out_forwards]'

/* Call sites mount a Modal while it is open and unmount it to close, so by
   the time Radix could play a closing animation the node is gone. Instead,
   when an open modal unmounts, a copy of its card and backdrop is left in
   the document for the length of the closing animation and then removed.
   The copy is inert and ignores the pointer; typed values and scroll
   positions are carried over (cloneNode copies neither) so a form does not
   blank out or jump to the top as it fades. The layout-effect cleanup runs
   before React detaches the nodes, which is what makes the copy possible.
   Under reduced motion there is no animation to show, so no copy is left.
   StrictMode runs the cleanup once at mount too, with the node still in the
   document, so the copy is taken at once but only kept if the original has
   really gone a tick later. */
const GHOST_MS = 200
function leaveGhost(node: HTMLElement | null) {
  if (!node || !node.isConnected) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const ghost = node.cloneNode(true) as HTMLElement
  const inputs = node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
  ghost.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((el, i) => {
    const source = inputs[i]
    if (source) el.value = source.value
  })
  /* same tree shape on both sides, so the i-th element of one is the i-th
     of the other; copy scroll offsets once the ghost is in the document */
  const sources = [node, ...node.querySelectorAll<HTMLElement>('*')]
  const copies = [ghost, ...ghost.querySelectorAll<HTMLElement>('*')]
  const scrolled = sources.flatMap((el, i) =>
    el.scrollTop || el.scrollLeft ? [[i, el.scrollTop, el.scrollLeft] as const] : [],
  )
  ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
  ghost.setAttribute('inert', '')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.setAttribute('data-state', 'closed')
  ghost.style.pointerEvents = 'none'
  queueMicrotask(() => {
    if (node.isConnected) return
    document.body.appendChild(ghost)
    /* a DOM that does not run CSS animations (the test runners) would leave
       the copy sitting there for the next query to find; with nothing to
       show, it goes at once */
    if (ghost.getAnimations({ subtree: true }).length === 0) {
      ghost.remove()
      return
    }
    for (const [i, top, left] of scrolled) {
      const copy = copies[i]
      if (copy) {
        copy.scrollTop = top
        copy.scrollLeft = left
      }
    }
    window.setTimeout(() => ghost.remove(), GHOST_MS)
  })
}

function Modal({
  open = true,
  onClose,
  showClose = false,
  size,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Content>, 'onOpenChange'> &
  VariantProps<typeof modalVariants> & {
    open?: boolean
    onClose: () => void
    /** an × in the top-right corner. On a phone a wide modal leaves almost
     *  no backdrop to tap and there is no Escape key, so a modal without a
     *  Cancel of its own needs this to be closable at all */
    showClose?: boolean
  }) {
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(
    () => () => {
      leaveGhost(overlayRef.current)
      leaveGhost(contentRef.current)
    },
    [],
  )
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay ref={overlayRef} className={overlayCls} />
        <DialogPrimitive.Content
          ref={contentRef}
          data-slot="modal"
          className={cn(modalVariants({ size, className }))}
          {...props}
        >
          {showClose && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-3 right-3 z-[1] grid size-9 place-items-center rounded-[9px] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-faint sm:top-4 sm:right-4"
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** The small mono caption above a modal title. */
function ModalEyebrow({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="modal-eyebrow"
      className={cn(
        'font-mono text-[10px] font-[650] uppercase leading-none tracking-[0.14em] text-accent-ink',
        className,
      )}
      {...props}
    />
  )
}

function ModalTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="modal-title"
      className={cn('font-serif text-[26px] font-normal tracking-[-0.012em] sm:text-[28px]', className)}
      {...props}
    />
  )
}

function ModalLede({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="modal-lede"
      className={cn('mt-2 text-sm leading-[1.55] text-ink-soft', className)}
      {...props}
    />
  )
}

/** Footer action row — buttons go full-width side by side on small phones. */
function ModalActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="modal-actions"
      className={cn(
        'mt-[26px] flex flex-wrap justify-end gap-2.5 [&>*]:max-xs:flex-1 [&>*]:max-xs:justify-center',
        className,
      )}
      {...props}
    />
  )
}

/** Pushes the actions after it to the other end of the row. */
function ModalSpacer() {
  return <span data-slot="modal-spacer" className="flex-1" aria-hidden />
}

/** A read-only block of markdown or copy inside a modal. */
function MarkdownBlock({ className, ...props }: React.ComponentProps<'pre'>) {
  return (
    <pre
      data-slot="markdown-block"
      className={cn(
        'mt-3.5 max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-[12px] border border-line bg-paper px-[18px] py-4 font-mono text-[12.5px] leading-[1.65] text-ink [word-break:break-word]',
        className,
      )}
      {...props}
    />
  )
}

export {
  Modal,
  ModalEyebrow,
  ModalTitle,
  ModalLede,
  ModalActions,
  ModalSpacer,
  MarkdownBlock,
  modalVariants,
  overlayCls,
}
