// The Midwest BunFest pages behind the cards on /bunfest (2026-09-24, OHRR:
// the topics "are not clickable to open for more details or lists like the
// app … next year we update on the admin and this will reflect the changes").
// Each reads this year's records: an activity's own page (Bunny Spa, the
// raffle, where to stay …), the talks and speakers, and who's coming.
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHero, Section, DoorList, H2, PrintButton, btn, ext, type Door } from '../components/ui'
import { Icon, type IconName } from '../components/icons'
import { externalHref, formatDate, hostOf } from '../lib/format'
import { telHref, useRescues } from '../lib/rescues'
import {
  bunfestDest,
  presenterName,
  timeRange,
  useFestivalYear,
  usePages,
  usePresenters,
  useRaffleDetails,
  useSessions,
  useVendors,
  type Presenter,
  type Session,
} from '../lib/bunfestPublic'

const PARENT = { to: '/bunfest', label: 'Midwest BunFest' }
const link = 'font-semibold text-brand-blue underline decoration-brand-blue/30 underline-offset-4 hover:decoration-brand-blue'

function Waiting() {
  return <p className="text-base text-slate-600">Loading…</p>
}

function Failed({ what, retry }: { what: string; retry: () => void }) {
  return (
    <p className="text-base text-slate-700">
      We couldn't load {what} just now.{' '}
      <button type="button" onClick={retry} className={link}>
        Try again
      </button>
    </p>
  )
}

function Later({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-brand-blue-50 px-5 py-4 text-base text-slate-700">{children}</p>
}

function BackLink() {
  return (
    <p className="no-print mt-10 text-base">
      <Link to="/bunfest" className={link}>
        ← Back to Midwest BunFest
      </Link>
    </p>
  )
}

/** A link staff typed (an app path or a web address) as a door on this site. */
function doorFor(label: string, to: string): Door | null {
  const d = bunfestDest(to)
  if (!d) return null
  const where = 'to' in d ? d.to : d.href
  const icon: IconName = where.includes('silent-auction')
    ? 'gavel'
    : where.startsWith('/bunfest/schedule')
      ? 'book'
      : where.startsWith('/bunfest/vendors')
        ? 'users'
        : where.startsWith('/learn/vets')
          ? 'mappin'
          : where.startsWith('/volunteer')
            ? 'heart'
            : 'info'
  return 'to' in d ? { h: label, icon, to: d.to } : { h: label, icon, href: d.href }
}

/* ------------------------------------------------------------ one topic */

export function BunFestTopic() {
  const { slug = '' } = useParams()
  const { event, year, loading } = useFestivalYear()
  const pages = usePages(year)
  const page = pages.data?.find((p) => p.slug === slug)
  const raffle = useRaffleDetails(page?.feature === 'raffle' ? event?.slug : undefined)

  if (loading || (year && pages.loading)) {
    return (
      <>
        <PageHero title="Midwest BunFest" parent={PARENT} />
        <Section>
          <Waiting />
        </Section>
      </>
    )
  }
  if (!year || pages.failed || !page) {
    return (
      <>
        <PageHero title={pages.failed ? 'Midwest BunFest' : 'Page not found'} parent={PARENT} />
        <Section>
          {pages.failed ? (
            <Failed what="this page" retry={pages.retry} />
          ) : (
            <Later>
              There's no page by that name for {year ?? 'this year'} yet. The details are added as they're
              confirmed.
            </Later>
          )}
          <BackLink />
        </Section>
      </>
    )
  }

  const c = page.contact
  const glance =
    page.chips.length > 0 || page.sponsorNote || c?.url ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">At a glance</p>
        {page.chips.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {page.chips.map((x) => (
              <li key={x} className="flex gap-2 text-base font-semibold text-ink">
                <Icon name="check" size={18} className="mt-1 shrink-0 text-brand-blue" />
                {x}
              </li>
            ))}
          </ul>
        )}
        {page.sponsorNote && <p className="mt-2 text-sm font-bold text-brand-orange-ink">{page.sponsorNote}</p>}
        {c?.url && (
          <a href={externalHref(c.url)} {...ext} className={`${btn.blue} mt-3 w-full`}>
            {c.urlLabel ?? 'Their website'}
          </a>
        )}
      </div>
    ) : undefined

  const related = page.related.map((r) => doorFor(r.label, r.to)).filter((d): d is Door => !!d)

  return (
    <>
      <PageHero title={page.title} subtitle={page.subtitle ?? undefined} parent={PARENT} aside={glance} />
      <Section className="!pt-6 md:!pt-8">
        <div className="max-w-3xl space-y-7">
          {page.note && (
            <p className="rounded-2xl bg-brand-orange-50 px-5 py-4 text-base font-semibold text-ink">{page.note}</p>
          )}
          {page.sections.map((s, i) => (
            <div key={i}>
              {s.heading && <h2 className="font-display text-xl font-extrabold text-ink">{s.heading}</h2>}
              {s.body && (
                <p className={`whitespace-pre-line text-base leading-relaxed text-slate-700 ${s.heading ? 'mt-2' : ''}`}>
                  {s.body}
                </p>
              )}
              {s.list && (
                <ul className={`list-disc space-y-1.5 pl-6 text-base leading-relaxed text-slate-700 ${s.heading || s.body ? 'mt-2' : ''}`}>
                  {s.list.map((l, j) => (
                    <li key={j}>{l}</li>
                  ))}
                </ul>
              )}
              {s.slot === 'raffle-details' && raffle.data && (
                <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-base text-slate-800">{raffle.data}</p>
              )}
            </div>
          ))}

          {page.reserveClosedNote && <Later>{page.reserveClosedNote}</Later>}

          {page.emailSignup && (
            <a href={`mailto:${page.emailSignup}?subject=${encodeURIComponent(page.title)}`} className={btn.blue}>
              <Icon name="mail" size={18} /> Email to sign up
            </a>
          )}

          {c && (c.address || c.phone) && (
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Contact</h2>
              <ul className="mt-2 space-y-1.5 text-base">
                {c.address && (
                  <li>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address)}`}
                      {...ext}
                      className={link}
                    >
                      {c.address}
                    </a>
                  </li>
                )}
                {c.phone && (
                  <li>
                    <a href={telHref(c.phone)} className={link}>
                      {c.phone}
                    </a>
                  </li>
                )}
              </ul>
              {c.url && (
                <a href={externalHref(c.url)} {...ext} className={`${btn.blue} mt-4`}>
                  {c.urlLabel ?? 'Their website'}
                </a>
              )}
            </div>
          )}

          {related.length > 0 && (
            <div className="no-print">
              <h2 className="font-display text-xl font-extrabold text-ink">{page.relatedLabel ?? 'See also'}</h2>
              <DoorList doors={related} className="mt-3 sm:grid-cols-2" />
            </div>
          )}
        </div>
        <BackLink />
      </Section>
    </>
  )
}

/* -------------------------------------------------- talks & speakers */

export function BunFestSchedule() {
  const { event, year, loading } = useFestivalYear()
  const sessions = useSessions(year)
  const presenters = usePresenters()
  const [track, setTrack] = useState('')

  const list = useMemo(() => sessions.data ?? [], [sessions.data])
  const tracks = useMemo(() => [...new Set(list.map((s) => s.track).filter(Boolean))], [list])
  const shown = list.filter((s) => !track || s.track === track)
  const byId = useMemo(() => new Map((presenters.data ?? []).map((p) => [p.id, p])), [presenters.data])
  // The speakers, in the order they first speak.
  const speakers = useMemo(
    () =>
      [...new Set(list.flatMap((s) => s.presenterIds))]
        .map((id) => byId.get(id))
        .filter((p): p is Presenter => !!p),
    [list, byId],
  )

  const subtitle = event
    ? `${formatDate(event.startsAt)}${event.venue ? ` · ${event.venue}` : ''}. Talks from rabbit vets and experts through the day.`
    : 'Talks from rabbit vets and experts through the day.'

  return (
    <>
      <PageHero title="Talks & schedule" subtitle={subtitle} parent={PARENT} />
      <Section className="!pt-6 md:!pt-8">
        {loading || (year && sessions.loading) ? (
          <Waiting />
        ) : sessions.failed ? (
          <Failed what="the schedule" retry={sessions.retry} />
        ) : list.length === 0 ? (
          <Later>The {year ?? ''} talks are announced closer to the festival.</Later>
        ) : (
          <>
            <div className="no-print flex flex-wrap items-center gap-3">
              {tracks.length > 1 && (
                <div role="group" aria-label="Which talks to show" className="flex flex-wrap gap-2">
                  {['', ...tracks].map((t) => (
                    <button
                      key={t || 'all'}
                      type="button"
                      aria-pressed={track === t}
                      onClick={() => setTrack(t)}
                      className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold transition ${
                        track === t ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 bg-white text-ink hover:border-brand-blue'
                      }`}
                    >
                      {t || 'All talks'}
                    </button>
                  ))}
                </div>
              )}
              {speakers.length > 0 && (
                <a href="#speakers" className={btn.outline}>
                  About the speakers
                </a>
              )}
              <PrintButton label="Print the schedule" />
            </div>

            <ol className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {shown.map((s) => (
                <SessionRow
                  key={s.id}
                  s={s}
                  showTrack={tracks.length > 1 && !track}
                  presenters={s.presenterIds.map((id) => byId.get(id)).filter((p): p is Presenter => !!p)}
                />
              ))}
            </ol>

            {speakers.length > 0 && (
              <div className="mt-12">
                <H2 id="speakers">The speakers</H2>
                <ul className="mt-4 max-w-4xl divide-y divide-slate-200">
                  {speakers.map((p) => (
                    <li key={p.id} id={`speaker-${p.id}`} className="flex gap-4 py-5">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-blue-50 font-display text-2xl font-black text-brand-blue"
                        >
                          {p.name.trim().slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-extrabold text-ink">{presenterName(p)}</h3>
                        {p.affiliation && <p className="text-sm font-semibold text-slate-600">{p.affiliation}</p>}
                        <p className="mt-1 text-sm text-slate-700">
                          {list
                            .filter((s) => s.presenterIds.includes(p.id))
                            .map((s) => `${timeRange(s.start, s.end)}: ${s.title}`)
                            .join(' · ')}
                        </p>
                        {p.bio && <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-700">{p.bio}</p>}
                        {p.website && (
                          <a href={externalHref(p.website)} {...ext} className={`${link} mt-2 inline-block text-base`}>
                            {hostOf(p.website)}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <BackLink />
      </Section>
    </>
  )
}

function SessionRow({ s, showTrack, presenters }: { s: Session; showTrack: boolean; presenters: Presenter[] }) {
  const when = timeRange(s.start, s.end)
  if (s.kind === 'break') {
    return (
      <li className="flex flex-wrap gap-x-6 gap-y-1 bg-slate-50 px-4 py-3 text-base text-slate-700 sm:px-6">
        <span className="w-40 shrink-0 font-bold">{when}</span>
        <span>
          {s.title}
          {showTrack && s.track ? ` · ${s.track}` : ''}
        </span>
      </li>
    )
  }
  return (
    <li className="flex flex-col gap-1 px-4 py-5 sm:flex-row sm:gap-6 sm:px-6">
      <div className="w-40 shrink-0">
        <p className="text-lg font-bold text-ink">{when}</p>
        {showTrack && s.track && <p className="text-sm font-semibold text-brand-blue">{s.track}</p>}
        {s.room && <p className="text-sm text-slate-600">{s.room}</p>}
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-extrabold text-ink">{s.title}</h2>
        {presenters.length > 0 ? (
          <p className="mt-0.5 text-base font-semibold text-slate-700">
            {presenters.map((p, i) => (
              <span key={p.id}>
                {i > 0 && (i === presenters.length - 1 ? ' and ' : ', ')}
                <a href={`#speaker-${p.id}`} className={link}>
                  {presenterName(p)}
                </a>
              </span>
            ))}
          </p>
        ) : (
          s.presenter && <p className="mt-0.5 text-base font-semibold text-slate-700">{s.presenter}</p>
        )}
        {s.description && <p className="mt-2 text-base leading-relaxed text-slate-700">{s.description}</p>}
      </div>
    </li>
  )
}

/* ------------------------------------------------ vendors & rescues */

export function BunFestVendors() {
  const { year, loading } = useFestivalYear()
  const vendors = useVendors(year)
  const rescues = useRescues()
  const [category, setCategory] = useState('')

  const all = useMemo(() => vendors.data ?? [], [vendors.data])
  const categories = useMemo(() => [...new Set(all.map((v) => v.category))].sort(), [all])
  const coming = rescues.items.filter((r) => r.atBunfest && !r.host)
  const shownCats = category ? [category] : categories

  const doors: Door[] = [
    { h: 'Vendors', p: all.length ? `${all.length} specialty rabbit shops` : undefined, icon: 'bag', href: '#vendors' },
    {
      h: 'Rescue partners',
      p: coming.length ? `${coming.length} rescue groups from across the region` : undefined,
      icon: 'heart',
      href: '#rescues',
    },
  ]

  return (
    <>
      <PageHero
        title="Vendors & rescue partners"
        subtitle={`Who's coming to Midwest BunFest${year ? ` ${year}` : ''}: specialty rabbit shops, and rescue groups from across the region.`}
        parent={PARENT}
        doors={doors}
      />
      <Section className="!pt-6 md:!pt-8">
        <H2 id="vendors">Vendors</H2>
        <div className="mt-4">
          {loading || (year && vendors.loading) ? (
            <Waiting />
          ) : vendors.failed ? (
            <Failed what="the vendors" retry={vendors.retry} />
          ) : all.length === 0 ? (
            <Later>The {year ?? ''} vendors are announced closer to the festival.</Later>
          ) : (
            <>
              {categories.length > 1 && (
                <div role="group" aria-label="Show one kind of vendor" className="no-print flex flex-wrap gap-2">
                  {['', ...categories].map((c) => (
                    <button
                      key={c || 'all'}
                      type="button"
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                      className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold transition ${
                        category === c ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 bg-white text-ink hover:border-brand-blue'
                      }`}
                    >
                      {c || `All (${all.length})`}
                    </button>
                  ))}
                </div>
              )}
              {shownCats.map((cat) => (
                <div key={cat} className="mt-7">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">{cat}</h3>
                  <ul className="mt-3 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    {all
                      .filter((v) => v.category === cat)
                      .map((v) => (
                        <li key={v.id}>
                          {v.website ? (
                            <a
                              href={externalHref(v.website)}
                              {...ext}
                              className="inline-flex items-center gap-1.5 font-display text-lg font-extrabold text-brand-blue hover:underline"
                            >
                              {v.name} <Icon name="external" size={15} />
                            </a>
                          ) : (
                            <p className="font-display text-lg font-extrabold text-ink">{v.name}</p>
                          )}
                          {v.blurb && <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{v.blurb}</p>}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>

        <H2 id="rescues" className="mt-14">
          Rescue partners
        </H2>
        <div className="mt-4">
          {rescues.loading ? (
            <Waiting />
          ) : coming.length === 0 ? (
            <Later>This year's rescue partners are announced closer to the festival.</Later>
          ) : (
            <>
              <p className="max-w-3xl text-base leading-relaxed text-slate-700">
                Rabbit rescue groups from across the region, at BunFest with Ohio House Rabbit Rescue.
              </p>
              <ul className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {coming.map((r) => (
                  <li key={r.id}>
                    <Link to={`/rescues/${r.id}`} className="font-display text-lg font-extrabold text-brand-blue hover:underline">
                      {r.name}
                    </Link>
                    {r.location && <p className="text-sm text-slate-600">{r.location}</p>}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-base">
                <Link to="/rescues" className={link}>
                  All rescues near you
                </Link>
              </p>
            </>
          )}
        </div>
        <BackLink />
      </Section>
    </>
  )
}
