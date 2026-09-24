import { Link } from 'react-router-dom'
import { useEvents } from '../lib/data'
import type { EventItem } from '../lib/types'
import { PageHero, Section, LiveNote, btn, ext, H2, Card } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { formatDate, formatTimeRange, isUpcoming } from '../lib/format'
import { MAILING_LIST } from '../lib/constants'

export function mapsSearch(e: EventItem): string {
  const q = [e.venue, e.address].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

// Date · time · venue · address — reused on the BunFest page.
export function EventWhenWhere({ e }: { e: EventItem }) {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
      <div>
        <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-600">When</dt>
        <dd className="mt-0.5 font-semibold">{formatDate(e.startsAt)}</dd>
        <dd>{formatTimeRange(e)}</dd>
      </div>
      {(e.venue || e.address) && (
        <div>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Where</dt>
          {e.venue && <dd className="mt-0.5 font-semibold">{e.venue}</dd>}
          {e.address && (
            <dd>
              <a href={mapsSearch(e)} {...ext} className="font-semibold text-brand-blue">
                {e.address}
              </a>
            </dd>
          )}
        </div>
      )}
    </dl>
  )
}

function EventCard({ e }: { e: EventItem }) {
  const isBunFest = /bunfest/i.test(e.slug) || /bunfest/i.test(e.title)
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-extrabold text-brand-blue">{e.title}</h3>
        {e.theme && (
          <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange-dark">
            Theme: {e.theme}
          </span>
        )}
      </div>
      <EventWhenWhere e={e} />
      {e.summary && <p className="mt-3 text-sm leading-relaxed text-slate-600">{e.summary}</p>}
      {isBunFest && (
        <p className="mt-2 text-sm text-slate-600">
          Preview the items that will be up for silent auction at Midwest BunFest 2026.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {isBunFest && (
          <>
            <Link to="/bunfest" className={btn.blue}>
              About Midwest BunFest
            </Link>
            <Link to="/bunfest/silent-auction" className={btn.outline}>
              Silent auction preview
            </Link>
          </>
        )}
        {e.url && (
          <a href={e.url} {...ext} className={btn.outline}>
            More information
          </a>
        )}
      </div>
    </Card>
  )
}

export default function Events() {
  const { events, source } = useEvents()
  const list = events ?? []
  const upcoming = list.filter((e) => isUpcoming(e)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = list.filter((e) => !isUpcoming(e)).sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  return (
    <>
      <PageHero
        title="Events"
        subtitle="Upcoming OHRR hoppenings — please join us to support OHRR and the bunnies!"
      />
      <PresentedBy surface="events" />
      <Section>
        <H2>Upcoming events</H2>
        {events !== null && <LiveNote source={source} />}
        {events === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="mt-6 text-slate-600">
            No upcoming events are scheduled right now. Join the mailing list below and we'll let you know
            about the next one.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="mt-12">
            <H2>Past events</H2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {past.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 rounded-3xl bg-brand-blue-50 p-6 text-center sm:p-8">
          <p className="text-slate-700">
            We keep things simple and only send the important stuff: updates, fundraisers, opportunities,
            Midwest BunFest information, and ways you can help rescue rabbits when it matters most.
          </p>
          <Link to={MAILING_LIST} className={`${btn.blue} mt-4`}>
            Join the OHRR mailing list
          </Link>
        </div>
      </Section>
    </>
  )
}
