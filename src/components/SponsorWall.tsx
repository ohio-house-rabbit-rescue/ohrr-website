import { Link } from 'react-router-dom'
import { usePlacements } from '../lib/data'
import type { PlacementSurface } from '../lib/types'
import { OHRR } from '../lib/constants'
import { externalHref } from '../lib/format'
import { H2, ext } from './ui'

// The sponsors of one surface (e.g. 'bunfest') as a wall of logos, each one a
// link to the sponsor's own website (2026-09-24, OHRR: the list of names "is a
// mass of words … making logo links … shows a logo if one is available").
// Same set as the "Presented by" strip: staff place sponsors in Staff →
// Sponsors, and each drops off on its own when its term ends. Every tile is
// the same size; a sponsor without a logo shows its name in the tile, so the
// rows still line up. The lead sponsor's tile is four tiles big.
export default function SponsorWall({
  surface,
  title = 'Thank you to our sponsors',
  ask,
  id,
  className = '',
}: {
  surface: PlacementSurface
  title?: string
  /** "Want to sponsor next year's BunFest?" — the email invitation under the wall. */
  ask?: { text: string; subject: string }
  id?: string
  className?: string
}) {
  const sponsors = usePlacements(surface)
  if (!sponsors || sponsors.length === 0) return null
  const shown = [...sponsors].sort(
    (a, b) => Number(b.tier === 'presenting') - Number(a.tier === 'presenting') || a.sortOrder - b.sortOrder,
  )

  return (
    <section id={id} aria-labelledby={`${id ?? surface}-sponsors`} className={className}>
      <H2 id={`${id ?? surface}-sponsors`}>{title}</H2>
      <ul className="mt-5 grid grid-flow-dense auto-rows-[6rem] grid-cols-2 gap-3 sm:auto-rows-[7rem] sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((s) => {
          const lead = s.tier === 'presenting'
          const inner = (
            <>
              {lead && (
                <span className="absolute left-3 top-2.5 text-xs font-extrabold uppercase tracking-wider text-brand-orange-ink">
                  Lead sponsor
                </span>
              )}
              {s.logoUrl ? (
                <img src={s.logoUrl} alt={s.name} loading="lazy" className="h-full w-full object-contain" />
              ) : (
                <span className={`text-center font-display font-extrabold leading-snug text-ink ${lead ? 'text-2xl' : 'text-base'}`}>
                  {s.name}
                </span>
              )}
            </>
          )
          const tile = `relative flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white ${
            lead ? 'px-6 pb-4 pt-9' : 'p-3.5'
          }`
          return (
            <li key={s.id} className={lead ? 'col-span-2 row-span-2' : ''}>
              {s.website ? (
                <a
                  href={externalHref(s.website)}
                  {...ext}
                  title={s.name}
                  aria-label={`${s.name} (opens their website)`}
                  className={`${tile} transition hover:border-brand-blue hover:shadow-md`}
                >
                  {inner}
                </a>
              ) : (
                <div title={s.name} className={tile}>
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-base">
        {ask && (
          <span className="text-slate-700">
            {ask.text}{' '}
            <a href={`${OHRR.emailHref}?subject=${encodeURIComponent(ask.subject)}`} className="font-semibold text-brand-blue">
              Email us
            </a>
          </span>
        )}
        <Link to="/partners" className="font-semibold text-brand-blue">
          All sponsors &amp; partners →
        </Link>
      </p>
    </section>
  )
}
