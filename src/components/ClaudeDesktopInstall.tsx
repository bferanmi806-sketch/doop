import { useState } from 'react'
import { addToClaudeDesktop, canAddToClaudeDesktop } from '../lib/claudeConnection'
import { posthog } from '../lib/posthog'
import { Button } from './ui/button'

export function ClaudeDesktopInstall({ mcpUrl }: { mcpUrl: string }) {
  const [state, setState] = useState<'idle' | 'opening' | 'opened'>('idle')
  const [error, setError] = useState('')

  async function connect() {
    setState('opening')
    setError('')
    try {
      await addToClaudeDesktop(mcpUrl)
      setState('opened')
      posthog.capture('claude_extension_opened')
    } catch (err) {
      setState('idle')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="mt-2.5">
      {canAddToClaudeDesktop() ? (
        <>
          <Button variant="solid" disabled={state === 'opening'} onClick={() => void connect()}>
            {state === 'opening' ? 'Opening Claude…' : state === 'opened' ? 'Open Claude again' : 'Add to Claude'}
          </Button>
          {state === 'opened' && (
            <p className="mt-2 text-xs text-ink-soft" role="status">
              Confirm the installation in Claude, then approve the Doop sign-in.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs leading-relaxed text-ink-soft">
          Open this server in an updated Doop desktop app to add Claude directly. In a browser, you can use the manual
          installation below.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-accent-ink" role="alert">
          {error}
        </p>
      )}
      <details className="mt-3 text-xs leading-relaxed text-ink-soft">
        <summary className="cursor-pointer">Install manually</summary>
        <p className="mt-2">
          <a className="underline underline-offset-2" href="/claude-extension/doop.mcpb" download="doop.mcpb">
            Download extension
          </a>
          , then open it with Claude Desktop. Set <strong>Doop server URL</strong> to{' '}
          <code className="break-all">{mcpUrl}</code>. If the file doesn’t open, use Claude’s{' '}
          <strong>Settings → Extensions → Advanced settings → Install Extension</strong>.
        </p>
      </details>
    </div>
  )
}
