import { Link } from 'react-router-dom'
import { useFeaturedRabbits, useEvents } from '../lib/data'
import { btn, ext, RabbitCard, LiveNote, Section, DoorList, type Door } from '../components/ui'
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
// surrendering one), the rabbits, Bunny Help, and how to help. Everything else
// — BunFest, the Hop Shop, news, sponsors — is one quiet line or the footer.

function Purpose() {
  // Help with my rabbit is a question box (HomeBunnyHelp) rather than a link,
  // so Bunny Help starts on the first screen.
  const doors: Door[] = [
    { to: '/adopt', icon: 'heart', h: 'Adopt a rabbit', p: 'The rabbits, and how adopting works' },
    { to: '/surrender', icon: 'mappin', h: 'Found or surrendering a rabbit', p: 'Strays, admissions and surrender' },
  ]
  const easter = easterAhead()
  return (
    <section className="border-b border-brand-blue/10 bg-brand-blue-50">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 pb-6 pt-5 md:gap-5 md:py-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:gap-12">
        <div>
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
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
            We run the Ohio House Rabbit Adoption Center in Columbus and teach people to care for rabbits as indoor
            companions, so fewer are ever given up.
          </p>
        </div>
        <div className="grid gap-2.5">
          <DoorList doors={doors} />
          <HomeBunnyHelp />
        </div>
      </div>
    </section>
  )
}

function Rabbits() {
  const { rabbits, source } = useFeaturedRabbits(4)
  return (
    <Section className="!py-6 md:!py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl font-black text-ink">Rabbits looking for homes</h2>
        <Link to="/adopt" className="text-base font-bold text-brand-blue hover:text-brand-blue-dark">
          See all the rabbits →
        </Link>
      </div>
      <LiveNote source={source} />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {(rabbits ?? []).map((r) => (
          <RabbitCard key={r.id} r={r} compact />
        ))}
      </div>
    </Section>
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
      <Rabbits />
      <ThinkingAboutARabbit />
      <PresentedBy surface="home" />
      <HowToHelp />
      <ThisWeekLine />
    </>
  )
}
