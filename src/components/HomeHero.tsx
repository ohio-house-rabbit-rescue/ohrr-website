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
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-dark">
      {text}
    </span>
  )
}

const arrow =
  'flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40'

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

// The home-page hero: the same layout and styling as before, now fed by the shared
// hero_slides table. Up to 3 slides, rotated manually (arrows, dots, swipe) — no auto-advance.
export function HomeHero() {
  const { hero } = useHeroSlides()
  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)

  const slides = hero
  const count = slides.length
  const i = Math.min(index, Math.max(0, count - 1))
  const s: HeroSlide | undefined = slides[i]
  if (!s) return null

  const go = (n: number) => setIndex(((n % count) + count) % count)

  return (
    <Section className="!py-10 md:!py-16">
      <div
        className="grid items-center gap-8 md:grid-cols-2 md:gap-10"
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
        <div>
          {s.countdownTo ? (
            <Countdown to={s.countdownTo} />
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-blue">
              Columbus, Ohio · rabbit rescue & adoption center
            </span>
          )}
          <h1 className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl md:text-5xl">{s.headline}</h1>
          {s.subline && (
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 md:text-lg">{s.subline}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {s.ctaUrl && s.ctaLabel && (
              <CtaLink to={s.ctaUrl} className={btn.blue}>
                {s.ctaLabel}
              </CtaLink>
            )}
            <a href={DONATE} {...ext} className={btn.outline}>
              Donate
            </a>
          </div>

          {count > 1 && (
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => go(i - 1)} className={arrow} aria-label="Previous slide">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
                {slides.map((sl, n) => (
                  <button
                    key={sl.id}
                    type="button"
                    role="tab"
                    aria-selected={n === i}
                    aria-label={`Slide ${n + 1}: ${sl.headline}`}
                    onClick={() => go(n)}
                    className={`h-3 w-3 rounded-full transition ${n === i ? 'bg-brand-blue' : 'bg-slate-300 hover:bg-slate-400'}`}
                  />
                ))}
              </div>
              <button type="button" onClick={() => go(i + 1)} className={arrow} aria-label="Next slide">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <span className="text-xs font-semibold text-slate-400">
                {i + 1} / {count}
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-3xl border-4 border-white bg-white shadow-2xl md:border-8">
            <SlideVisual slide={s} />
          </div>
          <div className="absolute -bottom-4 -left-2 rounded-2xl bg-white px-4 py-2.5 shadow-xl">
            <p className="font-display text-xl font-black text-brand-orange">Since 2009</p>
            <p className="text-[11px] font-semibold text-slate-500">rescuing rabbits in Central Ohio</p>
          </div>
        </div>
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
                <span className="mt-2 inline-block text-sm font-bold text-brand-orange">{f.ctaLabel ?? 'Explore'} →</span>
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
