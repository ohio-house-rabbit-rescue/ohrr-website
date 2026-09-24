import { Link } from 'react-router-dom'
import { useFeaturedRabbits, useEvents } from '../lib/data'
import { btn, ext, RabbitCard, LiveNote, Section } from '../components/ui'
import { Icon, type IconName } from '../components/icons'
import PresentedBy from '../components/PresentedBy'
import { HelpSearchBox } from '../components/HelpSearchBox'
import { useOrgProfile } from '../lib/orgProfile'
import { formatDate, isUpcoming } from '../lib/format'
import { DONATE, OHRR } from '../lib/constants'

// The home page, built around the rescue's purpose (2026-09-24). OHRR's
// mission, in its own words on the About page: run the Adoption Center,
// rescue abandoned pet rabbits, find them homes, and teach people to care for
// rabbits as indoor companions. So the page is: what OHRR is and the three
// doors a visitor comes for (adopt · help with my rabbit · found or
// surrendering one), the rabbits, Bunny Help, and how to help. Everything else
// — BunFest, the Hop Shop, news, sponsors — is one quiet line or the footer.

function Purpose() {
  const doors: { to: string; icon: IconName; h: string; p: string; cta: string }[] = [
    { to: '/adopt', icon: 'heart', h: 'Adopt a rabbit', p: 'Meet the rescued rabbits waiting at the Adoption Center, and how adopting works.', cta: 'Meet the rabbits' },
    { to: '/help', icon: 'help', h: 'Help with my rabbit', p: 'Bunny Help, OHRR’s care guides, and rabbit-savvy vets across Ohio.', cta: 'Get help' },
    { to: '/surrender', icon: 'mappin', h: 'Found or surrendering a rabbit', p: 'What to do with a stray, and how admissions and surrender work at OHRR.', cta: 'What to do' },
  ]
  return (
    <section className="bg-gradient-to-b from-brand-blue-50 to-white">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <p className="text-sm font-extrabold uppercase tracking-wider text-brand-blue">Columbus, Ohio · since 2009</p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl font-black leading-tight text-ink sm:text-4xl md:text-5xl">
          Rescuing abandoned pet rabbits and finding them homes
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
          Ohio House Rabbit Rescue runs the Ohio House Rabbit Adoption Center in Columbus, and teaches people how to
          care for rabbits as indoor companions — so fewer are ever given up.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {doors.map((d) => (
            <li key={d.to}>
              <Link
                to={d.to}
                className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:border-brand-blue hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue">
                  <Icon name={d.icon} size={26} />
                </span>
                <span className="mt-4 font-display text-xl font-extrabold text-ink">{d.h}</span>
                <span className="mt-1 flex-1 text-base text-slate-700">{d.p}</span>
                <span className="mt-4 text-base font-bold text-brand-blue">{d.cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Rabbits() {
  const { rabbits, source } = useFeaturedRabbits(3)
  return (
    <Section className="!py-10 md:!py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">Rabbits looking for homes</h2>
        <Link to="/adopt" className="text-base font-bold text-brand-blue hover:text-brand-blue-dark">
          See all the rabbits →
        </Link>
      </div>
      <LiveNote source={source} />
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(rabbits ?? []).map((r) => (
          <RabbitCard key={r.id} r={r} />
        ))}
      </div>
    </Section>
  )
}

function AskBunnyHelp() {
  return (
    <Section className="!py-6 md:!py-8">
      <div className="rounded-3xl bg-brand-blue-50 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">Something wrong with your bunny?</h2>
        <p className="mt-2 max-w-2xl text-base text-slate-700">
          Type what you're seeing — "not eating", "hiding", "wet chin" — and get OHRR's own guidance, the urgent
          things first. General guidance, not a diagnosis.
        </p>
        <HelpSearchBox compact className="mt-4" />
      </div>
    </Section>
  )
}

// How people help the rescue do its work — three ways, one button each.
function HowToHelp() {
  return (
    <Section className="!py-10 md:!py-14">
      <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">Help us help them</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl font-extrabold text-ink">Volunteer</h3>
          <p className="mt-1 flex-1 text-base text-slate-700">Socialize the rabbits, help with their daily care, or drive them to the vet.</p>
          <Link to="/volunteer" className={`${btn.blue} mt-4 self-start`}>
            See the shifts
          </Link>
        </div>
        <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl font-extrabold text-ink">Foster</h3>
          <p className="mt-1 flex-1 text-base text-slate-700">Give a rabbit a few weeks in your home while they recover or wait for a family.</p>
          <Link to="/volunteer/foster" className={`${btn.blue} mt-4 self-start`}>
            I’m interested
          </Link>
        </div>
        <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
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
          <strong className="text-ink">Adoption Center &amp; Hop Shop:</strong> {org.hours}
          {org.notice && <span className="block font-bold text-brand-orange-ink">{org.notice}</span>}
          <span className="block">{OHRR.address}</span>
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
      <PresentedBy surface="home" className="mb-2 md:mb-4" />
      <Rabbits />
      <AskBunnyHelp />
      <HowToHelp />
      <ThisWeekLine />
    </>
  )
}
