import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '../components/ui/button'

/** One provider's card: identity row, whatever the provider needs to say or
 *  ask in the middle, and a footer of note + actions. */
export function IntegrationCard({
  tile,
  name,
  detail,
  connected,
  footnote,
  actions,
  children,
}: {
  tile: ReactNode
  name: string
  detail: string
  connected: boolean
  footnote: string
  actions: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-[150px] flex-col gap-3 rounded-panel border border-line bg-surface px-[18px] pb-4 pt-[18px] shadow-card">
      <div className="flex items-center gap-[11px]">
        {tile}
        <div className="min-w-0">
          <div className="text-copy font-medium tracking-[-0.01em]">{name}</div>
          <div className="mt-0.5 truncate text-label text-ink-soft">{detail}</div>
        </div>
        <span
          className={cn(
            'ml-auto inline-flex flex-none items-center gap-1.5 text-caption',
            connected ? 'text-ink-soft' : 'text-ink-faint',
          )}
        >
          <span className={cn('size-[7px] rounded-full', connected ? 'bg-success' : 'bg-line')} />
          {connected ? 'connected' : 'not connected'}
        </span>
      </div>
      {children}
      <div className="mt-auto flex items-center gap-2">
        <span className="flex-1 text-label text-ink-faint">{footnote}</span>
        {actions}
      </div>
    </div>
  )
}

export function DisconnectButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="bare" size="sm" className="text-ink-soft" disabled={disabled} onClick={onClick}>
      Disconnect
    </Button>
  )
}
