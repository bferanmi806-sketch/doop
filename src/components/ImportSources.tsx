import type { ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { ModalLede, ModalTitle } from './ui/modal'

/**
 * The import modal's two-step chrome: a picker of source cards, then one
 * screen per source. Each screen shares the same bones — an icon tile
 * beside the serif title, a lede, the source's own body, and a footer of
 * fine print with Back and the primary action.
 */

export interface ImportSource {
  id: string
  title: string
  blurb: string
  icon: ReactNode
  /** greyed out with a "Soon" tag; the card does not navigate */
  soon?: boolean
}

export function SourcePicker({ sources, onPick }: { sources: ImportSource[]; onPick: (id: string) => void }) {
  return (
    <>
      <ModalTitle>Import into Doop</ModalTitle>
      <ModalLede>
        Pick a source. Imports that find several pages or frames show a review before anything lands.
      </ModalLede>
      <div className="mt-6 grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3">
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            disabled={source.soon}
            className={cn(
              'group relative flex min-h-[140px] flex-col rounded-xl border border-line bg-surface p-4 pt-[18px] text-left shadow-card outline-none transition-[transform,box-shadow,border-color]',
              source.soon
                ? 'opacity-60'
                : 'hover:-translate-y-[3px] hover:border-ink-faint hover:shadow-pop focus-visible:-translate-y-[3px] focus-visible:border-ink-faint focus-visible:shadow-pop',
            )}
            onClick={() => !source.soon && onPick(source.id)}
          >
            <span className="flex size-10 items-center justify-center overflow-hidden rounded-[10px] border border-line bg-surface">
              {source.icon}
            </span>
            <b className="mt-4 text-[15px] font-semibold tracking-[-0.012em]">{source.title}</b>
            <span className="mt-1 text-[12.5px] leading-[1.45] text-ink-soft">{source.blurb}</span>
            {source.soon ? (
              <span className="absolute right-4 top-4 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                Soon
              </span>
            ) : (
              <span className="absolute bottom-3.5 right-4 text-accent-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <ArrowRightIcon className="size-4" />
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

export function ImportStepHeader({ icon, title }: { icon: ReactNode; title: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex size-11 flex-none items-center justify-center overflow-hidden rounded-[11px] border border-line bg-surface">
        {icon}
      </span>
      <ModalTitle>{title}</ModalTitle>
    </div>
  )
}

/** Fine print on the left, Back beside the screen's primary action. */
export function ImportStepFooter({
  note,
  onBack,
  backDisabled,
  children,
}: {
  note?: ReactNode
  onBack: () => void
  backDisabled?: boolean
  children?: ReactNode
}) {
  return (
    <div className="mt-6 flex items-center gap-2.5 border-t border-line-soft pt-[18px]">
      <span className="mr-auto min-w-0 text-[12px] leading-[1.4] text-ink-faint">{note}</span>
      <Button variant="ghost" className="flex-none gap-2" disabled={backDisabled} onClick={onBack}>
        <ArrowLeftIcon className="size-3.5" />
        Back
      </Button>
      {children}
    </div>
  )
}

/* ---- source marks the app doesn't already carry ---- */

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  )
}

export function RadioTowerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M4.9 16.1a7 7 0 0 1 0-9.9M7.8 13.2a3 3 0 0 1 0-5.7M19.1 16.1a7 7 0 0 0 0-9.9M16.2 13.2a3 3 0 0 0 0-5.7" />
      <circle cx="12" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 12v9M9 21l3-6.5L15 21" />
    </svg>
  )
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M12 16V4M6 9l6-6 6 6M4 21h16" />
    </svg>
  )
}

/** Adobe's Ps app mark: the dark tile with the two letters as a vector, so
 *  it stays crisp from a 16px logo row up to the import picker's tile. */
export function PhotoshopMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden className="flex-none">
      <rect width="256" height="256" fill="#001e36" rx="44" />
      <path
        fill="#31a8ff"
        transform="translate(0,3)"
        d="M57.644 175.035V65.297q0-1.201 1.031-1.202l1.087-.003l1.858-.02l2.582-.051l8.65-.183l9.275-.172q4.893-.085 9.702-.086q13.05 0 21.982 3.263a38.1 38.1 0 0 1 14.34 8.758a33.6 33.6 0 0 1 7.814 12.108a40.2 40.2 0 0 1 2.405 13.824q0 13.741-6.355 22.669a35.9 35.9 0 0 1-16.6 12.756l-.573.21c-6.973 2.601-14.695 3.541-23.164 3.6l-1.316.004l-1.953-.01l-.985-.014l-1.098-.026l-.662-.026l-.402-.021l-.989-.036l-1.209-.025l-1.82-.013l-.405-.001v34.263a1.366 1.366 0 0 1-1.546 1.546H58.847q-1.204.001-1.203-1.374M80.84 84.703v35.792q2.23.173 4.12.172h5.668a40.3 40.3 0 0 0 11.533-1.727l.746-.233a18.5 18.5 0 0 0 8.759-5.668q3.228-3.807 3.344-10.492l.005-.499c.09-3.322-.774-6.6-2.491-9.445a16 16 0 0 0-7.47-6.097a31.8 31.8 0 0 0-12.537-2.146l-2.178.006l-1.374.012l-1.311.017l-1.85.036l-1.35.038l-.701.026l-.937.044l-.798.049l-.455.036l-.393.038l-.173.02zm123.93 29.284a40.2 40.2 0 0 0-9.458-3.442l-.76-.164a54.3 54.3 0 0 0-11.009-1.363l-.926-.011a22.2 22.2 0 0 0-6.44.773a5.8 5.8 0 0 0-3.35 2.146a5.4 5.4 0 0 0-.858 2.92a4.56 4.56 0 0 0 1.03 2.747a11.7 11.7 0 0 0 3.235 2.637l.372.197a72 72 0 0 0 7.556 3.52a75 75 0 0 1 16.4 7.814a24.94 24.94 0 0 1 8.416 8.845a23.6 23.6 0 0 1 2.49 10.99a24.7 24.7 0 0 1-4.122 14.169a27.1 27.1 0 0 1-11.936 9.53q-7.556 3.32-18.557 3.432l-.762.004a70 70 0 0 1-13.556-1.188l-.956-.186a46.3 46.3 0 0 1-10.905-3.435a2.22 2.22 0 0 1-1.202-1.89v-18.718a1.01 1.01 0 0 1 .43-.945a.83.83 0 0 1 .944.086a45.9 45.9 0 0 0 13.223 5.238a54.5 54.5 0 0 0 12.537 1.632q6.009 0 8.844-1.546a4.86 4.86 0 0 0 2.834-4.465q0-2.23-2.576-4.293q-1.08-.864-3.097-1.88l-.643-.316l-.686-.323l-.36-.164l-.754-.334l-.393-.17l-.82-.344l-.427-.175l-.886-.355l-.46-.18l-.953-.367l-.997-.373a63 63 0 0 1-15.199-7.728a26.2 26.2 0 0 1-8.071-9.016a23.7 23.7 0 0 1-2.49-10.905a24.6 24.6 0 0 1 3.606-12.88c2.7-4.27 6.576-7.67 11.163-9.788q7.555-3.776 18.89-3.779a83.6 83.6 0 0 1 13.224.945a34.7 34.7 0 0 1 9.206 2.49c.473.136.854.485 1.03.945c.117.419.174.852.172 1.288v17.345c.025.41-.172.803-.515 1.03a1.66 1.66 0 0 1-1.478 0"
      />
    </svg>
  )
}

/** Canva's official round mark (see `src/integrations/canva/Tile.tsx`). */
export function CanvaMark({ size = 24 }: { size?: number }) {
  return <CanvaTile size={size} />
}
