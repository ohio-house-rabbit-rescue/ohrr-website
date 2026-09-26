import { Link } from 'react-router-dom'
import { MAILING_LIST, OHRR } from '../lib/constants'
import { ext } from './ui'
import { Icon } from './icons'
import { useOrgProfile } from '../lib/orgProfile'

// The menu carries the rescue's purpose; the footer carries the rest — kept
// short (2026-09-24, OHRR: "the links at the bottom are still a lot"): where
// OHRR is and how to reach it, social links as icons, and a handful of other
// pages. Vets, rescues, impact and contact are reached from the pages they
// belong to (Rabbit care, Found / surrender, About, the top bar).
const MORE = [
  { to: '/events', label: 'Events' },
  { to: '/bunfest', label: 'Midwest BunFest' },
  { to: '/hop-shop', label: 'Hop Shop' },
  { to: '/news', label: 'News' },
  { to: '/tails', label: 'Happy Tails' },
  { to: '/partners', label: 'Sponsors & partners' },
]

const social = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-brand-blue hover:text-brand-blue'

export default function Footer() {
  // Hours and any holiday notice come from OHRR details, the same row the app reads.
  const org = useOrgProfile()
  return (
    <footer className="border-t border-black/5 bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/img/ohrr-mark.png" alt="" className="h-11 w-11 object-contain" />
            <span className="font-display text-base font-black text-brand-blue">Ohio House Rabbit Rescue</span>
          </div>
          {/* One of the two places the street address appears (see OHRR in lib/constants) */}
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {OHRR.street}, {OHRR.cityStateZip} ·{' '}
            <a href={OHRR.mapsHref} {...ext} className="font-semibold text-brand-blue">
              Directions
            </a>
          </p>
          {org.notice && (
            <p className="mt-2 rounded-lg bg-brand-orange-50 px-3 py-1.5 text-sm font-bold text-brand-orange-ink">{org.notice}</p>
          )}
          <p className="mt-1 text-sm text-slate-700">Hop Shop &amp; Adoption Center: {org.hours}</p>
          <p className="mt-1 text-sm">
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              {OHRR.email}
            </a>
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a href={OHRR.facebook} {...ext} aria-label="OHRR on Facebook" title="Facebook" className={social}>
              <Icon name="facebook" size={20} />
            </a>
            <a href={OHRR.instagram} {...ext} aria-label="OHRR on Instagram" title="Instagram" className={social}>
              <Icon name="instagram" size={20} />
            </a>
            <Link to={MAILING_LIST} className="ml-2 text-sm font-semibold text-brand-blue">
              Get emails from OHRR
            </Link>
          </div>
        </div>

        <nav aria-label="Also at OHRR">
          <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Also at OHRR</p>
          <ul className="mt-1 grid grid-cols-2 text-sm">
            {MORE.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="inline-flex min-h-11 items-center font-semibold text-slate-700 hover:text-brand-blue">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-black/5 px-5 py-4 text-center text-xs leading-relaxed text-slate-600">
        © Ohio House Rabbit Rescue · 501(c)(3) nonprofit, EIN {OHRR.ein} · a modern preview on the same live system as
        the app ·{' '}
        <Link to="/privacy" className="font-semibold text-slate-700 hover:text-brand-blue">
          Privacy
        </Link>{' '}
        ·{' '}
        <Link to="/staff" className="font-semibold text-slate-700 hover:text-brand-blue">
          Staff sign-in
        </Link>
      </div>
    </footer>
  )
}
