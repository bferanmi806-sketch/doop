import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/lib/utils'

/* The chip: a small mono-type tag. Doop uses it for counts, roles, states and
   model names, so the tones below are the vocabulary — nothing should invent
   its own pill colour. */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-[5px] py-px text-micro font-medium leading-[1.4]',
  {
    variants: {
      tone: {
        default:
          'border-transparent bg-transparent text-ink-faint shadow-[inset_0_0_0_0.75px_rgba(0,0,0,0.14)] dark:shadow-[inset_0_0_0_0.75px_rgba(255,255,255,0.18)]',
        admin: 'border-accent-ink/40 bg-accent-ink/[0.08] text-accent-ink',
        banned: 'border-warning-ink/35 bg-warning/[0.12] text-warning-ink',
        accent: 'border-accent-ink/40 bg-transparent text-accent-ink',
        outline: 'border-line bg-transparent text-ink-soft',
      },
      interactive: {
        true: 'cursor-pointer transition-colors hover:bg-current/10',
        false: '',
      },
    },
    defaultVariants: { tone: 'default', interactive: false },
  },
)

function Badge({
  className,
  tone,
  interactive,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'
  return <Comp data-slot="badge" className={cn(badgeVariants({ tone, interactive, className }))} {...props} />
}

export { Badge, badgeVariants }
