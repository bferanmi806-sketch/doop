# DESIGN - doop

Design tokens live in `src/styles.css` as CSS custom properties, mapped into Tailwind 4 via
`@theme`. shadcn is configured with style `radix-nova`, base color `neutral`, CSS variables on,
icon library `lucide` (`components.json`). Generate new shadcn components with the shadcn CLI
rather than hand-rolling primitives; it writes into `src/components/ui` per the aliases below.

## Palette

White system (Doop UI v2, canvas guideline `doop-ui-system`): neutral greys, no warm cream.

- `--paper` `#fdfdfd` (canvas) / `--paper-deep` `#f0f0f0` (pressed or selected row fill) / `--sub`
  `#f7f7f7` (filled field wells) - background layers.
- `--surface` `#ffffff` - card/panel surfaces.
- `--ink` `#111`, `--ink-soft` `#5f5e5b`, `--ink-faint` `#9c9b99`, `--ink-ghost` `#b8b8b8` - text, in
  descending emphasis (ghost: placeholders, unit letters).
- `--line` `#dcdcdc`, `--line-soft` `#ececec` - borders/dividers.
- `--brand` `#0177d3` - the one accent: selection, focus, live signal. `--accent-ink` - failure red.
  The primary button is ink (black), not brand.
- `--glaze-ring` - the silver hairline an active agent wears in the presence pill.
- Full shadcn semantic set also present: `--primary`, `--secondary`, `--muted`, `--accent`,
  `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`, `--sidebar-*`,
  `--chart-1` through `--chart-5`.

## Typography

- `--font-ui` / `--font-display`: `'Inter'` - UI and headings (`--font-sans` / `--font-heading`
  aliases). Chrome uses 400/500 only: 12px labels, rows and buttons; 11px values, timestamps, counts.
- `--font-mono`: `'Geist Mono', ui-monospace, monospace` - ids, sizes, numbers.
- `--font-serif`: `'Instrument Serif'` - opt-in editorial line only.
- Icons: Lucide via `src/components/ui/icons.tsx`, 1.15 stroke (`ICON_STROKE`); 14px in the editor
  chrome.

## Shape and depth

- `--radius`: `0.5rem`, with `--radius-sm` through `--radius-4xl` derived from it
  (`calc(var(--radius) * N)`). Floating panels 14px, pills 10px, buttons 8px, rows 6-7px.
- No borders on controls: `--shadow-ring` (`shadow-ring`, 1px ring + soft drop) for inputs, chips and
  pills, `--shadow-ring-hover` on hover, `--shadow-float` (`shadow-float`) for panels floating over
  the canvas, `--shadow-pop` for menus and toasts. `--shadow-card` / `--shadow-elevation-*` alias
  these.

## Theme

- Light is the default; `.dark` on `<html>` switches every token above. The shadcn semantic set
  resolves through `--paper` / `--ink`, so `.dark` redefines only the primitives and shadows.
- The preference (`light` / `dark` / `system`) lives in `localStorage` under `doop-theme`, per
  browser. `index.html` paints it before the bundle loads; `src/lib/theme.ts` owns it after that
  (`initTheme()` in `main.tsx`, `useTheme()` in components). Controls: Settings -> Appearance and
  the account menu.
- `--success` / `--success-ink` and `--warning` / `--warning-ink` are the status colours; use
  them (`bg-success`, `text-success-ink`) rather than literal greens. Text on an ink fill is
  `text-paper`, never `text-white`, so it flips with the theme. `text-white` is for brand and
  accent fills and for dark overlays, which stay dark in both themes.

## Aliases (`components.json`)

- `@/components` -> `src/components`, `@/components/ui` -> `src/components/ui`,
  `@/lib` -> `src/lib`, `@/hooks` -> `src/hooks`, `@/lib/utils` -> `src/lib/utils`.

## Breakpoints

- `--breakpoint-xs`: `30rem`, `--breakpoint-md`: `56.25rem` - custom additions on top of
  Tailwind's defaults.
