// /tails — Happy Tails: where OHRR bunnies are now (website mirror of the
// app's Tails page). Stories are published by staff from the Inbox; until the
// first one, one story labelled "Example" shows (data/tails.ts).
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, Card, Callout, H2, LiveNote, btn } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { BunnyPhoto, StatusPill, ExampleBadge, ExampleNote, withFamily } from '../components/tailbits'
import { useHappyTails, type Tail } from '../lib/tails'
import { EXAMPLE_TAIL_NOTE } from '../data/tails'

const FILTERS = ['All', 'Just adopted', 'Going strong'] as const
type Filter = (typeof FILTERS)[number]

const pill = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-bold transition ${active ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`

export default function Tails() {
  const [filter, setFilter] = useState<Filter>('All')
  const { items, source, loading } = useHappyTails()
  // Nothing published yet: the page shows the one labelled example instead.
  const example = source === 'sample'

  const list = useMemo(() => {
    switch (filter) {
      case 'Just adopted':
        return items.filter((t) => t.status === 'just-adopted')
      case 'Going strong':
        return items.filter((t) => t.status === 'going-strong')
      default:
        return items
    }
  }, [filter, items])

  return (
    <>
      <PageHero
        title="Happy Tails"
        subtitle="Where OHRR bunnies are now — and how they’re doing. Stories and photos from the families who adopted them."
      />
      <PresentedBy surface="happy-tails" />
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <H2>Adoption stories</H2>
            {!loading && (example ? <ExampleNote>{EXAMPLE_TAIL_NOTE}</ExampleNote> : <LiveNote source={source} />)}
          </div>
          <Link to="/tails/share" className={btn.orange}>
            Share your bunny’s story
          </Link>
        </div>

        {/* Filters only mean something once there are real stories */}
        {!example && (
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={pill(filter === f)}>
                {f}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-base text-slate-600">Loading…</p>
        ) : list.length === 0 ? (
          <Card className="mt-6 text-base text-slate-600">No stories here yet — check back soon!</Card>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <TailCard key={t.id} tail={t} />
            ))}
          </div>
        )}

        {/* Submission — curated model: OHRR collects and posts these */}
        <Callout className="mt-12">
          <h2 className="font-display text-xl font-extrabold text-brand-blue">Share your Happy Tail</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-700">
            Adopted a bunny from OHRR? Send a photo and a quick update and we’ll add your story here. OHRR reads every
            story before it goes on this page.
          </p>
          <Link to="/tails/share" className={`${btn.orange} mt-4`}>
            Share your bunny’s story
          </Link>
        </Callout>
      </Section>
    </>
  )
}

function TailCard({ tail: t }: { tail: Tail }) {
  const meta = [t.family && withFamily(t.family), t.since].filter(Boolean).join(' · ')
  return (
    <Link
      to={`/tails/${t.id}`}
      className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full bg-slate-100">
        <BunnyPhoto name={t.bunny} photo={t.photo} />
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-extrabold text-ink">{t.bunny}</h3>
          {t.example && <ExampleBadge />}
          {t.bonded && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-bold text-slate-700">Pair</span>}
        </div>
        <StatusPill status={t.status} className="mt-1.5" />
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{t.summary}</p>
        {meta && <p className="mt-1 text-sm font-semibold text-slate-600">{meta}</p>}
        <span className="mt-2 inline-block text-sm font-bold text-brand-blue">
          {t.example ? 'Read the example story →' : `Read ${t.bunny}’s story →`}
        </span>
      </div>
    </Link>
  )
}
