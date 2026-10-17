import { navigate } from '../App'
import { ConnectModal } from '../components/ConnectModal'
import { Button } from '../components/ui/button'
import { AuthScreen } from '../components/ui/screen'
import { parseCodexSetup } from '../lib/codexConnection'

export function DesktopCodexSetup() {
  const request = parseCodexSetup(location.search, location.origin)
  if (!request) {
    return (
      <AuthScreen>
        <div className="max-w-md space-y-4 p-6">
          <h1 className="text-lg font-semibold">Open the matching Doop server</h1>
          <p className="text-sm text-ink-soft">
            This setup link is for a different Doop server or is incomplete. Open Connect AI in the desktop app for that
            server, or use the manual Codex setup in your browser.
          </p>
          <Button onClick={() => navigate('/')}>Back to Doop</Button>
        </div>
      </AuthScreen>
    )
  }
  return (
    <ConnectModal
      initialAgent="codex"
      showAgentStatus={false}
      canvasId={request.canvasId}
      onClose={() => navigate(request.canvasId ? `/c/${request.canvasId}` : '/')}
    />
  )
}
