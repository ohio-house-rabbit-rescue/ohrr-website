import { Link } from 'react-router-dom'
import { MAILING_LIST, OHRR } from '../lib/constants'
import { ContactRow, ext } from './ui'
import { useOrgProfile } from '../lib/orgProfile'

const NAV = [
  { to: '/adopt', label: 'Adopt' },
  { to: '/learn', label: 'Learn' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/give', label: 'Ways to give' },
  { to: '/impact', label: 'Our impact' },
  { to: '/events', label: 'Events' },
  { to: '/about', label: 'About' },
]

const MORE = [
  { to: '/help', label: 'Bunny Help — ask a question' },
  { to: '/tails', label: 'Happy Tails — adoption stories' },
  { to: '/found', label: 'Found a rabbit?' },
  { to: '/surrender', label: 'Surrendering a rabbit' },
  { to: '/learn/vets', label: 'Rabbit-savvy vets' },
  { to: '/rescues', label: 'Rescues near you' },
  { to: '/bunfest', label: 'Midwest BunFest' },
  { to: '/hop-shop', label: 'Hop Shop' },
  { to: '/adopt/policy', label: 'Adoption policy' },
  { to: '/partners', label: 'Sponsors & partners' },
  { to: '/news', label: 'News' },
  { to: '/contact', label: 'Contact us' },
  { to: '/search', label: 'Search the site' },
  { to: '/app', label: 'Get the OHRR app' },
]

const link = 'inline-block py-0.5 font-semibold text-slate-700 hover:text-brand-blue'

export default function Footer() {
  // Hours and any holiday notice come from OHRR details, the same row the app reads.
  const org = useOrgProfile()
  return (
    <footer className="border-t border-black/5 bg-canvas">
      {/* Persistent, subtle contact row — the same three links on every page */}
      <div className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-5 py-3">
          <ContactRow />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/img/ohrr-mark.png" alt="OHRR" className="h-11 w-11 object-contain" />
            <span className="font-display text-base font-black text-brand-blue">
              Ohio House Rabbit Rescue
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {OHRR.street}
            <br />
            {OHRR.cityStateZip}
          </p>
          {org.notice && (
            <p className="mt-2 rounded-lg bg-brand-orange-50 px-3 py-1.5 text-sm font-bold text-brand-orange-dark">{org.notice}</p>
          )}
          <p className="mt-2 text-sm text-slate-700">
            Hop Shop &amp; Adoption Center: {org.hours}
            <br />
            {OHRR.hoursNote}
          </p>
          <p className="mt-2 text-sm">
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              {OHRR.email}
            </a>
          </p>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className={link}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">More</p>
          <ul className="mt-3 space-y-2 text-sm">
            {MORE.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className={link}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Connect</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={OHRR.facebook} {...ext} className={link}>
                Facebook
              </a>
            </li>
            <li>
              <a href={OHRR.instagram} {...ext} className={link}>
                Instagram
              </a>
            </li>
            <li>
              <Link to={MAILING_LIST} className={link}>
                Join the OHRR mailing list
              </Link>
            </li>
            <li>
              <a href={OHRR.marketingEmailHref} className={link}>
                Media inquiries: {OHRR.marketingEmail}
              </a>
            </li>
            <li>
              <Link to="/staff" className={link}>
                Staff &amp; owner sign-in
              </Link>
            </li>
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-slate-600">
            501(c)(3) nonprofit · EIN {OHRR.ein} · Donations are tax-deductible
          </p>
        </div>
      </div>
      <div className="border-t border-black/5 py-5 text-center text-xs text-slate-600">
        © Ohio House Rabbit Rescue · Columbus, Ohio · a modern preview on the same live system as the
        app ·{' '}
        <Link to="/privacy" className="font-semibold text-slate-700 hover:text-brand-blue">
          Privacy
        </Link>
      </div>
    </footer>
  )
}
