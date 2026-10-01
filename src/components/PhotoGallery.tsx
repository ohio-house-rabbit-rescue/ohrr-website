// One item's photos, in the order staff set them (the first is the cover):
// an auction lot, a raffle prize, a Hop Shop product. Used where a visitor or
// staff member OPENS one item; lists and cards keep showing the cover only.
//
//   0 photos   nothing (the page shows its own placeholder)
//   1 photo    the photo, as before
//   2–4        a big sideways strip, one photo per slide, the whole item shown
//              (object-contain on light slate), "2 of 4", Previous / Next
//              buttons that are always visible, and a row of thumbnails
//
// Printing shows the cover only, without the buttons.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './icons'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const navBtn =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border-2 border-brand-blue/60 bg-white px-4 text-base font-bold text-brand-blue transition hover:bg-brand-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white'

export default function PhotoGallery({
  photos,
  alt,
  className = '',
  /** The frame's shape; the photo always shows whole inside it. */
  aspect = 'aspect-[4/3]',
}: {
  photos: string[]
  alt: string
  className?: string
  aspect?: string
}) {
  const list = photos.filter(Boolean)
  const n = list.length
  const [index, setIndex] = useState(0)
  const strip = useRef<HTMLDivElement>(null)
  const at = Math.min(index, Math.max(0, n - 1))

  // A shorter list (a photo removed) keeps the counter honest.
  useEffect(() => {
    if (index > n - 1 && n > 0) setIndex(n - 1)
  }, [index, n])

  if (n === 0) return null

  if (n === 1) {
    return (
      <div className={`w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5 ${aspect} ${className}`}>
        <img src={list[0]} alt={alt} className="h-full w-full object-cover" />
      </div>
    )
  }

  const go = (i: number) => {
    const next = Math.max(0, Math.min(n - 1, i))
    setIndex(next)
    const el = strip.current
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  // Swiping (or scrolling) the strip moves the counter and the ringed thumbnail.
  const onScroll = () => {
    const el = strip.current
    if (!el || !el.clientWidth) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== at && i >= 0 && i < n) setIndex(i)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(at - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(at + 1)
    }
  }

  return (
    <div className={`print-break-inside-avoid ${className}`} role="group" aria-roledescription="photo gallery" aria-label={`${alt}: ${n} photos`}>
      <div
        ref={strip}
        onScroll={onScroll}
        onKeyDown={onKey}
        tabIndex={0}
        role="region"
        aria-label={`Photos of ${alt}. Use the arrow keys or the Previous and Next buttons.`}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-slate-100 ring-1 ring-black/5 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-brand-blue print:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {list.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={`${aspect} w-full shrink-0 snap-center snap-always ${i > 0 ? 'print:hidden' : ''}`}
            aria-hidden={i !== at}
          >
            <img
              src={src}
              alt={i === 0 ? alt : `${alt}, photo ${i + 1} of ${n}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="h-full w-full object-contain"
            />
          </div>
        ))}
      </div>

      <div className="no-print mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => go(at - 1)} disabled={at === 0} className={navBtn} aria-label="Previous photo">
          <Icon name="chevron" size={18} className="rotate-180" />
          Previous
        </button>
        <p className="text-base font-bold text-ink" aria-live="polite">
          {at + 1} of {n}
        </p>
        <button type="button" onClick={() => go(at + 1)} disabled={at === n - 1} className={navBtn} aria-label="Next photo">
          Next
          <Icon name="chevron" size={18} />
        </button>
      </div>

      <ul className="no-print mt-3 flex flex-wrap gap-2.5">
        {list.map((src, i) => (
          <li key={`${src}-${i}`}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-label={`Photo ${i + 1} of ${n}`}
              aria-current={i === at ? 'true' : undefined}
              className={`block h-14 w-14 overflow-hidden rounded-xl bg-slate-100 transition ${
                i === at ? 'ring-[3px] ring-brand-blue ring-offset-2' : 'ring-1 ring-slate-300 hover:ring-brand-blue/60'
              }`}
            >
              <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
