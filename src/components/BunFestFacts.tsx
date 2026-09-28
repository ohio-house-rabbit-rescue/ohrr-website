// Midwest BunFest's admission, the rabbit rule and parking, from the event's
// own record (Staff → BunFest) — on the BunFest page and on its Events card,
// so the answers a visitor bringing a rabbit needs are wherever they look
// (persona audit 2026-09-28: Alan found none of them on Events).
import { Link } from 'react-router-dom'
import { ext } from './ui'

export default function BunFestFacts({ info }: { info?: Record<string, unknown> | null }) {
  if (!info) return null
  const admission = Array.isArray(info.admission)
    ? (info.admission as { who?: string; price?: string }[]).filter((a) => a?.who && a?.price)
    : []
  const rule = typeof info.rabbit_rule === 'string' ? info.rabbit_rule : ''
  const tickets = typeof info.tickets_url === 'string' ? info.tickets_url : ''
  const parking = typeof info.parking === 'string' ? info.parking : ''
  if (admission.length === 0 && !rule && !parking) return null
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
      {admission.length > 0 && (
        <div>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Admission</dt>
          <dd className="mt-0.5 font-semibold">{admission.map((a) => `${a.who} ${a.price}`).join(' · ')}</dd>
          {tickets && (
            <dd>
              <a href={tickets} {...ext} className="font-semibold text-brand-blue">
                Buy tickets
              </a>
            </dd>
          )}
        </div>
      )}
      {rule && (
        <div>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Bringing your rabbit</dt>
          <dd className="mt-0.5">{rule}</dd>
          <dd>
            <Link to="/learn/vets?rhdv2=1" className="font-semibold text-brand-blue">
              Vets that give the RHDV2 vaccine
            </Link>
          </dd>
        </div>
      )}
      {parking && (
        <div>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Parking</dt>
          <dd className="mt-0.5">{parking}</dd>
        </div>
      )}
    </dl>
  )
}
