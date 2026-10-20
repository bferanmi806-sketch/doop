import { useState } from 'react'
import type { ModelAccountKind } from '../lib/api'
import { api } from '../lib/api'
import { posthog } from '../lib/posthog'
import { navigate } from '../App'
import { cn } from '@/lib/utils'
import { AgentIcon } from './AgentIcon'
import { DoopMark } from './Logo'
import { useModelAccount } from './ModelAccount'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { CheckIcon, ChevronDownIcon } from './ui/icons'

/* the brand mark each provider's models wear in the picker */
const PROVIDER_MARK: Partial<Record<ModelAccountKind, string>> = {
  chatgpt: 'gpt',
  'openai-key': 'gpt',
  'anthropic-key': 'claude',
}

/**
 * The model the Doop Agent runs on, as a quiet dropdown beside the
 * composer's send button. It is the same per-account choice Settings → Doop
 * Agent makes (PATCH /api/model-account), offered from the connected
 * provider's curated menu. With no account connected there is nothing to
 * choose between, so it says so and links to Settings.
 */
export function ModelPicker({ disabled = false }: { disabled?: boolean }) {
  const { account, set, refresh } = useModelAccount()
  const [busy, setBusy] = useState(false)
  const kind = account?.connected ? account.kind : undefined
  const menu = (kind && account?.menus?.[kind]) ?? []
  const current = menu.find((m) => m.id === account?.model)
  const label = current?.name ?? (account?.connected ? (account.model ?? 'Model') : 'Doop Agent')
  const mark = kind ? PROVIDER_MARK[kind] : undefined

  async function pick(model: string) {
    if (model === account?.model) return
    setBusy(true)
    try {
      set(await api.setAgentModel(model))
      posthog.capture('agent_model_changed', { model, via: 'composer' })
    } catch (e) {
      console.error(e)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || busy || !account}
          aria-label={`Model: ${label}`}
          className={cn(
            'flex h-7 min-w-0 items-center gap-[5px] rounded-[7px] px-1.5 text-[12px] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink disabled:opacity-50',
            busy && 'animate-[stream-pulse_1.2s_ease-in-out_infinite]',
          )}
        >
          {mark ? (
            <span className="grid size-3 flex-none place-items-center">
              <AgentIcon name={mark} size={12} />
            </span>
          ) : (
            /* no provider behind it: the agent's own mark */
            <span className="grid size-3 flex-none place-items-center">
              <DoopMark size={11} className="block" />
            </span>
          )}
          <span className="truncate">{label}</span>
          <ChevronDownIcon className="size-3 flex-none text-ink-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-[260px]">
        {menu.length > 0 ? (
          <>
            <DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-[11px] text-ink-faint">
              Doop Agent model
            </DropdownMenuLabel>
            {menu.map((m) => (
              <DropdownMenuItem key={m.id} onSelect={() => void pick(m.id)}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{m.name}</span>
                  <span className="truncate text-[11px] text-ink-faint">{m.blurb}</span>
                </span>
                {m.id === account?.model && <CheckIcon className="size-3.5 flex-none" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : (
          <DropdownMenuLabel className="px-2.5 pt-1.5 pb-2 text-[11.5px] leading-[1.45] text-ink-soft">
            No model account connected — the Doop Agent runs on the server’s model when one is set up.
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem onSelect={() => navigate('/settings?pane=agent')}>
          {account?.connected ? 'Model settings…' : 'Connect a model…'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
