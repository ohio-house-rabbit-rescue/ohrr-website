// /mobile-vet — OHRR's mobile vet clinic (2026-09-24, OHRR: "the viewability
// of the mobile vet on the home page as something we do"). What it is, the
// next clinic days with open times, and a way to book — or, until OHRR sets
// dates, a way to be told. Everything but the fallback wording comes from the
// "Mobile vet clinic" booking type in Staff → Bookings.
import { Link } from 'react-router-dom'
import { PageHero, Section, btn } from '../components/ui'
import { Icon } from '../components/icons'
import NotifyMe from '../components/NotifyMe'
import { MOBILE_VET_SLUG, useMobileVet } from '../lib/mobileVet'
import { dayKey, durationLabel, fmtDay, fmtRange } from '../lib/bookings'

export default function MobileVet() {
  const vet = useMobileVet()
  const byDay = new Map<string, typeof vet.slots>()
  for (const s of vet.slots) byDay.set(dayKey(s.starts_at), [...(byDay.get(dayKey(s.starts_at)) ?? []), s])
  const days = [...byDay.values()]
  const next = vet.slots[0]
  const place = (vet.type?.location ?? 'OHRR Adoption Center').split(' · ')[0]

  const aside = vet.loading ? undefined : next ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Next clinic</p>
      <p className="mt-1 font-display text-xl font-black text-ink">{fmtDay(next.starts_at)}</p>
      <p className="text-base text-slate-700">{place}</p>
      <Link to={`/book/${MOBILE_VET_SLUG}`} className={`${btn.orange} mt-3 w-full`}>
        <Icon name="calendar" size={18} /> Book a time
      </Link>
    </div>
  ) : (
    <NotifyMe what={MOBILE_VET_SLUG} label={vet.name} />
  )

  return (
    <>
      <PageHero title={vet.name} subtitle={vet.blurb} aside={aside} />
      <Section className="!pt-6 md:!pt-8">
        <div className="max-w-3xl space-y-8">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">How it works</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-6 text-base leading-relaxed text-slate-700">
              <li>Pick a time for your rabbit and leave your name and email — no account.</li>
              <li>Bring your rabbit to the {place} at that time.</li>
              {vet.type && <li>Each appointment is {durationLabel(vet.type.duration_min)}.</li>}
              <li>You’ll get a confirmation, a reminder for your calendar and a link to cancel if plans change.</li>
            </ul>
          </div>

          {days.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Clinic days</h2>
              <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {days.map((list) => (
                  <li key={list[0].slot_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <span>
                      <span className="block font-display text-lg font-extrabold text-ink">{fmtDay(list[0].starts_at)}</span>
                      <span className="block text-sm text-slate-600">
                        {fmtRange(list[0].starts_at, list[list.length - 1].ends_at)} · {list.length} time{list.length === 1 ? '' : 's'} open
                      </span>
                    </span>
                    <Link to={`/book/${MOBILE_VET_SLUG}`} className={btn.outline}>
                      Pick a time
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">Need a vet before then?</h2>
            <p className="mt-2 text-base leading-relaxed text-slate-700">
              Not every vet sees rabbits.{' '}
              <Link to="/learn/vets" className="font-semibold text-brand-blue">
                Find a rabbit-savvy vet near you
              </Link>
              , including emergency vets open after hours.
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}
