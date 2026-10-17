import { cursorMcpInstallUrl } from '../lib/cursorConnection'
import { Button } from './ui/button'
import { CodeBlock } from './ui/code-block'

export function CursorInstall({ mcpUrl }: { mcpUrl: string }) {
  return (
    <div className="text-[12.5px] leading-[1.5] text-ink-soft">
      <Button asChild variant="solid" className="mt-2.5">
        <a href={cursorMcpInstallUrl(mcpUrl)}>Add to Cursor</a>
      </Button>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">Connection help</summary>
        <p className="mt-2">
          If Cursor does not open, open its <strong>Customize</strong> panel and add a custom MCP server. Merge this{' '}
          <code>doop</code> entry into your MCP configuration, keeping any existing servers. If Doop is already
          connected through a plugin, use that connection.
        </p>
        <CodeBlock text={JSON.stringify({ mcpServers: { doop: { url: mcpUrl } } }, null, 2)} className="mt-2.5" />
      </details>
    </div>
  )
}
