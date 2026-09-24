import { Link } from 'react-router-dom'
import { useBunFestEvent } from '../lib/data'
import { PageHero, Section, btn, ext, LiveNote, ArticleBody, Card, DoorList, H2, LinkCard, type Door } from '../components/ui'
import SponsorWall from '../components/SponsorWall'
import { formatDate, formatTimeRange } from '../lib/format'
import { BUNFEST_SAMPLE, BUNFEST_SITE } from '../lib/constants'
import { bunfestDest, ctaFor, iconOf, useFeatures, useFestivalYear, usePages } from '../lib/bunfestPublic'
import { EventWhenWhere } from './Events'
import AddToCalendar from '../components/AddToCalendar'

// What's at Midwest BunFest, when this year's cards can't be read — from the
// live announcement post. Not links: the pages behind them are read too.
const FALLBACK = [
  { h: 'Sponsors, rescue partners & vendors', p: 'Bunny specialty shopping and rescue rabbit groups from across the region.' },
  { h: 'Educational sessions', p: 'Sessions throughout the whole day.' },
  { h: 'Bunny spa & glamour shots', p: 'Pampering and photos for your rabbit.' },
  { h: 'Silent auction & raffle', p: 'Bid and win — every dollar supports rescue.' },
  { h: 'OHRR Hop Shop', p: 'Healthy, safe supplies for your bunny; profits support OHRR.' },
  { h: 'Chillaxabun Lounge', p: 'A quiet place where your bunny can chill, equipped with hay, water and a hidey house.' },
]

/**
 * This year's "at the festival" cards (Staff → BunFest → Cards), each opening
 * its page, list or schedule — the same cards the app shows. Then the year's
 * other pages (bringing your rabbit, where to stay …) as "Plan your visit".
 * Next year: set the new date in Events, "Copy 2026 into 2027" in Staff →
 * BunFest, edit — and this page follows.
 */
function AtTheFestival() {
  const { year, loading } = useFestivalYear()
  const features = useFeatures(year)
  const pages = usePages(year)
  const live = features.data && features.data.length > 0 ? features.data : null
  const waiting = loading || (!!year && features.loading)

  // Pages no card opens, so a visitor can still find them.
  const carded = new Set((live ?? []).map((f) => f.link ?? ''))
  const more = (pages.data ?? []).filter((p) => !carded.has(`/bunfest/p/${p.slug}`))

  if (waiting) return <div className="mt-12 min-h-[24rem]" aria-busy="true" />
  // Phones get one short row per card (the doors pattern), not a tall stack of cards.
  const rows: Door[] = (live ?? []).flatMap((f) => {
    const d = bunfestDest(f.link)
    return d ? [{ h: f.title, icon: iconOf(f.icon), ...('to' in d ? { to: d.to } : { href: d.href }) }] : []
  })
  return (
    <>
      <H2 className="mt-12">At the festival</H2>
      {live && <DoorList doors={rows} className="mt-5 sm:hidden" />}
      <div className={`mt-5 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${live ? 'hidden sm:grid' : 'grid'}`}>
        {live
          ? live.map((f) => {
              const d = bunfestDest(f.link)
              if (!d) {
                return (
                  <Card key={f.id}>
                    <h3 className="font-display text-lg font-extrabold text-brand-blue">{f.title}</h3>
                    {f.blurb && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.blurb}</p>}
                  </Card>
                )
              }
              return (
                <LinkCard
                  key={f.id}
                  {...('to' in d ? { to: d.to } : { href: d.href })}
                  h={f.title}
                  p={f.blurb ?? ''}
                  cta={ctaFor(d)}
                  icon={iconOf(f.icon)}
                />
              )
            })
          : FALLBACK.map((f) => (
              <Card key={f.h}>
                <h3 className="font-display text-lg font-extrabold text-brand-blue">{f.h}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.p}</p>
              </Card>
            ))}
      </div>
      {live && more.length > 0 && (
        <>
          <H2 className="mt-12">Plan your visit</H2>
          <DoorList
            className="mt-5 sm:grid-cols-2 lg:grid-cols-3"
            doors={more.map((p) => ({ h: p.title, p: p.subtitle ?? undefined, icon: iconOf(p.icon), to: `/bunfest/p/${p.slug}` }))}
          />
        </>
      )}
    </>
  )
}

/** Admission and the rabbit rule from the event's own record, when staff have set them. */
function Facts({ info }: { info?: Record<string, unknown> | null }) {
  if (!info) return null
  const admission = Array.isArray(info.admission)
    ? (info.admission as { who?: string; price?: string }[]).filter((a) => a?.who && a?.price)
    : []
  const rule = typeof info.rabbit_rule === 'string' ? info.rabbit_rule : ''
  const tickets = typeof info.tickets_url === 'string' ? info.tickets_url : ''
  if (admission.length === 0 && !rule) return null
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
      {admission.length > 0 && (
        <div>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Admission</dt>
          <dd className="mt-0.5 font-semibold">{admission.map((a) => `${a.who} ${a.price}`).join(' · ')}</dd>
          {tickets && (
            <dd>
              <a href={tickets} {...ext} className="font-semibold text-brand-blue">
                Buy tickets
              </a>
            </dd>
          )}
        </div>
      )}
      {rule && (
        <div>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Bringing your rabbit</dt>
          <dd className="mt-0.5">{rule}</dd>
        </div>
      )}
    </dl>
  )
}

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
          <div className="order-last rounded-3xl bg-gradient-to-br from-[#1690bf] to-[#0f7197] p-4 shadow-xl md:order-none md:p-6">
            <div className="rounded-2xl bg-white p-4 md:p-5">
              <img src="/img/bunfest-2026-logo.png" alt="Midwest BunFest" className="mx-auto block w-full max-w-[14rem] md:max-w-xs" />
            </div>
          </div>
          <div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : event ? (
              <>
                {event.theme && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-ink">
                    This year's theme: {event.theme}
                  </span>
                )}
                <p className={`${event.theme ? 'mt-3' : ''} font-display text-2xl font-black text-ink`}>Mark your calendars!</p>
                <EventWhenWhere e={event} />
                <AddToCalendar e={event} className="mt-4" />
                <Facts info={event.info} />
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
              <a href={BUNFEST_SAMPLE} {...ext} className={btn.blue}>
                The BunFest website
              </a>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              The schedule, the map, the rabbit rules and everyone who's coming. The current official site is{' '}
              <a href={event?.url ?? BUNFEST_SITE} {...ext} className="font-semibold text-brand-blue">
                midwestbunfest.org
              </a>
              .
            </p>
          </div>
        </div>

        <AtTheFestival />

        <Card className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Silent auction &amp; raffle</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Preview the silent-auction items and raffle prizes for Midwest BunFest 2026.
            </p>
          </div>
          <Link to="/bunfest/silent-auction" className={btn.blue}>
            Auction items &amp; raffle prizes
          </Link>
        </Card>

        {event?.body && (
          <div className="mt-12 max-w-3xl">
            <ArticleBody body={event.body} />
          </div>
        )}

        <SponsorWall
          surface="bunfest"
          id="sponsors"
          className="mt-14"
          ask={{ text: "Want to sponsor next year's BunFest?", subject: 'Sponsoring Midwest BunFest' }}
        />
        <p className="mt-10 text-xs leading-relaxed text-slate-600">
          Midwest BunFest is hosted and sponsored by Ohio House Rabbit Rescue. The 2026 "Binky On!" logo is by
          tattoo artist Jillian Lisska.
        </p>
      </Section>
    </>
  )
}
