import { Link } from 'react-router-dom'
import { useRabbits, useEvents, useHeroSlides } from '../lib/data'
import type { HeroSlide, Rabbit } from '../lib/types'
import { btn, ext, Section, DoorList, type Door } from '../components/ui'
import HomeBunnyHelp from '../components/HomeBunnyHelp'
import { easterAhead } from '../lib/season'
import PresentedBy from '../components/PresentedBy'
import { useOrgProfile } from '../lib/orgProfile'
import { formatDate, isUpcoming } from '../lib/format'
import { DONATE, OHRR, RABBIT_READY } from '../lib/constants'

// The home page, built around the rescue's purpose (2026-09-24). OHRR's
// mission, in its own words on the About page: run the Adoption Center,
// rescue abandoned pet rabbits, find them homes, and teach people to care for
// rabbits as indoor companions. So the page is: what OHRR is and the three
// doors a visitor comes for (adopt · help with my rabbit · found or
// surrendering one), the rabbits' own photos, what's happening (picture cards),
// and how to help. Real photos and artwork lead; the words stay short.

function Purpose() {
  // Help with my rabbit is a question box (HomeBunnyHelp) rather than a link,
  // so Bunny Help starts on the first screen.
  const doors: Door[] = [
    { to: '/adopt', icon: 'heart', h: 'Adopt a rabbit', p: 'The rabbits, and how adopting works' },
    { to: '/surrender', icon: 'mappin', h: 'Found or surrendering a rabbit', p: 'Strays, admissions and surrender' },
  ]
  const easter = easterAhead()
  // Phone order: title, the rabbits' photos, the doors, then the sentence. On a
  // laptop the photos take the right-hand column beside all three.
  return (
    <section className="border-b border-brand-blue/10 bg-brand-blue-50">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 pb-6 pt-5 md:gap-5 md:py-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-x-12 lg:gap-y-4">
        <div className="lg:col-start-1 lg:row-start-1">
          {easter && (
            <Link
              to={RABBIT_READY}
              className="mb-4 flex items-center gap-2 rounded-xl border border-brand-orange/40 bg-brand-orange-50 px-4 py-2.5 text-base text-slate-800 hover:border-brand-orange"
            >
              <span>
                <strong className="text-ink">
                  Easter is {easter.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Thinking about a bunny?
                </strong>{' '}
                Read this first.
              </span>
              <span aria-hidden="true" className="ml-auto font-bold text-brand-blue">→</span>
            </Link>
          )}
          <p className="text-sm font-extrabold uppercase tracking-wider text-brand-blue">Columbus, Ohio · since 2009</p>
          <h1 className="mt-2 font-display text-2xl font-black leading-tight text-ink sm:text-4xl">
            Rescuing abandoned pet rabbits and finding them homes
          </h1>
        </div>
        <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-center">
          <RabbitPhotos />
        </div>
        <div className="grid gap-2.5 lg:col-start-1 lg:row-start-3">
          <DoorList doors={doors} />
          <HomeBunnyHelp />
        </div>
        <p className="max-w-2xl text-base leading-relaxed text-slate-700 lg:col-start-1 lg:row-start-2">
          We run the Ohio House Rabbit Adoption Center in Columbus and teach people to care for rabbits as indoor
          companions, so fewer are ever given up.
        </p>
      </div>
    </section>
  )
}

// OHRR's own rabbits, the first thing a visitor sees (2026-09-24, OHRR: the page
// needs imagery that catches the eye). Live photos from the adoptable list, so the
// faces change as rabbits find homes. A swipeable row on a phone, 2×2 on a laptop.
function RabbitPhotos() {
  const { rabbits } = useRabbits()
  const all = rabbits ?? []
  const withPhotos = all.filter((r) => r.photo)
  if (rabbits !== null && withPhotos.length === 0) return null
  const tile = (r: Rabbit, i: number) => (
    <Link
      key={r.id}
      to={`/adopt/rabbit/${r.id}`}
      className={`group relative block aspect-square shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-black/5 ${
        i >= 4 ? 'lg:hidden' : ''
      } w-28 lg:w-auto`}
    >
      <img
        src={r.photo}
        alt={`${r.name}, a rabbit looking for a home at OHRR`}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        loading={i < 4 ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8 font-display text-base font-extrabold text-white lg:text-lg">
        {r.name}
      </span>
    </Link>
  )
  return (
    <div>
      {rabbits === null ? (
        <div className="flex gap-2.5 overflow-hidden lg:grid lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square w-28 shrink-0 animate-pulse rounded-2xl bg-slate-200 lg:w-auto" />
          ))}
        </div>
      ) : (
        <div className="-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
          {withPhotos.slice(0, 8).map(tile)}
          {/* On a phone the way to all of them is the last tile of the row */}
          <Link
            to="/adopt"
            className="flex aspect-square w-28 shrink-0 snap-start items-center justify-center rounded-2xl bg-white p-3 text-center font-display text-base font-extrabold text-brand-blue ring-1 ring-brand-blue/20 lg:hidden"
          >
            {all.length > 0 ? `Meet all ${all.length} →` : 'Meet them all →'}
          </Link>
        </div>
      )}
      <Link to="/adopt" className="mt-2.5 hidden min-h-11 items-center text-base font-bold text-brand-blue hover:text-brand-blue-dark lg:inline-flex">
        {all.length > 0 ? `Meet all ${all.length} rabbits looking for homes →` : 'Meet the rabbits →'}
      </Link>
    </div>
  )
}

// "What's happening at OHRR": picture cards like the current site's post grid —
// events, fundraisers and news, each with its own artwork. Staff pick them in
// Staff → Homepage features (the "What's happening" group); an event's card
// hides itself after its end date.
function WhatsHappening() {
  const { happening } = useHeroSlides()
  if (happening.length === 0) return null
  return (
    <Section className="!pb-4 !pt-8 md:!pt-10">
      <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">What’s happening at OHRR</h2>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {happening.map((s) => (
          <li key={s.id}>
            <HappeningCard s={s} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function HappeningCard({ s }: { s: HeroSlide }) {
  const cls =
    'group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
  const inner = (
    <>
      {/* Artwork is never cropped: logos and shirt designs keep their words */}
      <span className="flex aspect-[4/3] items-center justify-center bg-white p-3">
        {s.imageUrl ? (
          <img src={s.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
        ) : (
          <span className="h-full w-full rounded-xl bg-brand-blue-50" />
        )}
      </span>
      <span className="flex flex-1 flex-col border-t border-slate-100 p-3 sm:p-4">
        <span className="line-clamp-3 font-display text-base font-extrabold leading-snug text-ink group-hover:text-brand-blue sm:text-lg">
          {s.headline}
        </span>
        {s.subline && <span className="mt-1 hidden line-clamp-3 text-sm text-slate-600 sm:block">{s.subline}</span>}
        {s.ctaLabel && <span className="mt-auto pt-2 text-sm font-bold text-brand-blue">{s.ctaLabel} →</span>}
      </span>
    </>
  )
  const to = s.ctaUrl ?? '/news'
  return to.startsWith('/') ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <a href={to} {...ext} className={cls}>
      {inner}
    </a>
  )
}

// Before anyone buys or adopts: OHRR's two-minute check (2026-09-24, OHRR's
// research: rabbits are given up almost always for human reasons).
function ThinkingAboutARabbit() {
  return (
    <Section className="!py-4 md:!py-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-orange/40 bg-brand-orange-50 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-black text-ink">Thinking about getting a rabbit?</h2>
          <p className="mt-1 text-base text-slate-700">
            Read this before Easter, before the pet store, before the kids ask twice. Seven honest questions, two minutes.
          </p>
        </div>
        <Link to={RABBIT_READY} className={`${btn.orange} shrink-0`}>
          Take the two-minute check
        </Link>
      </div>
    </Section>
  )
}

// How people help the rescue do its work — three ways, one button each.
function HowToHelp() {
  return (
    <Section className="!py-8 md:!py-10">
      <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">Help us help them</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="font-display text-xl font-extrabold text-ink">Volunteer</h3>
          <p className="mt-1 flex-1 text-base text-slate-700">Socialize the rabbits, help with their daily care, or drive them to the vet.</p>
          <Link to="/volunteer" className={`${btn.blue} mt-4 self-start`}>
            See the shifts
          </Link>
        </div>
        <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="font-display text-xl font-extrabold text-ink">Foster</h3>
          <p className="mt-1 flex-1 text-base text-slate-700">Give a rabbit a few weeks in your home while they recover or wait for a family.</p>
          <Link to="/volunteer/foster" className={`${btn.blue} mt-4 self-start`}>
            I’m interested
          </Link>
        </div>
        <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="font-display text-xl font-extrabold text-ink">Donate</h3>
          <p className="mt-1 flex-1 text-base text-slate-700">Vet care, food and the Adoption Center. OHRR is a 501(c)(3), so gifts are tax deductible.</p>
          <a href={DONATE} {...ext} className={`${btn.orange} mt-4 self-start`}>
            Donate
          </a>
        </div>
      </div>
      <p className="mt-4 text-base text-slate-700">
        <Link to="/give" className="font-bold text-brand-blue">
          Other ways to give
        </Link>{' '}
        — workplace matching, the wish list, Kroger rewards and more.
      </p>
    </Section>
  )
}

// The secondary things, as one quiet line: the doors this week and the next event.
function ThisWeekLine() {
  const org = useOrgProfile()
  const { events } = useEvents()
  const next = (events ?? []).filter((e) => isUpcoming(e)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const bunfest = next && (/bunfest/i.test(next.slug) || /bunfest/i.test(next.title))
  return (
    <section className="border-t border-slate-200 bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 text-base text-slate-700 md:grid-cols-2">
        <p>
          <strong className="text-ink">Adoption Center &amp; Hop Shop, {OHRR.place}:</strong> {org.hours}
          {org.notice && <span className="block font-bold text-brand-orange-ink">{org.notice}</span>}
        </p>
        {next && (
          <p>
            <strong className="text-ink">Next event:</strong> {next.title}, {formatDate(next.startsAt)}.{' '}
            <Link to={bunfest ? '/bunfest' : '/events'} className="font-bold text-brand-blue">
              {bunfest ? 'About BunFest' : 'All events'}
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Purpose />
      <WhatsHappening />
      <ThinkingAboutARabbit />
      <PresentedBy surface="home" />
      <HowToHelp />
      <ThisWeekLine />
    </>
  )
}
