import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/* A glyph in a square: the rail's search and collapse controls, a row's
   "more" button, a modal's close. Quiet by default — no ring, the paper-deep
   fill appears on hover and stays while it is `on` (a toggled control, an open
   menu). The label is what the button says to a screen reader and the tooltip,
   so it is not optional. */
const iconButtonVariants = cva(
  [
    'inline-grid flex-none cursor-pointer place-items-center text-ink-soft',
    'transition-[background-color,color,box-shadow] duration-normal ease-out-quad',
    'hover:bg-paper-deep hover:text-ink',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
    'disabled:pointer-events-none disabled:opacity-45',
    'data-[on]:bg-paper-deep data-[on]:text-ink',
  ],
  {
    variants: {
      /* sm sits in a 30px header row, md is the narrow rail's and the row-action square */
      size: { sm: 'size-6 rounded-md', md: 'size-8 rounded-row' },
      shape: { square: '', round: 'rounded-full' },
    },
    defaultVariants: { size: 'md', shape: 'square' },
  },
)

type IconButtonProps = Omit<React.ComponentProps<'button'>, 'aria-label'> &
  VariantProps<typeof iconButtonVariants> & {
    /** required: the glyph has no text of its own */
    'aria-label': string
    /** the pressed state of a toggle, or the open state of what it reveals */
    on?: boolean
  }

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size, shape, on = false, type, title, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-slot="icon-button"
      data-on={on || undefined}
      aria-pressed={on || undefined}
      title={title ?? props['aria-label']}
      className={cn(iconButtonVariants({ size, shape, className }))}
      {...props}
    />
  )
})

export { IconButton, iconButtonVariants }
