// Bunny Help on the home page, above the fold (2026-09-24, OHRR: "get a small
// portion of that above the fold and if someone interacts with it then have it
// drop down to the full engagement and even open all the options"). Closed, it
// is one of the home page's doors with a question box in it. Tapping into it
// opens the whole of Bunny Help right there: example questions, the emergency
// vet line, live answers as they type, and every topic by category. On a
// laptop the panel drops down over the page; on a phone it opens in place.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './icons'
import { btn } from './ui'
import { EXAMPLE_QUESTIONS, helpSearchHref } from './HelpSearchBox'
import { useCareTopics } from '../lib/bunnyhelp/useTopics'
import { buildIndex, cleanQuery, hasEmergency, searchTopics } from '../lib/bunnyhelp/search'
import { Disclaimer, EMERGENCY_VET, EmergencyCard, TopicRow } from '../lib/bunnyhelp/ui'
import { CATEGORIES, CATEGORY_LABEL, URGENCY_RANK, askOhrrHref, type TopicCategory } from '../lib/bunnyhelp/types'

type Filter = 'all' | TopicCategory

export default function HomeBunnyHelp() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const { topics } = useCareTopics()
  const index = useMemo(() => buildIndex(topics), [topics])

  const cleaned = cleanQuery(q)
  const active = cleaned.length >= 2
  const results = useMemo(() => (active ? searchTopics(index, q, 6) : []), [index, q, active])
  const emergency = hasEmergency(results)
  const list = useMemo(
    () =>
      topics
        .filter((t) => filter === 'all' || t.category === filter)
        .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.sort_order - b.sort_order),
    [topics, filter],
  )

  // Closes on Escape or a click elsewhere on the page.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const ask = (question: string) => {
    setQ(question)
    setOpen(true)
    input.current?.focus()
  }

  const chip = (on: boolean) =>
    `rounded-full px-4 py-2 text-sm font-bold transition ${
      on ? 'bg-brand-blue text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-brand-blue hover:text-brand-blue'
    }`

  return (
    <div ref={box} className="relative rounded-xl border border-slate-200 bg-white px-4 py-2.5">
      <label className="block">
        <span className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue" aria-hidden="true">
            <Icon name="help" size={22} />
          </span>
          <span className="font-display text-lg font-extrabold leading-snug text-ink">Help with my rabbit</span>
        </span>
        <span className="relative mt-2 block">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            placeholder="What is your bunny doing?"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="What is your bunny doing? Search Bunny Help"
            aria-expanded={open}
            aria-controls="home-bunny-help"
            className="w-full rounded-full border border-brand-blue/30 bg-white py-2.5 pl-12 pr-4 text-base text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </span>
      </label>

      {open && (
        <div
          id="home-bunny-help"
          className="mt-3 space-y-4 lg:absolute lg:right-0 lg:top-full lg:z-30 lg:mt-2 lg:max-h-[70vh] lg:w-[56rem] lg:max-w-[calc(100vw-2.5rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:p-5 lg:shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-base font-extrabold text-brand-blue">Bunny Help — OHRR’s own guidance, never a diagnosis</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Icon name="x" size={16} /> Close
            </button>
          </div>

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
                Ask OHRR by email and they’ll point you in the right direction. For anything urgent, call a rabbit-savvy vet
                instead of waiting for a reply.
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

          {!emergency && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-base text-amber-950">
              <strong>Emergency tonight?</strong> {EMERGENCY_VET.name},{' '}
              <a href={EMERGENCY_VET.phoneHref} className="font-bold text-brand-blue">
                {EMERGENCY_VET.phone}
              </a>{' '}
              — {EMERGENCY_VET.note.toLowerCase()}
            </p>
          )}

          {!active && (
            <>
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">Try one of these</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUESTIONS.map((question) => (
                    <button key={question} type="button" onClick={() => ask(question)} className={chip(false)}>
                      {question}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">Or look through every topic</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Topics by category">
                  {(['all', ...CATEGORIES] as Filter[]).map((f) => (
                    <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={chip(filter === f)}>
                      {f === 'all' ? 'All topics' : CATEGORY_LABEL[f]}
                    </button>
                  ))}
                </div>
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {list.map((t) => (
                    <TopicRow key={t.id} t={t} />
                  ))}
                  {list.length === 0 && <p className="px-5 py-6 text-center text-base text-slate-600">No topics here yet.</p>}
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to={helpSearchHref(q)} className="text-base font-bold text-brand-blue">
              Open the Bunny Help page →
            </Link>
            <Disclaimer />
          </div>
        </div>
      )}
    </div>
  )
}
