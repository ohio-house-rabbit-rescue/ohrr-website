import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { TEXT_SIZES, stepTextSize, useTextSize } from '../lib/textSize'

// The site's menu, built around the rescue's purpose (2026-09-24): the menu is
// the mission — adopt, care and help for the rabbit you have, strays and
// surrender — then how to help. Events, BunFest, the Hop Shop and news live in
// the footer. The app is one standing pill in the top bar and is not offered
// anywhere else on the site (OHRR: most visitors aren't looking for it).
//
// The web rules from the design brief still hold: every menu item is visible
// on a laptop (nothing opens on hover), the phone menu is a labelled button,
// targets are 44px, and text size is one tap away on every screen.

// Everything else OHRR does — the footer's list, repeated in the phone menu,
// because on a phone the footer is a long way down.
const MORE = [
  { to: '/events', label: 'Events' },
  { to: '/bunfest', label: 'Midwest BunFest' },
  { to: '/hop-shop', label: 'Hop Shop' },
  { to: '/news', label: 'News' },
  { to: '/tails', label: 'Happy Tails' },
  { to: '/contact', label: 'Contact us' },
]

const NAV = [
  { to: '/adopt', label: 'Adopt' },
  { to: '/help', label: 'Bunny Help' },
  { to: '/learn', label: 'Rabbit care' },
  { to: '/surrender', label: 'Found / surrender' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/give', label: 'Give' },
  { to: '/about', label: 'About' },
]

/** A− / A+ — the same three steps as the app's Settings → Text size. */
function TextSizeControl() {
  const size = useTextSize()
  const i = TEXT_SIZES.findIndex((t) => t.value === size)
  const b = 'inline-flex h-11 w-11 items-center justify-center font-display text-lg font-black text-ink disabled:opacity-30'
  return (
    <div role="group" aria-label="Text size" className="inline-flex items-center rounded-full border border-slate-300 bg-white">
      <button type="button" onClick={() => stepTextSize(-1)} disabled={i <= 0} aria-label="Smaller text" className={b}>
        A−
      </button>
      <span className="sr-only">{TEXT_SIZES[i]?.label}</span>
      <button
        type="button"
        onClick={() => stepTextSize(1)}
        disabled={i >= TEXT_SIZES.length - 1}
        aria-label="Larger text"
        className={`${b} border-l border-slate-300`}
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
    `inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-2 text-base font-bold transition ${
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

      {/* The top bar: text size, search, and the one link to the app */}
      <div className="border-b border-slate-100 bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 sm:px-5">
          <TextSizeControl />
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/contact"
              className="hidden min-h-11 items-center rounded-full px-3 text-base font-bold text-slate-700 hover:bg-white sm:inline-flex"
            >
              Contact
            </Link>
            <Link
              to="/search"
              aria-label="Search the site"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-base font-bold text-slate-700 hover:bg-white"
            >
              <Icon name="search" size={18} />
              <span className="hidden sm:inline">Search</span>
            </Link>
            <Link
              to="/app"
              className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-blue/60 bg-white px-4 text-base font-bold text-brand-blue hover:bg-brand-blue-50"
            >
              Get our app
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5 xl:gap-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src="/img/ohrr-mark.png" alt="" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
          <span className="min-w-0 leading-tight">
            <span className="block font-display text-lg font-black text-brand-blue sm:text-xl xl:whitespace-nowrap xl:text-lg">Ohio House Rabbit Rescue</span>
            <span className="hidden text-xs font-bold uppercase tracking-wider text-brand-orange-ink sm:block">
              Columbus, Ohio · est. 2009
            </span>
          </span>
        </Link>

        {/* Laptop: every page in the menu, always visible */}
        <nav aria-label="Main" className="hidden shrink-0 gap-0.5 xl:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

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

      {/* A laptop too narrow for one row gets the whole menu on a second row */}
      <nav aria-label="Main" className="hidden border-t border-slate-100 lg:block xl:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-5 py-1.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {open && (
        <nav id="site-menu" aria-label="Main" className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="grid gap-1">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-100 px-3 pt-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">
            Also at OHRR
          </p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {MORE.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
