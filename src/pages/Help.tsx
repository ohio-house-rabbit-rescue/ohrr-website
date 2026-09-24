// Bunny Help (/help): the "My bunny is…" search plus every topic, grouped by
// category and ordered by urgency, with "Ask OHRR" for anything the topics
// don't cover. Ported from the OHRR app's features/bunnyhelp (HelpSearch,
// HelpBrowse) and pages/Help.tsx. Reads `?q=` so the home-page box and links
// from elsewhere land here with the question already typed.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHero, Section, Card, H2, btn } from '../components/ui'
import { Icon } from '../components/icons'
import { EXAMPLE_QUESTIONS } from '../components/HelpSearchBox'
import { useCareTopics } from '../lib/bunnyhelp/useTopics'
import { buildIndex, cleanQuery, hasEmergency, searchTopics } from '../lib/bunnyhelp/search'
import { Disclaimer, EMERGENCY_VET, EmergencyCard, TopicRow } from '../lib/bunnyhelp/ui'
import { CATEGORIES, CATEGORY_LABEL, URGENCY_RANK, askOhrrHref, type TopicCategory } from '../lib/bunnyhelp/types'
import { OHRR } from '../lib/constants'

type Filter = 'all' | TopicCategory

export default function Help() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const { topics, source } = useCareTopics()
  const index = useMemo(() => buildIndex(topics), [topics])
  const [filter, setFilter] = useState<Filter>('all')

  const cleaned = cleanQuery(q)
  const active = cleaned.length >= 2
  const results = useMemo(() => (active ? searchTopics(index, q, 6) : []), [index, q, active])
  const emergency = hasEmergency(results)

  const update = (next: string) => {
    setQ(next)
    const t = next.trim()
    setParams(t ? { q: t } : {}, { replace: true })
  }

  const list = useMemo(
    () =>
      topics
        .filter((t) => filter === 'all' || t.category === filter)
        .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.sort_order - b.sort_order),
    [topics, filter],
  )

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All topics' },
    ...CATEGORIES.map((c) => ({ value: c as Filter, label: CATEGORY_LABEL[c] })),
  ]

  return (
    <>
      <PageHero
        title="Bunny Help"
        subtitle="Tell us what your bunny is doing and we’ll point you to OHRR’s own care guidance — never a diagnosis."
        aside={
          <label className="block">
            <span className="font-display text-xl font-extrabold text-ink">Is something up with your bunny?</span>
            <span className="relative mt-2 block">
              <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" />
              <input
                type="search"
                value={q}
                onChange={(e) => update(e.target.value)}
                placeholder="Did my bunny stop eating?"
                autoComplete="off"
                enterKeyHint="search"
                aria-label="What is your bunny doing?"
                className="w-full rounded-full border border-brand-blue/30 bg-white py-3 pl-12 pr-4 text-base text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </span>
            <span className="mt-1.5 block text-sm text-slate-600">Ask it the way you’d ask a friend.</span>
          </label>
        }
      />
      <Section>
        <Card className="space-y-4">

          {!active && (
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => update(question)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {!emergency && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-base text-amber-950">
              <strong>Emergency tonight?</strong> {EMERGENCY_VET.name},{' '}
              <a href={EMERGENCY_VET.phoneHref} className="font-bold text-brand-blue">
                {EMERGENCY_VET.phone}
              </a>{' '}
              — {EMERGENCY_VET.note.toLowerCase()} ·{' '}
              <Link to="/learn/vets" className="font-bold text-brand-blue">
                all rabbit-savvy vets
              </Link>
            </p>
          )}
          {emergency && <EmergencyCard />}

          {active && results.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-slate-700">
                {results.length === 1 ? 'The topic that matches' : `${results.length} topics that match`} — most urgent first
              </p>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                {results.map((t) => (
                  <li key={t.id}>
                    <TopicRow t={t} q={cleaned} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {active && results.length === 0 && (
            <div className="space-y-3 rounded-2xl bg-slate-50 px-5 py-4">
              <p className="text-base font-bold text-ink">No matching topic yet.</p>
              <p className="text-base leading-relaxed text-slate-600">
                Ask OHRR by email and they’ll point you in the right direction. For anything urgent, call a
                rabbit-savvy vet instead of waiting for a reply.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={askOhrrHref(cleaned)} className={btn.blue}>
                  <Icon name="mail" size={16} /> Ask OHRR
                </a>
                <Link to="/learn/vets" className={btn.outline}>
                  Find a vet
                </Link>
              </div>
            </div>
          )}
        </Card>

        <div className="mt-12">
          <H2>Browse by topic</H2>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter topics by category">
            {filters.map((f) => {
              const on = filter === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    on ? 'bg-brand-blue text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-brand-blue hover:text-brand-blue'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            {list.map((t) => (
              <TopicRow key={t.id} t={t} />
            ))}
            {list.length === 0 && <p className="px-5 py-8 text-center text-base text-slate-600">No topics here yet.</p>}
          </div>
          {source === 'seed' && (
            <p className="mt-3 text-sm text-slate-600">
              Built-in topics drawn from OHRR’s care resources. OHRR staff can edit and add to these.
            </p>
          )}
        </div>

        <Card className="mt-12 border-brand-orange/25 bg-brand-orange-50/50">
          <h2 className="font-display text-xl font-extrabold text-ink">Still need a hand?</h2>
          <p className="mt-1.5 text-base leading-relaxed text-slate-600">
            OHRR is run entirely by volunteers and happy to help. Email is the way to reach them — someone will reply as
            soon as they can.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href={askOhrrHref(cleaned || 'doing something I have a question about')} className={btn.orange}>
              <Icon name="mail" size={16} /> Ask OHRR
            </a>
            <a href={OHRR.emailHref} className="break-all text-base font-semibold text-brand-blue">
              {OHRR.email}
            </a>
          </div>
        </Card>

        <Disclaimer className="mt-8" />
      </Section>
    </>
  )
}
