import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const NAV = [
  { to: '/adopt', label: 'Adopt' },
  { to: '/learn', label: 'Learn' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/give', label: 'Give' },
  { to: '/events', label: 'Events' },
  { to: '/about', label: 'About' },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `font-semibold transition hover:text-brand-blue ${isActive ? 'text-brand-blue' : 'text-slate-600'}`

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        {/* Prominent logo */}
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src="/img/ohrr-mark.png"
            alt="Ohio House Rabbit Rescue"
            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
          />
          <span className="leading-tight">
            <span className="block font-display text-base font-black text-brand-blue sm:text-xl">
              Ohio House Rabbit Rescue
            </span>
            <span className="hidden text-[11px] font-bold uppercase tracking-wider text-brand-orange sm:block">
              Columbus, Ohio · est. 2009
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          <Link
            to="/app"
            className="rounded-full bg-brand-orange px-4 py-2 font-bold text-white shadow-sm transition hover:bg-brand-orange-dark"
          >
            Open the app
          </Link>
        </nav>

        {/* Mobile: app button + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/app"
            onClick={() => setOpen(false)}
            className="rounded-full bg-brand-orange px-3 py-1.5 text-xs font-bold text-white"
          >
            App
          </Link>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-2 md:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive ? 'bg-brand-blue-50 text-brand-blue' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
