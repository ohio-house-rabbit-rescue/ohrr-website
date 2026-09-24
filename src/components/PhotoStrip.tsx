import type { CSSProperties, ReactNode } from 'react'

// Real OHRR photos on the inner pages (the sponsor: "a lot of words and very little
// image"). The photos themselves and their sources are in data/ohrrPhotos.ts.

export interface Photo {
  src: string
  /** The file's real pixel size, so the browser saves the space before it loads. */
  w: number
  h: number
  /** What is in the photo. */
  alt: string
  /** Optional, and only ever what the live page says next to the photo. */
  caption?: string
}

const IMG = 'rounded-2xl bg-slate-100 object-cover'

/**
 * One to three photos in one row, all the same height: each takes a width in
 * proportion to its shape, so the row stays even whatever the mix. On phones the
 * row turns into a sideways-scrolling strip inside its own box (the next photo
 * peeks in), so the page itself never gets wider than the screen.
 */
export function PhotoStrip({ photos, caption, className = '' }: { photos: Photo[]; caption?: ReactNode; className?: string }) {
  return (
    <figure className={className}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
        {photos.map((p) => (
          <div
            key={p.src}
            // --ar is the photo's width ÷ height: 14rem tall on phones, a share of the row above that
            style={{ '--ar': String(p.w / p.h) } as CSSProperties}
            className="w-[calc(14rem*var(--ar))] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:shrink sm:[flex:var(--ar)_1_0%]"
          >
            <img
              src={p.src}
              width={p.w}
              height={p.h}
              alt={p.alt}
              loading="lazy"
              decoding="async"
              className={`h-56 w-full sm:h-auto ${IMG}`}
            />
            {p.caption && <p className="mt-2 text-sm leading-snug text-slate-600">{p.caption}</p>}
          </div>
        ))}
      </div>
      {caption && <figcaption className="mt-2 text-sm text-slate-600">{caption}</figcaption>}
    </figure>
  )
}

/** One photo, full width of its box, with an optional caption under it. */
export function OhrrPhoto({ photo, className = '', imgClassName = '' }: { photo: Photo; className?: string; imgClassName?: string }) {
  return (
    <figure className={className}>
      <img
        src={photo.src}
        width={photo.w}
        height={photo.h}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className={`h-auto w-full ${IMG} ${imgClassName}`}
      />
      {photo.caption && <figcaption className="mt-2 text-sm leading-snug text-slate-600">{photo.caption}</figcaption>}
    </figure>
  )
}

/** A tidy grid of square photos with a name under each (two across on phones, four from tablet width up). */
export function PhotoGrid({ photos, credit, className = '' }: { photos: Photo[]; credit?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((p) => (
          <li key={p.src}>
            <figure>
              <img
                src={p.src}
                width={p.w}
                height={p.h}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className={`aspect-square h-auto w-full ${IMG}`}
              />
              {p.caption && <figcaption className="mt-2 font-display text-base font-bold text-ink">{p.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
      {credit && <p className="mt-3 text-xs text-slate-600">{credit}</p>}
    </div>
  )
}
