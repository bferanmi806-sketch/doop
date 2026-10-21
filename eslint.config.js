import tseslint from 'typescript-eslint'

/* Screens compose primitives from src/components/ui; they do not draw their
   own buttons, fields or sizes. The dashboard surfaces (Home, the rail, the
   search palette, Automations, Settings, Community, Integrations) are on the
   component layer and the rule below holds them there. The files listed here
   are the canvas editor's chrome and the modals around it, which have not
   been migrated yet (a separate pass): they are exempt until that pass takes
   each one off this list. Add nothing new here. */
const LEGACY_CHROME = [
  /* the canvas editor and its panels */
  'src/pages/CanvasPage.tsx',
  'src/components/ActivityPanel.tsx',
  'src/components/Board.tsx',
  'src/components/CanvasComments.tsx',
  'src/components/CanvasDrawing.tsx',
  'src/components/CodePanel.tsx',
  'src/components/CommentPopovers.tsx',
  'src/components/CommentsPanel.tsx',
  'src/components/Cursors.tsx',
  'src/components/DesktopTabs.tsx',
  'src/components/ElementPanel.tsx',
  'src/components/FlowOverlay.tsx',
  'src/components/FollowFrame.tsx',
  'src/components/FrameView.tsx',
  'src/components/GhostFrames.tsx',
  'src/components/Inspector.tsx',
  'src/components/LayersPanel.tsx',
  'src/components/LivePresence.tsx',
  'src/components/MemoryPanel.tsx',
  'src/components/PagesPanel.tsx',
  'src/components/PathEditor.tsx',
  'src/components/PeerAvatars.tsx',
  'src/components/PromptBar.tsx',
  'src/components/SideRail.tsx',
  'src/components/Stage.tsx',
  'src/components/TopBar.tsx',
  'src/components/WorkingNow.tsx',
  'src/components/ZoomControls.tsx',
  /* the modals and flows that open over the editor */
  'src/components/ConnectModal.tsx',
  'src/components/CursorInstall.tsx',
  'src/components/ExportModal.tsx',
  'src/components/FrameExportModal.tsx',
  'src/components/FrameHistoryModal.tsx',
  'src/components/ImportSources.tsx',
  'src/components/LocalClaude.tsx',
  'src/components/Onboarding.tsx',
  /* the automation editor and its shared shell */
  'src/pages/AutomationEditor.tsx',
  'src/components/AutomateShell.tsx',
  /* settings panes and the signed-out screens: small, next in line */
  'src/components/ModelAccount.tsx',
  'src/components/TeamAllowance.tsx',
  'src/pages/Admin.tsx',
  'src/pages/AuthPage.tsx',
  'src/pages/DesktopHandoff.tsx',
  'src/pages/DesktopSignIn.tsx',
  'src/pages/Workspace.tsx',
]

const COMPONENT_LAYER_MESSAGE =
  'Compose the primitives in src/components/ui (Button, IconButton, Pressable, Input, SearchField, Textarea, Select…) instead of a raw element.'
const TYPE_SCALE_MESSAGE =
  'Use the named type scale (text-micro … text-display) and corner shapes (rounded-row/control/pill/card/panel) from .context/DESIGN.md, not an arbitrary size.'

/* oxlint (`.oxlintrc.json`) carries the rule set, including the type-aware
   rules via tsgolint. ESLint stays for what oxlint cannot cover: the
   `no-restricted-syntax` selector below, and `no-undef` for the plain
   JavaScript that no type check sees (oxlint's is still a nursery rule).
   No type information is loaded, so this run is cheap. */
export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'desktop/src-tauri/target/', 'public/figma-plugin/', 'storybook-static/'] },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: { 'no-undef': 'error' },
  },
  {
    /* repo maintenance scripts and the iOS dev helpers: plain ESM run directly
       by node, so they get node globals rather than the browser set */
    files: ['scripts/**/*.{js,mjs}', 'ios/scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: Object.fromEntries(
        'process console Buffer URL fetch setTimeout clearTimeout setInterval clearInterval'
          .split(' ')
          .map((g) => [g, 'readonly']),
      ),
    },
  },
  {
    /* the embeddable snippet: plain browser JS shipped as-is, no bundling —
       ES5-flavoured on purpose so it runs wherever the host app does */
    files: ['public/**/*.js'],
    languageOptions: {
      globals: Object.fromEntries(
        (
          'window document location history localStorage fetch console setTimeout clearTimeout ' +
          'matchMedia URL JSON Date Math FileReader Promise MutationObserver'
        )
          .split(' ')
          .map((g) => [g, 'readonly']),
      ),
    },
  },
  {
    /* every environment variable is declared once in server/env.ts, typed and
       validated at boot; the rest of the server reads `env.X` from there. The
       Gemini cloud worker is its own process with its own three variables. */
    files: ['server/**/*.ts'],
    ignores: ['server/env.ts', 'server/geminiCloudWorker.ts', 'server/geminiCloudWorkerMain.ts'],
    languageOptions: { parser: tseslint.parser },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'Read environment variables through `env` from server/env.ts, which validates them at boot.',
        },
      ],
    },
  },
  {
    /* the component layer: a screen under src/pages or src/components uses
       the ui primitives, not <button>/<input>/<select>/<textarea>, and sizes
       type and corners with the named steps, not text-[Npx] / rounded-[Npx].
       The primitives themselves (src/components/ui) are where those raw
       elements and exact values belong; the editor chrome waits for its own
       pass (LEGACY_CHROME above). Stories are the catalogue, not screens. */
    files: ['src/pages/**/*.tsx', 'src/components/**/*.tsx'],
    ignores: ['src/components/ui/**', ...LEGACY_CHROME],
    languageOptions: { parser: tseslint.parser },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]',
          message: COMPONENT_LAYER_MESSAGE,
        },
        {
          selector: 'Literal[value=/(^|[\\s:!])(text|rounded(-[trblse]{1,2})?)-\\[/]',
          message: TYPE_SCALE_MESSAGE,
        },
        {
          selector: 'TemplateElement[value.cooked=/(^|[\\s:!])(text|rounded(-[trblse]{1,2})?)-\\[/]',
          message: TYPE_SCALE_MESSAGE,
        },
      ],
    },
  },
)
