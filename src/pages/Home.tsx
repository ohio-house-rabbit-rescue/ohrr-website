import { Link } from 'react-router-dom'
import { useAnnouncements, useFeaturedRabbits } from '../lib/data'
import { btn, RabbitCard, LiveNote, Section, LinkCard } from '../components/ui'
import type { IconName } from '../components/icons'
import PresentedBy from '../components/PresentedBy'
import { HomeHero } from '../components/HomeHero'
import ThisWeek from '../components/ThisWeek'
import { HelpSearchBox } from '../components/HelpSearchBox'
import { formatShortDate } from '../lib/format'

// The home page after the persona review (2026-09-24): it opens on who OHRR
// is, then the one question most visitors arrive with, then what's on this
// week, the rabbits, the news, four doors and the app. Nothing is offered
// twice, and every link says where it goes.

// "Something wrong with your bunny?" — the app's Bunny Help, one heading, one box.
function AskBunnyHelp() {
  return (
    <Section className="!py-8 md:!py-10">
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

function Featured() {
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
        {(rabbits ?? []).map((r) => <RabbitCard key={r.id} r={r} />)}
      </div>
    </Section>
  )
}

// The two newest announcements, briefly; the rest are on News.
function News() {
  const { items, source } = useAnnouncements(2)
  if (!items || items.length === 0) return null
  return (
    <Section className="!py-10 md:!py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">News from OHRR</h2>
        <Link to="/news" className="text-base font-bold text-brand-blue hover:text-brand-blue-dark">
          All news →
        </Link>
      </div>
      <LiveNote source={source} />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map((a) => (
          <div key={a.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            {a.createdAt && <p className="text-sm font-bold uppercase tracking-wider text-slate-600">{formatShortDate(a.createdAt)}</p>}
            <p className="mt-1 font-display text-lg font-extrabold text-ink">{a.title}</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-base text-slate-700">{a.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// Four doors, each named for where it goes. Adopt, Bunny Help and Events are
// already on the page above, so they are not repeated here.
function Doors() {
  const cards: { to: string; icon: IconName; h: string; p: string; cta: string }[] = [
    { to: '/learn', icon: 'book', h: 'Learn rabbit care', p: 'Diet, litter training, bonding, living space — and rabbit-savvy vets across Ohio.', cta: 'Care guides and vets →' },
    { to: '/volunteer', icon: 'users', h: 'Volunteer', p: 'Socialize bunnies, help with Buncare, drive vet runs, or rescue strays in the field.', cta: 'See the shifts →' },
    { to: '/give', icon: 'gift', h: 'Ways to give', p: 'Donate, workplace matching, Kroger rewards, the wish list, merch and more.', cta: 'Ways to give →' },
    { to: '/found', icon: 'mappin', h: 'Found a rabbit?', p: 'Wild or domestic, hurt or well: what to do right now, and how to report a stray.', cta: 'What to do →' },
  ]
  return (
    <section className="bg-canvas">
      <Section className="!py-10 md:!py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <LinkCard key={c.to} to={c.to} icon={c.icon} h={c.h} p={c.p} cta={c.cta} />
          ))}
        </div>
      </Section>
    </section>
  )
}

function AppCTA() {
  return (
    <Section className="!py-10 md:!py-14">
      <div className="rounded-3xl bg-ink px-6 py-10 text-center text-white sm:px-12">
        <h2 className="font-display text-2xl font-black sm:text-3xl">The same rescue, in your pocket</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-white/85">
          Everything on this site, laid out for a phone — plus My Bunny with reminders in your calendar, care guides
          that work offline, and the camera for a found-rabbit report or a Happy Tail.
        </p>
        <Link to="/app" className={`${btn.orange} mt-6`}>
          Get the app
        </Link>
      </div>
    </Section>
  )
}

export default function Home() {
  return (
    <>
      <HomeHero />
      <PresentedBy surface="home" className="mb-2 md:mb-4" />
      <AskBunnyHelp />
      <ThisWeek />
      <Featured />
      <News />
      <Doors />
      <AppCTA />
    </>
  )
}
