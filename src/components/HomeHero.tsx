import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { HeroSlide } from '../lib/types'
import { useHeroSlides } from '../lib/data'
import { slideVisual } from '../data/heroSlides'
import { btn, Section, ext, IconTile } from './ui'
import { DONATE } from '../lib/constants'

// Internal links use the router; anything else opens in a new tab.
function CtaLink({ to, className, children }: { to: string; className: string; children: ReactNode }) {
  if (/^https?:\/\//i.test(to)) {
    return (
      <a href={to} {...ext} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function Countdown({ to }: { to: string }) {
  const d = daysUntil(to)
  if (d < 0) return null
  const text = d === 0 ? 'Today!' : d === 1 ? 'Tomorrow!' : `${d} days to go`
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-ink">
      {text}
    </span>
  )
}

const arrow =
  'flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40'

// The picture slot of a slide or card. An uploaded image always wins (staff choice);
// an adopt card without one shows a real rabbit; every other card shows its fixed line
// icon so the purpose is recognisable at a glance — photos are only for real content.
function SlideVisual({ slide, lazy = false }: { slide: HeroSlide; lazy?: boolean }) {
  const v = slideVisual(slide)
  if (v && 'image' in v) {
    return (
      <img
        src={v.image}
        alt=""
        loading={lazy ? 'lazy' : undefined}
        className={`aspect-[4/3] w-full ${v.fit === 'contain' ? 'object-contain p-4' : 'object-cover'}`}
      />
    )
  }
  if (v) return <IconTile name={v.icon} size="fill" />
  return <div className="aspect-[4/3] w-full bg-slate-100" />
}

// The home page opens on who OHRR is (the brief: the website is the public
// record). Beside it, the staff-managed slide from `hero_slides` — BunFest,
// a fundraiser, whatever is happening now — rotated by hand only.
export function HomeHero() {
  const { hero } = useHeroSlides()
  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)

  const slides = hero
  const count = slides.length
  const i = Math.min(index, Math.max(0, count - 1))
  const s: HeroSlide | undefined = slides[i]
  const go = (n: number) => setIndex(((n % count) + count) % count)

  return (
    <Section className="!py-8 md:!py-12">
      <div className="grid items-start gap-8 md:grid-cols-[1.15fr_1fr] md:gap-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-blue">
            Columbus, Ohio · rabbit rescue &amp; adoption center · since 2009
          </span>
          <h1 className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
            Rescued rabbits, looking for homes
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-700 md:text-lg">
            Ohio House Rabbit Rescue has rescued house rabbits in Central Ohio since 2009 — and helps anyone who has a
            rabbit, or wants one. Adopt, foster, volunteer, or get help with the bunny you already have.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/adopt" className={btn.orange}>
              See the rabbits
            </Link>
            <Link to="/help" className={btn.blue}>
              Bunny Help
            </Link>
            <a href={DONATE} {...ext} className={btn.outline}>
              Donate
            </a>
          </div>
        </div>

        {s && (
          <div
            className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm sm:p-5"
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null
            }}
            onTouchEnd={(e) => {
              const start = touchX.current
              touchX.current = null
              if (start === null || count < 2) return
              const dx = (e.changedTouches[0]?.clientX ?? start) - start
              if (dx < -40) go(i + 1)
              else if (dx > 40) go(i - 1)
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Happening now</p>
              {s.countdownTo && <Countdown to={s.countdownTo} />}
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white">
              <SlideVisual slide={s} />
            </div>
            <h2 className="mt-4 font-display text-2xl font-black leading-tight text-ink">{s.headline}</h2>
            {s.subline && <p className="mt-2 text-base leading-relaxed text-slate-700">{s.subline}</p>}
            {s.ctaUrl && s.ctaLabel && (
              <CtaLink to={s.ctaUrl} className={`${btn.blue} mt-4`}>
                {s.ctaLabel}
              </CtaLink>
            )}
            {count > 1 && (
              <div className="mt-4 flex items-center gap-2" role="tablist" aria-label="Happening now">
                <button type="button" onClick={() => go(i - 1)} className={arrow} aria-label="Previous">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                {slides.map((sl, n) => (
                  <button
                    key={sl.id}
                    type="button"
                    role="tab"
                    aria-selected={n === i}
                    aria-label={`${n + 1}: ${sl.headline}`}
                    onClick={() => go(n)}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                      n === i ? 'bg-brand-blue text-white' : 'border border-slate-300 text-slate-700 hover:border-brand-blue'
                    }`}
                  >
                    {n + 1}
                  </button>
                ))}
                <button type="button" onClick={() => go(i + 1)} className={arrow} aria-label="Next">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

// 3–4 featured cards directly under the hero: a swipeable row on phones, a grid on desktop.
// Function cards (events, ways to give, the auction) show their fixed icon; "Adoptable
// rabbits" — real content — keeps a photo.
export function FeaturedStrip() {
  const { featured } = useHeroSlides()
  if (featured.length === 0) return null
  return (
    <div className="mx-auto max-w-6xl px-5 pb-4 md:pb-8">
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {featured.map((f) => {
          const inner = (
            <>
              <SlideVisual slide={f} lazy />
              <div className="p-4">
                <h3 className="font-display text-lg font-extrabold text-brand-blue">{f.headline}</h3>
                {f.subline && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{f.subline}</p>}
                <span className="mt-2 inline-block text-sm font-bold text-brand-blue">{f.ctaLabel ?? 'Open'} →</span>
              </div>
            </>
          )
          const cls =
            'block w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:w-[46%] md:w-auto'
          return f.ctaUrl ? (
            <CtaLink key={f.id} to={f.ctaUrl} className={cls}>
              {inner}
            </CtaLink>
          ) : (
            <div key={f.id} className={cls}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
