import { Link } from 'react-router-dom'
import { usePlacements } from '../lib/data'
import type { PlacementSurface } from '../lib/types'
import { externalHref } from '../lib/format'
import { ext } from './ui'

// A small "Presented by …" strip for one surface (e.g. 'bunfest'), fed by the shared
// sponsor_placements table. Renders nothing unless an active placement exists.
export default function PresentedBy({ surface, className = '' }: { surface: PlacementSurface; className?: string }) {
  const sponsors = usePlacements(surface)
  if (!sponsors || sponsors.length === 0) return null
  return (
    <div className={`bg-brand-blue-50 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">Presented by</span>
        {sponsors.map((s) => {
          const inner = s.logoUrl ? (
            <img src={s.logoUrl} alt={s.name} loading="lazy" className="h-8 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="font-display text-base font-extrabold text-ink">{s.name}</span>
          )
          return s.website ? (
            <a key={s.id} href={externalHref(s.website)} {...ext} title={s.name} className="inline-flex items-center">
              {inner}
            </a>
          ) : (
            <span key={s.id} className="inline-flex items-center">
              {inner}
            </span>
          )
        })}
        <Link to="/partners" className="ml-auto text-xs font-bold text-brand-blue hover:text-brand-blue-dark">
          All partners →
        </Link>
      </div>
    </div>
  )
}
