import { Link } from 'react-router-dom'
import { useAnnouncements, useFeaturedRabbits } from '../lib/data'
import { btn, RabbitCard, LiveNote, Section, NewsImage } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { HomeHero, FeaturedStrip } from '../components/HomeHero'

function Announcements() {
  const { items, source } = useAnnouncements(3)
  if (!items || items.length === 0) return null
  return (
    <div className="mx-auto max-w-6xl px-5">
      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className="rounded-2xl border border-brand-orange/30 bg-brand-orange-50/60 px-4 py-3 sm:px-5">
            <div className={a.imageUrl ? 'flex flex-col gap-3 py-1 sm:flex-row sm:items-start sm:gap-5' : ''}>
              {a.imageUrl && (
                <NewsImage
                  src={a.imageUrl}
                  alt={a.title}
                  fit={a.imageFit}
                  href={a.url}
                  className="w-full shrink-0 sm:w-48 md:w-56"
                />
              )}
              <div className="min-w-0">
                <p className="font-display text-sm font-extrabold text-ink">{a.title}</p>
                <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{a.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <LiveNote source={source} />
        <Link to="/news" className="text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
          All news →
        </Link>
      </div>
    </div>
  )
}

function Stats() {
  const items = [
    { n: '2009', t: 'Founded by longtime rabbit owner Beverly May.' },
    { n: '900+', t: 'Rabbits offered for surrender each year in Central Ohio alone.' },
    { n: '25–30', t: 'Rabbits housed at a time at the Ohio House Rabbit Adoption Center.' },
    { n: 'BunFest', t: 'Host of Midwest BunFest, a multi-state educational expo and fundraiser.' },
  ]
  return (
    <section className="bg-brand-blue text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 sm:gap-8 lg:grid-cols-4 lg:py-12">
        {items.map((s) => (
          <div key={s.n}>
            <p className="font-display text-2xl font-black sm:text-3xl">{s.n}</p>
            <p className="mt-1 text-sm text-white/80">{s.t}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Featured() {
  const { rabbits, source } = useFeaturedRabbits(3)
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-black text-ink sm:text-3xl md:text-4xl">
          Rabbits looking for homes
        </h2>
        <Link to="/adopt" className="text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
          See all rabbits →
        </Link>
      </div>
      <LiveNote source={source} />
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(rabbits ?? []).map((r) => <RabbitCard key={r.id} r={r} />)}
      </div>
    </Section>
  )
}

function Teasers() {
  const cards = [
    { to: '/events', h: 'Midwest BunFest & events', p: 'Our flagship festival is Sunday, October 25, 2026 in Hilliard — plus other OHRR hoppenings.' },
    { to: '/learn', h: 'Learn rabbit care', p: 'Diet, litter training, bonding, toys, living space — and rabbit-savvy vets across Ohio.' },
    { to: '/volunteer', h: 'Volunteer', p: 'Socialize bunnies, help with Buncare, drive vet runs, or rescue strays in the field.' },
    { to: '/give', h: 'Ways to give', p: 'Donate, workplace matching, Kroger rewards, the wish list, merch, the license plate, and more.' },
  ]
  return (
    <section className="bg-canvas">
      <Section className="!py-12 md:!py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="font-display text-lg font-extrabold text-brand-blue">{c.h}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.p}</p>
              <span className="mt-2 inline-block text-sm font-bold text-brand-orange">Explore →</span>
            </Link>
          ))}
        </div>
      </Section>
    </section>
  )
}

function AppCTA() {
  return (
    <Section>
      <div className="rounded-3xl bg-ink px-6 py-10 text-center text-white sm:px-12 md:py-12">
        <h2 className="font-display text-2xl font-black sm:text-3xl">The whole rescue, in one app</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/75 md:text-base">
          Adoptable rabbits, care guides, rabbit-savvy vets, volunteering, ways to give, and the full
          Midwest BunFest companion — all in the OHRR app, on your phone.
        </p>
        <Link to="/app" className={`${btn.orange} mt-6`}>
          Open the app
        </Link>
      </div>
    </Section>
  )
}

export default function Home() {
  return (
    <>
      <HomeHero />
      <PresentedBy surface="home" className="mb-6 md:mb-8" />
      <FeaturedStrip />
      <Announcements />
      <Stats />
      <Featured />
      <Teasers />
      <AppCTA />
    </>
  )
}
