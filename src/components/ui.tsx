import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Rabbit } from '../lib/types'
import type { Source } from '../lib/data'
import { OHRR } from '../lib/constants'

export const btn = {
  orange:
    'inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-orange-dark',
  blue: 'inline-flex items-center justify-center rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-blue-dark',
  outline:
    'inline-flex items-center justify-center rounded-full border border-brand-orange/60 px-5 py-2.5 text-sm font-bold text-brand-orange-dark transition hover:bg-brand-orange-50',
  white:
    'inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-blue shadow-sm transition hover:bg-white/90',
}

// External links open in a new tab; the current OHRR site stays untouched.
export const ext = { target: '_blank', rel: 'noopener' } as const

export function Section({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-5 py-12 md:py-20 ${className}`}>
      {children}
    </section>
  )
}

export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="bg-gradient-to-b from-brand-blue to-brand-blue-dark text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        <h1 className="font-display text-3xl font-black leading-tight md:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export function LiveNote({ source }: { source: Source }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-slate-400">
      {source === 'live' ? (
        <>
          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          Live — synced from OHRR's system (the same data the app shows).
        </>
      ) : (
        <>
          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          Sample data — the live list appears here automatically as staff add it in the app.
        </>
      )}
    </p>
  )
}

export function RabbitCard({ r }: { r: Rabbit }) {
  const meta = [r.age, r.sex, r.breed].filter(Boolean).join(' · ')
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[4/3] w-full bg-slate-100">
        {r.photo ? (
          <img src={r.photo} alt={r.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl font-black text-slate-300">
            {r.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-extrabold text-ink">{r.name}</h3>
          {r.bonded && (
            <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange-dark">
              Pair
            </span>
          )}
          {r.status && !/available|adoptable/i.test(r.status) && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
              {r.status}
            </span>
          )}
        </div>
        {meta && <p className="mt-0.5 text-sm font-semibold text-slate-400">{meta}</p>}
        {r.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{r.description}</p>}
      </div>
    </div>
  )
}

// ---- Primitives reused by the content pages (same styles as the existing cards) ----

// Section heading in the site's existing style.
export function H2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-2xl font-black text-ink sm:text-3xl ${className}`}>{children}</h2>
  )
}

// A plain card (as used for "Ways to help" on the Volunteer page).
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${className}`}>{children}</div>
  )
}

// A clickable card (as used for the home-page teasers): internal `to` or external `href`.
export function LinkCard({
  to,
  href,
  h,
  p,
  cta = 'Learn more →',
}: {
  to?: string
  href?: string
  h: string
  p: string
  cta?: string
}) {
  const cls =
    'group block rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
  const inner = (
    <>
      <h3 className="font-display text-lg font-extrabold text-brand-blue">{h}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p}</p>
      <span className="mt-2 inline-block text-sm font-bold text-brand-orange">{cta}</span>
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <a href={href} {...ext} className={cls}>
      {inner}
    </a>
  )
}

// The soft blue call-out box (as used for "Before you adopt").
export function Callout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-brand-blue-50 p-6 sm:p-8 ${className}`}>{children}</div>
}

// Call · Email · Directions — tappable text, shown in the footer and on the Contact page.
export function ContactRow({ className = '' }: { className?: string }) {
  const link = 'font-semibold text-brand-blue hover:text-brand-blue-dark'
  return (
    <p className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600 ${className}`}>
      <span>
        Call{' '}
        <a href={OHRR.phoneHref} className={link}>
          {OHRR.phone}
        </a>
      </span>
      <span>
        Email{' '}
        <a href={OHRR.emailHref} className={link}>
          {OHRR.email}
        </a>
      </span>
      <span>
        <a href={OHRR.mapsHref} {...ext} className={link}>
          Directions to {OHRR.address}
        </a>
      </span>
    </p>
  )
}

export function PrintButton({ label = 'Print this page' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btn.outline} no-print`}>
      {label}
    </button>
  )
}

// ---- Light markdown (same format as the app's care_articles.body) ----
// blank-line-separated blocks; `## ` heading lines; `- ` bullet lines.

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export function parseBody(body: string): Block[] {
  const blocks: Block[] = []
  for (const raw of body.split(/\n\s*\n/)) {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) continue
    if (lines.every((l) => l.startsWith('- '))) {
      blocks.push({ type: 'list', items: lines.map((l) => l.slice(2).trim()) })
    } else if (lines[0].startsWith('## ')) {
      blocks.push({ type: 'heading', text: lines[0].slice(3).trim() })
      const rest = lines.slice(1)
      if (rest.length) blocks.push({ type: 'paragraph', text: rest.join(' ') })
    } else {
      blocks.push({ type: 'paragraph', text: lines.join(' ') })
    }
  }
  return blocks
}

export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="space-y-4 text-base leading-relaxed text-slate-700">
      {parseBody(body).map((b, i) => {
        if (b.type === 'heading') {
          return (
            <h2 key={i} className="pt-2 font-display text-xl font-extrabold text-ink">
              {b.text}
            </h2>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{b.text}</p>
      })}
    </div>
  )
}
