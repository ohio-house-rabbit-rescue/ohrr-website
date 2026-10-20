// /adopt/bonding — OHRR's free bunny matchmaking (2026-10-20, sponsor: "the
// customer facing the ability to set up bunny bonding sessions"). What a bunny
// date is, the next open time and a way to ask for one — or, until OHRR opens
// times, a way to be told. The wording, "before you come" and the times come
// from the "Bonding session" booking type in Staff → Bookings.
import { Link } from 'react-router-dom'
import { PageHero, Section, btn } from '../components/ui'
import { Icon } from '../components/icons'
import NotifyMe from '../components/NotifyMe'
import { BONDING_SLUG, BUNNY_DATE_STEPS, useBonding } from '../lib/bonding'
import { BUNNY_DATES_ARTICLE } from '../lib/constants'
import { fmtDay, fmtTime } from '../lib/bookings'

export default function Bonding() {
  const b = useBonding()
  const next = b.slots[0]
  const place = (b.type?.location ?? 'OHRR Adoption Center').split(' · ')[0]
  const staffConfirms = b.type?.confirm_mode === 'staff'
  const before = (b.type?.requirements ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
  const book = `/book/${BONDING_SLUG}`

  const aside = b.loading ? undefined : next ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Next open time</p>
      <p className="mt-1 font-display text-xl font-black text-ink">
        {fmtDay(next.starts_at)}, {fmtTime(next.starts_at)}
      </p>
      <p className="text-base text-slate-700">{place}</p>
      <Link to={book} className={`${btn.orange} mt-3 w-full`}>
        <Icon name="calendar" size={18} /> {staffConfirms ? 'Ask for a bunny date' : 'Book a bunny date'}
      </Link>
      {staffConfirms && <p className="mt-2 text-sm text-slate-600">Pick a time that suits you; OHRR confirms it by email.</p>}
    </div>
  ) : (
    <NotifyMe what={BONDING_SLUG} label={b.name} />
  )

  return (
    <>
      <PageHero title={b.name} subtitle={b.blurb} parent={{ to: '/adopt', label: 'Adopt' }} aside={aside} />
      <Section className="!pt-6 md:!pt-8">
        <div className="max-w-3xl space-y-8">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">How a bunny date works</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-6 text-base leading-relaxed text-slate-700">
              {BUNNY_DATE_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="mt-3 text-base">
              <Link to="/adopt" className="font-semibold text-brand-blue">
                See the adoptable rabbits
              </Link>
            </p>
          </div>

          {before.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Before you come</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-6 text-base leading-relaxed text-slate-700">
                {before.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {next && (
            <p>
              <Link to={book} className={btn.orange}>
                <Icon name="calendar" size={18} /> {staffConfirms ? 'Ask for a bunny date' : 'Book a bunny date'}
              </Link>
            </p>
          )}

          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">Bonding at home</h2>
            <p className="mt-2 text-base leading-relaxed text-slate-700">
              Tips from OHRR’s bonding expert, Amy Shears:{' '}
              <Link to="/learn/bonding-bunnies" className="font-semibold text-brand-blue">
                The Art of Bunny Dating
              </Link>
              . Or read{' '}
              <Link to={BUNNY_DATES_ARTICLE} className="font-semibold text-brand-blue">
                OHRR’s post about bunny dates
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}
