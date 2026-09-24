// Shared bits for the Bunny Help pages: urgency and category chips, the
// light-markdown renderer for `what_to_do`, the emergency card, the closing
// disclaimer and the vet-review line. Ported from the OHRR app's
// features/bunnyhelp/ui.tsx and features/mybunny/ui.tsx (EmergencyCard), sized
// for the website's older visitors: nothing smaller than text-sm.
import { Link } from 'react-router-dom'
import { Card, btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { CATEGORY_LABEL, DISCLAIMER, URGENCY_LABEL, type CareTopic, type TopicUrgency } from './types'

// A warning triangle (the app's My Bunny "alert" icon; the site's icon set has none).
export function AlertIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

const urgencyTone: Record<TopicUrgency, string> = {
  emergency: 'bg-red-600 text-white',
  'vet-today': 'bg-red-50 text-red-700 ring-1 ring-red-200',
  watch: 'bg-brand-orange-50 text-brand-orange-dark ring-1 ring-brand-orange/30',
  tip: 'bg-brand-blue-50 text-brand-blue',
}

export function UrgencyChip({ urgency }: { urgency: TopicUrgency }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${urgencyTone[urgency]}`}
    >
      {urgency === 'emergency' && <AlertIcon size={14} />}
      {URGENCY_LABEL[urgency]}
    </span>
  )
}

export function CategoryChip({ category }: { category: CareTopic['category'] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
      {CATEGORY_LABEL[category]}
    </span>
  )
}

/* ---- light markdown (same dialect as the Learn articles) ---- */

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export function parseBlocks(body: string): Block[] {
  const blocks: Block[] = []
  for (const raw of body.split(/\n\s*\n/)) {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) continue
    // a heading may be followed directly by bullets or a paragraph in the same chunk
    let rest = lines
    if (rest[0].startsWith('## ')) {
      blocks.push({ type: 'heading', text: rest[0].slice(3).trim() })
      rest = rest.slice(1)
      if (rest.length === 0) continue
    }
    if (rest.every((l) => l.startsWith('- '))) {
      blocks.push({ type: 'list', items: rest.map((l) => l.slice(2).trim()) })
    } else {
      // mixed: paragraph lines first, then any trailing bullets
      const firstBullet = rest.findIndex((l) => l.startsWith('- '))
      const para = firstBullet === -1 ? rest : rest.slice(0, firstBullet)
      if (para.length) blocks.push({ type: 'paragraph', text: para.join(' ') })
      if (firstBullet !== -1) {
        blocks.push({ type: 'list', items: rest.slice(firstBullet).map((l) => l.replace(/^- /, '').trim()) })
      }
    }
  }
  return blocks
}

export function WhatToDo({ body }: { body: string }) {
  const blocks = parseBlocks(body)
  if (blocks.length === 0) return null
  return (
    <div className="space-y-4 text-base leading-relaxed text-slate-700">
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <h3 key={i} className="pt-2 font-display text-lg font-extrabold text-ink">
              {b.text}
            </h3>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span aria-hidden className="mt-[11px] h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{b.text}</p>
      })}
    </div>
  )
}

export function Disclaimer({ className = '' }: { className?: string }) {
  return <p className={`text-sm leading-relaxed text-slate-600 ${className}`}>{DISCLAIMER}</p>
}

/** Shown on health topics until staff record who reviewed them. */
export function NotReviewedLine({ topic }: { topic: CareTopic }) {
  if (topic.category !== 'health') return null
  if (topic.reviewed_by) {
    return (
      <p className="text-sm text-slate-600">
        Reviewed by {topic.reviewed_by}
        {topic.reviewed_at ? ` · ${topic.reviewed_at}` : ''}
      </p>
    )
  }
  return (
    <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
      <AlertIcon size={15} className="shrink-0" /> Not yet vet-reviewed
    </p>
  )
}

/* ------------------------------------------------------------ emergency */

// The app's emergency warning signs and after-hours contact (features/mybunny).
const WARNING_SIGNS = [
  'Not eating, or no poops, for around 12 hours',
  'Lethargy, or hiding more than usual',
  'Laboured or open-mouth breathing',
  'Head tilt',
  'Bleeding',
  'Unable to move',
]

export const EMERGENCY_VET = {
  name: 'MedVet Hilliard',
  phone: '614-870-0480',
  phoneHref: 'tel:+16148700480',
  note: 'Open 24/7 for exotics emergencies',
}

/** "Is this an emergency?" — warning signs, the after-hours vet, and the vet directory. */
export function EmergencyCard() {
  return (
    <Card className="border-red-200 bg-red-50/60">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <AlertIcon size={22} />
        </span>
        <h2 className="font-display text-lg font-extrabold text-ink">Is this an emergency?</h2>
      </div>
      <ul className="mt-3 space-y-1.5">
        {WARNING_SIGNS.map((s) => (
          <li key={s} className="flex items-start gap-2.5 text-base text-slate-700">
            <span aria-hidden className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-red-500" />
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-base font-bold leading-relaxed text-red-800">
        These can be life-threatening for rabbits; call a rabbit-savvy vet right away.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href={EMERGENCY_VET.phoneHref} className={`${btn.blue} bg-red-600 hover:bg-red-700`}>
          <Icon name="phone" size={16} /> Call {EMERGENCY_VET.name} · {EMERGENCY_VET.phone}
        </a>
        <Link to="/learn/vets" className={btn.outline}>
          Find a rabbit-savvy vet
        </Link>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {EMERGENCY_VET.note} · after-hours option
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        This is general guidance, not a diagnosis — confirm with your vet.
      </p>
    </Card>
  )
}

/* ------------------------------------------------------------ topic rows */

export function topicHref(t: Pick<CareTopic, 'slug'>, q?: string): string {
  return q ? `/help/${t.slug}?q=${encodeURIComponent(q)}` : `/help/${t.slug}`
}

/** One topic in a list: title, one-line summary, urgency chip. */
export function TopicRow({ t, q }: { t: CareTopic; q?: string }) {
  return (
    <Link to={topicHref(t, q)} className="flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50">
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-extrabold text-brand-blue">{t.title}</span>
        {t.summary && <span className="mt-0.5 block text-base leading-snug text-slate-600">{t.summary}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <UrgencyChip urgency={t.urgency} />
        <Icon name="chevron" size={18} className="text-slate-400" />
      </span>
    </Link>
  )
}
