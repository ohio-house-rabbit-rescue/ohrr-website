// One group of staff pages (/staff/g/:group) — a short list, opened from a
// group tile on the dashboard, the laptop's sidebar or the path bar. Same
// groups as the app's StaffGroup; the pages and who may open them live in
// lib/staffTiles.ts.
// An unknown group, or one this person has nothing in, goes to the dashboard.
import { Link, Navigate, useParams } from 'react-router-dom'
import { useStaffTiles, type StaffTile } from '../../lib/staffTiles'
import { Icon } from '../../components/icons'
import { WaitingBadge } from '../../components/WaitingBadge'
import { AccountLinks } from '../../components/StaffShell'

export default function StaffGroup() {
  // Hooks before any early return.
  const { group } = useParams()
  const { groups } = useStaffTiles({ counts: true })

  const g = groups.find((x) => x.key === group)
  if (!g) return <Navigate to="/staff" replace />

  return (
    <div className="max-w-3xl">
      {/* The way back is the path bar above: [home] Staff › this group */}
      <h1 className="font-display text-2xl font-black text-ink">{g.title}</h1>
      <p className="mt-0.5 text-sm text-slate-600">{g.hint}</p>

      <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {g.tiles.map((t) => (
          <li key={t.to}>
            <Row t={t} orange={g.key === 'volunteers'} />
          </li>
        ))}
      </ul>

      {/* Me, on a phone: the way back to the website and signing out (a laptop has them up top) */}
      {g.key === 'me' && (
        <div className="no-print mt-6 flex flex-wrap items-center gap-2 lg:hidden">
          <AccountLinks account={false} />
        </div>
      )}
    </div>
  )
}

const rowClass = 'group flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-brand-blue-50'

function Row({ t, orange }: { t: StaffTile; orange: boolean }) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          orange ? 'bg-brand-orange-50 text-brand-orange-ink' : 'bg-brand-blue-50 text-brand-blue-dark'
        }`}
      >
        <Icon name={t.icon} size={22} accent={orange ? undefined : 'var(--color-brand-orange)'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-extrabold leading-snug text-ink group-hover:text-brand-blue">{t.title}</span>
        <span className="block text-sm leading-snug text-slate-600">{t.hint}</span>
        {t.error && <span className="mt-0.5 block text-sm font-semibold text-red-600">{t.error}</span>}
      </span>
      <WaitingBadge n={t.badge ?? 0} />
      <Icon name="chevron" size={18} className="shrink-0 text-brand-blue" />
    </>
  )
  // My volunteer hours is a button: it opens (or makes) the person's own volunteer page.
  if (t.onClick)
    return (
      <button type="button" onClick={t.onClick} disabled={t.busy} className={`${rowClass} disabled:opacity-70`}>
        {inner}
      </button>
    )
  return (
    <Link to={t.to} className={rowClass}>
      {inner}
    </Link>
  )
}
