import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { AMAZON_WISH_LIST, DONATE } from '../lib/constants'

const HELP_PILL =
  'inline-flex min-h-9 items-center rounded-full border border-brand-blue/25 bg-white px-3 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue-50'

// The site's menu, built around the rescue's purpose (2026-09-24): the menu is
// the mission — adopt, care and help for the rabbit you have, strays and
// surrender — then how to help. Events, BunFest, the Hop Shop and news live in
// the footer. The app is one standing pill in the top bar and is not offered
// anywhere else on the site (OHRR: most visitors aren't looking for it).
// Donate is an orange pill beside it on every page, and on a laptop the rest
// of the bar holds the other ways to help as small pills (2026-09-24, OHRR: "a
// more prominent visual on things like the donate … a small box or pill").
// The wish list opens Amazon itself.
//
// The web rules from the design brief still hold: every menu item is visible
// on a laptop (nothing opens on hover), the phone menu is a labelled button,
// and targets are 44px.

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

// Volunteer is orange so it stands out (OHRR, 2026-09-24).
const NAV: { to: string; label: string; highlight?: boolean }[] = [
  { to: '/adopt', label: 'Adopt' },
  { to: '/help', label: 'Bunny Help' },
  { to: '/learn', label: 'Rabbit care' },
  { to: '/surrender', label: 'Found / surrender' },
  { to: '/volunteer', label: 'Volunteer', highlight: true },
  { to: '/give', label: 'Give' },
  { to: '/about', label: 'About' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-2 text-base font-bold transition ${
      isActive ? 'bg-brand-blue-50 text-brand-blue' : 'text-slate-700 hover:bg-slate-100 hover:text-brand-blue'
    }`
  const orangeClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-2 text-base font-bold transition ${
      isActive ? 'bg-brand-orange-50 text-brand-orange-ink' : 'text-brand-orange-nav hover:bg-brand-orange-50 hover:text-brand-orange-ink'
    }`
  const navClass = (n: (typeof NAV)[number]) => (n.highlight ? orangeClass : linkClass)

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:font-bold"
      >
        Skip to the page
      </a>

      {/* The top bar: contact, search, and the one link to the app */}
      <div className="border-b border-slate-100 bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 sm:px-5 xl:justify-between">
          <div className="hidden items-center gap-1.5 xl:flex" aria-label="Ways to help">
            <span className="mr-1 text-xs font-extrabold uppercase tracking-wider text-brand-orange-ink">Help the rabbits</span>
            <a href={AMAZON_WISH_LIST} target="_blank" rel="noopener" className={HELP_PILL}>
              Wish list
            </a>
            <Link to="/volunteer/foster" className={HELP_PILL}>
              Foster
            </Link>
            <Link to="/hop-shop" className={HELP_PILL}>
              Hop Shop
            </Link>
            <Link to="/give" className={HELP_PILL}>
              All ways to give
            </Link>
          </div>
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
              className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-blue/60 bg-white px-3 text-base font-bold text-brand-blue hover:bg-brand-blue-50 sm:px-4"
            >
              Get our app
            </Link>
            <a
              href={DONATE}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-orange px-4 text-base font-extrabold text-ink shadow-sm transition hover:bg-brand-orange-dark"
            >
              <Icon name="heart" size={17} />
              Donate
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-5 xl:gap-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src="/img/ohrr-mark.png" alt="" className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12" />
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
            <NavLink key={n.to} to={n.to} className={navClass(n)}>
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
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-5 py-0.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={navClass(n)}>
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
              <NavLink key={n.to} to={n.to} className={navClass(n)}>
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
