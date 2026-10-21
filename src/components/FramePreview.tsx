import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A frame's rendered preview (`/i/<id>.jpg?preview`) filling whatever box it
 * is given, with the two states a box must be able to show instead: nothing
 * to preview (`empty`), and a render that failed to load. A failed render
 * must look different from an empty canvas — silence here once made preview
 * outages undiagnosable — and the failure is remembered per frame id, so a
 * new preview frame retries rather than inheriting the old one's failure.
 */
export function FramePreview({
  frameId,
  empty = 'empty canvas',
  className,
}: {
  frameId?: string | null
  /** what an empty box says; `null` for a plain blank (a tiny thumb) */
  empty?: ReactNode
  /** the fallback text's size and colour; the image itself always fills the box */
  className?: string
}) {
  const [failedId, setFailedId] = useState<string | null>(null)
  const fallback = (text: ReactNode) =>
    text === null ? null : (
      <span className={cn('grid h-full w-full place-items-center text-label text-ink-faint', className)}>{text}</span>
    )
  if (!frameId) return fallback(empty)
  if (failedId === frameId) return fallback('preview unavailable')
  return (
    <img
      src={`/i/${frameId}.jpg?preview`}
      alt=""
      loading="lazy"
      className="h-full w-full object-cover object-top"
      onError={() => setFailedId(frameId)}
    />
  )
}
