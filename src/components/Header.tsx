import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { TEXT_SIZES, stepTextSize, useTextSize } from '../lib/textSize'

// The site's menu, built to the web rules in the design brief: every page in
// the menu is visible on a laptop (nothing opens on hover), the phone menu is
// a labelled button, targets are 44px, and there is a text-size control right
// where an older visitor looks for one.

const NAV = [
  { to: '/adopt', label: 'Adopt' },
  { to: '/learn', label: 'Learn' },
  { to: '/help', label: 'Bunny Help' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/give', label: 'Give' },
  { to: '/events', label: 'Events' },
  { to: '/about', label: 'About' },
]

/** A− / A+ — the same three steps as the app's Settings → Text size. */
function TextSizeControl({ className = '' }: { className?: string }) {
  const size = useTextSize()
  const i = TEXT_SIZES.findIndex((t) => t.value === size)
  const b = 'inline-flex h-11 w-11 items-center justify-center font-display text-lg font-black text-ink disabled:opacity-30'
  return (
    <div
      role="group"
      aria-label="Text size"
      className={`inline-flex items-center rounded-full border border-slate-200 bg-white ${className}`}
    >
      <button type="button" onClick={() => stepTextSize(-1)} disabled={i <= 0} aria-label="Smaller text" className={b}>
        A−
      </button>
      <span className="sr-only">{TEXT_SIZES[i]?.label}</span>
      <button
        type="button"
        onClick={() => stepTextSize(1)}
        disabled={i >= TEXT_SIZES.length - 1}
        aria-label="Larger text"
        className={`${b} border-l border-slate-200`}
      >
        A+
      </button>
    </div>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center rounded-lg px-3 text-base font-bold transition ${
      isActive ? 'bg-brand-blue-50 text-brand-blue' : 'text-slate-700 hover:bg-slate-100 hover:text-brand-blue'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:font-bold"
      >
        Skip to the page
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/img/ohrr-mark.png"
            alt="Ohio House Rabbit Rescue"
            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
          />
          <span className="min-w-0 leading-tight">
            <span className="block font-display text-lg font-black text-brand-blue sm:text-xl">
              Ohio House Rabbit Rescue
            </span>
            <span className="hidden text-xs font-bold uppercase tracking-wider text-brand-orange-dark sm:block">
              Columbus, Ohio · est. 2009
            </span>
          </span>
        </Link>

        {/* Laptop: search, text size, the app */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/search"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 px-4 text-base font-bold text-slate-700 hover:bg-slate-50"
          >
            <Icon name="search" size={18} /> Search
          </Link>
          <TextSizeControl />
          <Link
            to="/app"
            className="inline-flex min-h-11 items-center rounded-full bg-brand-orange px-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-orange-dark"
          >
            Open the app
          </Link>
        </div>

        {/* Phone and tablet: a labelled Menu button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="site-menu"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border-2 border-slate-300 px-3 text-base font-bold text-ink lg:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Laptop: every page, always visible */}
      <nav aria-label="Main" className="hidden border-t border-slate-100 lg:block">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-5 py-1.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Phone: the same list, opened with the Menu button */}
      {open && (
        <nav id="site-menu" aria-label="Main" className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="grid gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
            <NavLink to="/search" className={linkClass}>
              Search the site
            </NavLink>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <TextSizeControl />
            <Link
              to="/app"
              className="inline-flex min-h-11 items-center rounded-full bg-brand-orange px-4 text-base font-bold text-white"
            >
              Open the app
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
