import * as React from 'react'

import { cn } from '@/lib/utils'

/* The floating island of quiet controls over the canvas — the tool rail, the
   zoom pill. Its buttons grow to a 40px touch target on phones — small
   enough to read as a toolbar, big enough to hit. */
function Toolbar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="toolbar"
      role="toolbar"
      className={cn('flex items-center gap-0.5 rounded-[12px] bg-surface p-[5px] shadow-float', className)}
      {...props}
    />
  )
}

/** Forwards its ref so it can anchor a Radix popper (`DropdownMenuTrigger
 *  asChild`, `Tooltip`): without the ref the menu never gets positioned. */
const ToolbarButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(function ToolbarButton(
  { className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="toolbar-button"
      className={cn(
        'grid min-h-10 min-w-10 place-items-center rounded-[7px] border-0 bg-transparent px-1.5 text-[12px] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink sm:size-7 sm:min-h-0 sm:min-w-0 sm:px-0 [&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  )
})

function ToolbarDivider({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="toolbar-divider" className={cn('mx-0.5 h-[18px] w-px bg-line-soft', className)} {...props} />
}

/** A read-only readout between controls (the zoom percentage). */
const ToolbarValue = React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'>>(function ToolbarValue(
  { className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="toolbar-value"
      className={cn('min-w-[44px] px-1 text-center font-mono text-[12px] text-ink sm:min-w-[48px]', className)}
      {...props}
    />
  )
})

export { Toolbar, ToolbarButton, ToolbarDivider, ToolbarValue }
