import type { RefObject } from 'react'
import { useStore } from '../lib/store'
import { useIsMobile } from '../hooks/use-mobile'
import { MOD_KEY } from '../lib/keys'
import { cn } from '../lib/utils'
import { MenuHint } from './ui/menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Toolbar, ToolbarButton } from './ui/toolbar'

/* The zoom pill in the canvas's bottom-right corner: step out, the current
   level, step in. The level doubles as the trigger of a menu with the preset
   zooms and the fits. The Stage writes the percentage into `labelRef` straight
   from its viewport subscription, so pan/zoom never re-renders this. */
export function ZoomControls({
  labelRef,
  sidePanelOpen,
  hidden,
  onZoomIn,
  onZoomOut,
  onZoomTo,
  onFit,
  onFitSelection,
}: {
  labelRef: RefObject<HTMLSpanElement>
  /** the Activity panel is open at the right edge, so sit beside it */
  sidePanelOpen: boolean
  /** ⌘. has hidden the chrome: display:none, so the label ref stays mounted */
  hidden: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomTo: (zoom: number) => void
  onFit: () => void
  onFitSelection: () => void
}) {
  const isMobile = useIsMobile()
  const hasSelection = useStore((s) => s.selectedIds.length > 0)
  /* phones have no room for shortcut hints, and no keyboard to use them */
  const hint = (keys: string) => !isMobile && <MenuHint>{keys}</MenuHint>
  /* a quieter pill than the frame toolbar: 26px rows, narrow steppers */
  const stepBtn = 'min-h-0 px-2 py-1 text-[12px] leading-[18px] sm:px-2 sm:py-1'

  return (
    <Toolbar
      className={cn(
        'absolute bottom-[calc(8px+env(safe-area-inset-bottom))] z-[35] gap-0 p-[3px] transition-[right] duration-150 ease-[ease] sm:gap-0 sm:bottom-4 sm:p-[3px]',
        /* the corner is free when only the (top-anchored) side rail is out;
           clear of the full-height 300px side panel at right: 12px otherwise */
        isMobile ? 'right-2' : sidePanelOpen ? 'right-[324px]' : 'right-3',
        hidden && 'hidden',
      )}
    >
      <ToolbarButton aria-label="Zoom out" className={stepBtn} onClick={onZoomOut}>
        −
      </ToolbarButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton
            aria-label="Zoom level"
            className={cn(stepBtn, 'min-w-[44px] px-1.5 text-center text-[11px] normal-case tracking-normal sm:px-1.5')}
          >
            <span ref={labelRef}>100%</span>
          </ToolbarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-[220px]">
          <DropdownMenuItem onSelect={onZoomIn}>Zoom in{hint(`${MOD_KEY}+`)}</DropdownMenuItem>
          <DropdownMenuItem onSelect={onZoomOut}>Zoom out{hint(`${MOD_KEY}−`)}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onFit}>Zoom to fit{hint('⇧1')}</DropdownMenuItem>
          <DropdownMenuItem disabled={!hasSelection} onSelect={onFitSelection}>
            Zoom to selection{hint('⇧2')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onZoomTo(0.5)}>Zoom to 50%</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onZoomTo(1)}>Zoom to 100%{hint(`${MOD_KEY}0`)}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onZoomTo(2)}>Zoom to 200%</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolbarButton aria-label="Zoom in" className={stepBtn} onClick={onZoomIn}>
        +
      </ToolbarButton>
    </Toolbar>
  )
}
