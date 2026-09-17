import { Link } from 'react-router-dom'
import { useBunFestEvent } from '../lib/data'
import { PageHero, Section, btn, ext, LiveNote, ArticleBody, Card } from '../components/ui'
import { formatDate, formatTimeRange } from '../lib/format'
import { BUNFEST_SITE } from '../lib/constants'
import { EventWhenWhere } from './Events'

// What's at Midwest BunFest — from the live announcement post.
const FEATURES = [
  { h: 'Sponsors, rescue partners & vendors', p: 'Bunny specialty shopping and rescue rabbit groups from across the region.' },
  { h: 'Educational sessions', p: 'Sessions throughout the whole day.' },
  { h: 'Bunny spa & glamour shots', p: 'Pampering and photos for your rabbit.' },
  { h: 'Silent auction & raffle', p: 'Bid and win — every dollar supports rescue.' },
  { h: 'OHRR Hop Shop', p: 'Healthy, safe supplies for your bunny; profits support OHRR.' },
  { h: 'Chillaxabun Lounge', p: 'A quiet place where your bunny can chill, equipped with hay, water and a hidey house.' },
]

export default function BunFest() {
  const { event, source, loading } = useBunFestEvent()

  const subtitle = event
    ? `${formatDate(event.startsAt)}, ${formatTimeRange(event)} · ${[event.venue, event.city].filter(Boolean).join(', ')}`
    : "OHRR's flagship fundraiser and educational expo."

  return (
    <>
      <PageHero title={event?.title ?? 'Midwest BunFest'} subtitle={subtitle} />
      <Section>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="rounded-3xl bg-gradient-to-br from-[#1690bf] to-[#0f7197] p-6 shadow-xl">
            <div className="rounded-2xl bg-white p-5">
              <img src="/img/bunfest-2025-logo.jpg" alt="Midwest BunFest" className="mx-auto block w-full max-w-xs" />
            </div>
          </div>
          <div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : event ? (
              <>
                {event.theme && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-dark">
                    This year's theme: {event.theme}
                  </span>
                )}
                <p className="mt-3 font-display text-2xl font-black text-ink">Mark your calendars!</p>
                <EventWhenWhere e={event} />
                {event.summary && (
                  <p className="mt-4 text-base leading-relaxed text-slate-600">{event.summary}</p>
                )}
              </>
            ) : (
              <p className="text-base leading-relaxed text-slate-600">
                Midwest BunFest is OHRR's annual multi-state educational exposition and fundraiser in
                Columbus, Ohio. Check back for this year's date.
              </p>
            )}
            <LiveNote source={source} />
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={event?.url ?? BUNFEST_SITE} {...ext} className={btn.blue}>
                midwestbunfest.org
              </a>
              <Link to="/app" className={btn.outline}>
                BunFest in the app
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.h}>
              <h3 className="font-display text-lg font-extrabold text-brand-blue">{f.h}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.p}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Silent auction</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Preview the items that will be up for silent auction at Midwest BunFest 2026.
            </p>
          </div>
          <Link to="/bunfest/silent-auction" className={btn.blue}>
            Silent auction preview
          </Link>
        </Card>

        {event?.body && (
          <div className="mt-12 max-w-3xl">
            <ArticleBody body={event.body} />
          </div>
        )}

        <p className="mt-10 text-xs leading-relaxed text-slate-400">
          Midwest BunFest is hosted and sponsored by Ohio House Rabbit Rescue. Logo shown is from a previous
          year; the 2026 "Binky On!" logo is by tattoo artist Jillian Lisska.
        </p>
      </Section>
    </>
  )
}
