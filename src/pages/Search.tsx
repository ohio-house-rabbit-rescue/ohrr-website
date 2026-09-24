// Site search (/search?q=): one big box that looks across the site's pages, the
// Rabbit care articles, Bunny Help topics, adoptable rabbits, vets, events and
// news — all client-side, grouped by kind. Ported from the OHRR app's
// pages/Search.tsx + data/search.ts; the live lists come from the same hooks
// the public pages use, so what you find is what is published.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHero, Section, btn } from '../components/ui'
import { Icon } from '../components/icons'
import { useAnnouncements, useCareArticles, useEvents, useRabbits, useVets } from '../lib/data'
import { useCareTopics } from '../lib/bunnyhelp/useTopics'
import { URGENCY_LABEL } from '../lib/bunnyhelp/types'
import { formatShortDate } from '../lib/format'

interface SearchItem {
  title: string
  subtitle: string
  to: string
  group: string
  keywords: string // lowercased haystack
}

const mk = (title: string, subtitle: string, to: string, group: string, extra = ''): SearchItem => ({
  title,
  subtitle,
  to,
  group,
  keywords: `${title} ${subtitle} ${extra}`.toLowerCase(),
})

// The site's own pages, in plain language (routes from App.tsx).
const PAGES: { title: string; subtitle: string; to: string; extra?: string }[] = [
  { title: 'Home', subtitle: 'Ohio House Rabbit Rescue', to: '/' },
  { title: 'Adopt a rabbit', subtitle: 'Adoptable bunnies & how adopting works', to: '/adopt', extra: 'adoption apply application petfinder bonded pair' },
  { title: 'Adoption policy', subtitle: 'Requirements, fees & procedure', to: '/adopt/policy', extra: 'policy fee indoor' },
  { title: 'Adoption application', subtitle: 'Apply to adopt', to: '/adopt/apply', extra: 'form apply' },
  { title: 'Rabbit care', subtitle: 'Care articles from OHRR', to: '/learn', extra: 'learn diet housing health litter toys bonding' },
  { title: 'Find a rabbit-savvy vet', subtitle: 'Vets for rabbit care across Ohio', to: '/learn/vets', extra: 'veterinarian emergency exotic spay neuter medvet rhdv2 vaccine' },
  { title: 'What kind of bunny do I have?', subtitle: 'Breed guide with photos', to: '/learn/breeds', extra: 'breeds lop lionhead dwarf rex' },
  { title: 'Bunny Help', subtitle: '“My bunny is…” — OHRR’s guidance by symptom', to: '/help', extra: 'help not eating hiding diarrhea chewing litter' },
  { title: 'Volunteer', subtitle: 'Ways to help', to: '/volunteer', extra: 'socialization buncare transport field rescue shifts' },
  { title: 'Book a bunny socialization shift', subtitle: 'Volunteer shifts at the Adoption Center', to: '/book/bunny-socialization', extra: 'volunteer book shift' },
  { title: 'Book a Buncare shift', subtitle: 'Volunteer shifts at the Adoption Center', to: '/book/buncare-shift', extra: 'volunteer book shift cleaning' },
  { title: 'Foster a rabbit', subtitle: 'Foster interest form', to: '/volunteer/foster', extra: 'foster form' },
  { title: 'Volunteer interest form', subtitle: 'Tell OHRR how you’d like to help', to: '/volunteer/interest', extra: 'form' },
  { title: 'Midwest BunFest', subtitle: 'The festival', to: '/bunfest', extra: 'event october binky on hilliard makoy' },
  { title: 'Silent auction', subtitle: 'Midwest BunFest', to: '/bunfest/silent-auction', extra: 'items bidding raffle' },
  { title: 'Events', subtitle: 'OHRR hoppenings', to: '/events', extra: 'calendar bunfest' },
  { title: 'Ways to give', subtitle: 'Donate & support OHRR', to: '/give', extra: 'donation gift wish list kroger license plate merch workplace' },
  { title: 'Become a supporter', subtitle: 'Monthly and one-time support', to: '/support/become-a-supporter', extra: 'donate supporter' },
  { title: 'Impact', subtitle: 'The year in numbers', to: '/impact', extra: 'donors sponsors numbers' },
  { title: 'Hop Shop', subtitle: 'Supplies & merch', to: '/hop-shop', extra: 'hay pellets litter toys store hours' },
  { title: 'Found a rabbit? Surrendering a rabbit?', subtitle: 'Strays, field rescue & surrender', to: '/surrender', extra: 'stray lost abandoned catch surrender admissions relinquish rehome give up' },
  { title: 'Partners', subtitle: 'Sponsors and rescue partners', to: '/partners', extra: 'sponsor' },
  { title: 'Partner perks', subtitle: 'Offers from OHRR’s partners', to: '/partners/perks', extra: 'discount code' },
  { title: 'News', subtitle: 'Announcements and updates', to: '/news', extra: 'announcements' },
  { title: 'Mailing list', subtitle: 'Join the OHRR mailing list', to: '/mailing-list', extra: 'newsletter email' },
  { title: 'About OHRR', subtitle: 'Mission, hours & visiting', to: '/about', extra: 'hours address directions visit contact instagram facebook' },
  { title: 'Contact', subtitle: 'Email, a message form, and visiting', to: '/contact', extra: 'email message address directions visit' },
  { title: 'Get the OHRR app', subtitle: 'The whole rescue on your phone', to: '/app', extra: 'app iphone android my bunny' },
  { title: 'Privacy', subtitle: 'How this site handles your information', to: '/privacy', extra: 'privacy data' },
  { title: 'OHRR staff sign-in', subtitle: 'For staff & volunteers', to: '/staff', extra: 'staff sign in login admin dashboard' },
]

const SUGGESTIONS = ['Adopt', 'Bonding', 'Diet', 'Foster', 'Vets', 'Donate']

function searchAll(index: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  return index.filter((item) => terms.every((t) => item.keywords.includes(t)))
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  // Put the cursor in the box on arrival.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const update = (next: string) => {
    setQuery(next)
    const t = next.trim()
    setParams(t ? { q: t } : {}, { replace: true })
  }

  const { articles } = useCareArticles()
  const { topics } = useCareTopics()
  const { rabbits } = useRabbits(200)
  const { vets } = useVets()
  const { events } = useEvents()
  const { items: news } = useAnnouncements(0)

  const index = useMemo<SearchItem[]>(
    () => [
      ...PAGES.map((p) => mk(p.title, p.subtitle, p.to, 'Pages', p.extra ?? '')),
      ...(articles ?? []).map((a) =>
        mk(
          a.title,
          a.summary,
          (a.section ?? 'care') === 'care' ? `/learn/${a.slug}` : `/info/${a.slug}`,
          (a.section ?? 'care') === 'care' ? 'Rabbit care' : 'Pages',
          (a.body ?? '').slice(0, 400),
        ),
      ),
      ...topics.map((t) => mk(t.title, `${URGENCY_LABEL[t.urgency]} · ${t.summary}`, `/help/${t.slug}`, 'Bunny Help', t.aliases.join(' '))),
      ...(rabbits ?? []).map((r) =>
        mk(
          r.name,
          [r.breed ?? 'Rabbit', r.age, r.sex].filter(Boolean).join(' · '),
          `/adopt/rabbit/${r.id}`,
          'Adoptable rabbits',
          `${r.tags?.join(' ') ?? ''} ${r.description ?? ''} ${r.bonded ? 'bonded pair' : ''}`,
        ),
      ),
      ...(vets ?? []).map((v) =>
        mk(
          v.name,
          [v.city, v.region].filter(Boolean).join(' · '),
          '/learn/vets',
          'Vets',
          `${v.doctors ?? ''} ${v.notes ?? ''} ${v.isEmergency ? 'emergency 24/7' : ''} ${v.isLowCostSpay ? 'low cost spay neuter' : ''} ${v.givesRhdv2 ? 'rhdv2 vaccine' : ''}`,
        ),
      ),
      ...(events ?? []).map((e) =>
        mk(e.title, [formatShortDate(e.startsAt), e.venue, e.city].filter(Boolean).join(' · '), '/events', 'Events', `${e.theme ?? ''} ${e.summary ?? ''}`),
      ),
      ...(news ?? []).map((n) => mk(n.title, n.createdAt ? formatShortDate(n.createdAt) : 'News', '/news', 'News', n.body.slice(0, 400))),
    ],
    [articles, topics, rabbits, vets, events, news],
  )

  const results = useMemo(() => searchAll(index, query), [index, query])
  const grouped = useMemo(() => {
    const m = new Map<string, SearchItem[]>()
    for (const r of results) {
      if (!m.has(r.group)) m.set(r.group, [])
      m.get(r.group)!.push(r)
    }
    return [...m.entries()]
  }, [results])

  const loadingAny = articles === null || rabbits === null || vets === null || events === null || news === null

  return (
    <>
      <PageHero title="Search" subtitle="Find a page, a care article, a Bunny Help topic, an adoptable rabbit, a vet, an event or a news item." />
      <Section>
        <form onSubmit={(e) => e.preventDefault()} role="search" className="relative">
          <Icon name="search" size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-blue" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => update(e.target.value)}
            placeholder="Search the site…"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Search the site"
            className="w-full rounded-full border border-brand-blue/30 bg-white py-4 pl-14 pr-14 text-lg text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => update('')}
              aria-label="Clear the search"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            >
              <Icon name="x" size={20} />
            </button>
          )}
        </form>

        {!query.trim() && (
          <div className="mt-6 space-y-3">
            <p className="text-base leading-relaxed text-slate-600">
              Search across the whole site — rabbits, care articles, Bunny Help, vets, events and news. Type above, or
              try one of these:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update(s)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-base text-slate-600">
              {loadingAny ? 'Still loading the live lists…' : `No matches for “${query.trim()}”. Try another word, or ask Bunny Help.`}
            </p>
            {!loadingAny && (
              <Link to={`/help?q=${encodeURIComponent(query.trim())}`} className={btn.blue}>
                Ask Bunny Help
              </Link>
            )}
          </div>
        )}

        {grouped.map(([group, items]) => (
          <section key={group} className="mt-8">
            <h2 className="font-display text-xl font-extrabold text-ink">
              {group} <span className="text-base font-bold text-slate-600">({items.length})</span>
            </h2>
            <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              {items.map((item) => (
                <Link
                  key={item.group + item.to + item.title}
                  to={item.to}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-brand-blue">{item.title}</span>
                    {item.subtitle && <span className="block text-sm text-slate-600">{item.subtitle}</span>}
                  </span>
                  <Icon name="chevron" size={18} className="shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </Section>
    </>
  )
}
