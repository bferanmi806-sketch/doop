import { useState } from 'react'
import { navigate } from '../App'
import { api } from '../lib/api'
import { posthog } from '../lib/posthog'
import { openCanvasTab } from '../lib/desktop'
import { ModelAccountPanel } from '../components/ModelAccount'
import { ImageModelCard } from '../components/ImageModelCard'
import { useAllowance } from '../components/TeamAllowance'
import { ACCOUNT_KIND_LABELS } from '../../shared/modelMenu'
import { AccountSettings } from '../components/AccountSettings'
import { AppearanceSettings } from '../components/AppearanceSettings'
import { AgentKeys } from '../components/AgentKeys'
import { Webhooks } from '../components/Webhooks'
import { AccountMenu, IconBack, IconKey, IconSpark, IconTheme, IconUser, IconWebhooks } from '../components/DashShell'
import { AppRail, RailItem, RailLabel, pageTitleCls, railLayout } from '../components/AppRail'
import { BellIcon, KeyIcon, MoonIcon, PlusIcon, SparkIcon, UserIcon } from '../components/ui/icons'

const railIcon = { width: 14, height: 14, 'aria-hidden': true } as const
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Button } from '../components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { DashContent, DashHeader, DashLayout, DashMain, DashSubtitle, DashTitle } from '../components/ui/dash'

type Pane = 'agent' | 'keys' | 'webhooks' | 'account' | 'appearance'

/* the heading over each pane, and the line under it */
const panes: Record<Pane, { title: string; blurb: string }> = {
  agent: { title: 'Doop Agent', blurb: 'Which model account the agent runs on, for every canvas you work on.' },
  keys: { title: 'Agent keys', blurb: 'Bearer credentials that let headless agents design as you.' },
  webhooks: {
    title: 'Webhooks',
    blurb: 'HTTP calls to your systems when something happens on a canvas you can open.',
  },
  account: { title: 'Your account', blurb: 'Who you are on every canvas — and how you get back into this one.' },
  appearance: {
    title: 'Appearance',
    blurb: 'How Doop looks in this browser: light, dark, or whatever your system is.',
  },
}

function isPane(value: string | null): value is Pane {
  return value !== null && value in panes
}

/** ?pane= deep-links a section — the connect modal sends people to ?pane=keys. */
function initialPane(): Pane {
  const pane = new URLSearchParams(location.search).get('pane')
  return isPane(pane) ? pane : 'agent'
}

/**
 * Account settings. Today it holds one thing — which model account the Doop
 * Agent runs on once the free tasks are spent — but it is the account-level
 * home for that kind of setting, so the canvas surfaces can link here instead
 * of carrying their own copy of it.
 *
 * It wears the same shell as the home dashboard: same rail, same top bar, same
 * account menu. Only the rail's middle changes, to a settings sub-nav.
 */
export function Settings() {
  /* the sub-nav switches panes rather than scrolling to an anchor — on a page
     this short an anchor jump looks like nothing happened */
  const [pane, setPane] = useState<Pane>(initialPane)
  const { allowance, refresh } = useAllowance()
  const left = allowance ? Math.max(0, allowance.limit - allowance.used) : null
  /* arriving from a canvas (the free-tier wall) should not cost you your
     place — only same-origin canvas paths are honoured */
  const from = new URLSearchParams(location.search).get('from')
  const back = from && /^\/c\/[A-Za-z0-9_-]+$/.test(from) ? from : '/'

  async function createCanvas() {
    const canvas = await api.createCanvas('Untitled canvas')
    posthog.capture('canvas_created')
    if (!openCanvasTab(canvas.id, canvas.name)) navigate(`/c/${canvas.id}`)
  }

  const meter = allowance
    ? allowance.byoModel
      ? allowance.byoKind === 'gemini-cloud'
        ? 'Gemini cloud pilot selected — connection managed by your operator.'
        : allowance.byoKind === 'claude-local'
          ? 'Claude CLI selected — runs on your connected desktop.'
          : `Running on your ${allowance.byoKind === 'chatgpt' || !allowance.byoKind ? 'ChatGPT subscription' : `${ACCOUNT_KIND_LABELS[allowance.byoKind]} key`}.`
      : allowance.limit <= 0
        ? 'No free tasks on this server — connect an account to use the Doop Agent.'
        : left === 0
          ? 'Your free tasks are used up.'
          : `${left} of ${allowance.limit} free task${allowance.limit === 1 ? '' : 's'} left.`
    : null

  return (
    <DashLayout className={railLayout}>
      <AppRail active={null}>
        <RailLabel>Settings</RailLabel>
        <nav className="flex flex-col gap-0.5">
          <RailItem
            icon={<SparkIcon {...railIcon} />}
            label="Doop Agent"
            on={pane === 'agent'}
            go={() => setPane('agent')}
          />
          <RailItem
            icon={<KeyIcon {...railIcon} />}
            label="Agent keys"
            on={pane === 'keys'}
            go={() => setPane('keys')}
          />
          <RailItem
            icon={<BellIcon {...railIcon} />}
            label="Webhooks"
            on={pane === 'webhooks'}
            go={() => setPane('webhooks')}
          />
          <RailItem
            icon={<UserIcon {...railIcon} />}
            label="Your account"
            on={pane === 'account'}
            go={() => setPane('account')}
          />
          <RailItem
            icon={<MoonIcon {...railIcon} />}
            label="Appearance"
            on={pane === 'appearance'}
            go={() => setPane('appearance')}
          />
        </nav>
      </AppRail>

      <DashMain className="[background:var(--paper)]">
        <DashHeader className="border-b-0 bg-transparent backdrop-blur-none">
          {back !== '/' && (
            <Button
              variant="ghost"
              className="h-10 gap-[7px] rounded-[8px] text-[12.5px] md:h-8"
              onClick={() => navigate(back)}
            >
              <IconBack /> Back to canvas
            </Button>
          )}
          <span className="flex-1" />
          <Button
            variant="primary"
            className="h-10 gap-[7px] rounded-[8px] pl-2.5 pr-3 text-[12.5px] md:h-8"
            onClick={createCanvas}
          >
            <PlusIcon width={15} height={15} strokeWidth={1.75} />
            <span className="max-xs:hidden">New canvas</span>
            <span className="hidden max-xs:inline">New</span>
          </Button>
          <span className="md:hidden">
            <AccountMenu />
          </span>
        </DashHeader>

        <DashContent className="pt-2 md:pt-3">
          <div className="flex items-start gap-4 md:items-end">
            <div>
              <DashTitle className={pageTitleCls}>{panes[pane].title}</DashTitle>
              <DashSubtitle>{panes[pane].blurb}</DashSubtitle>
            </div>
          </div>

          <Tabs value={pane} onValueChange={(next) => setPane(next as Pane)} className="mt-4 flex md:hidden">
            <TabsList className="h-10 w-full border border-line bg-surface p-1 shadow-card">
              <TabsTrigger value="agent">
                <IconSpark /> Doop Agent
              </TabsTrigger>
              <TabsTrigger value="keys">
                <IconKey /> Agent keys
              </TabsTrigger>
              <TabsTrigger value="webhooks">
                <IconWebhooks /> Webhooks
              </TabsTrigger>
              <TabsTrigger value="account">
                <IconUser /> Account
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <IconTheme /> Appearance
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {pane === 'agent' ? (
            <>
              <Card className="mt-4 max-w-[1000px] overflow-hidden sm:mt-5">
                <CardHeader>
                  <CardTitle>Doop Agent</CardTitle>
                  <CardDescription>
                    Choose how the Doop Agent runs on your canvases: a connected model account or Claude CLI on your
                    desktop. Your provider’s usage limits and charges apply.
                  </CardDescription>
                  {meter && (
                    <div className="mt-[11px] flex flex-col items-start gap-[7px] text-[11.5px] text-ink-faint sm:flex-row sm:items-center sm:gap-2.5">
                      {allowance && allowance.limit > 0 && !allowance.byoModel && (
                        <Progress
                          className="w-[min(100%,240px)] sm:w-[180px]"
                          value={left ?? 0}
                          max={allowance.limit}
                          aria-label="Free Doop Agent tasks left"
                        />
                      )}
                      <span>{meter}</span>
                    </div>
                  )}
                </CardHeader>
                <ModelAccountPanel onChange={refresh} />
              </Card>
              <ImageModelCard />
            </>
          ) : pane === 'keys' ? (
            <AgentKeys />
          ) : pane === 'webhooks' ? (
            <Webhooks />
          ) : pane === 'account' ? (
            <AccountSettings />
          ) : (
            <AppearanceSettings />
          )}
        </DashContent>
      </DashMain>
    </DashLayout>
  )
}
