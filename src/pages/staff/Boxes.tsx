// Boxes (/staff/boxes) — the numbered boxes items are packed in (update 46),
// the website's copy of the app's scan/pages/Boxes.tsx. Start a box, or find
// one by its number, where it's kept, or an item inside.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { listBoxes, newBox, type Box } from '../../lib/boxes'

export default function Boxes() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  // The same people as Items and Scan an item (staffTiles.ts).
  const canItems = can('events.bunfest.manage') || can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')
  const navigate = useNavigate()
  const [boxes, setBoxes] = useState<Box[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!orgId) return
    let alive = true
    const load = () =>
      listBoxes(orgId)
        .then((b) => alive && setBoxes(b))
        .catch((e) => alive && setError(errMessage(e)))
    void load()
    const again = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', again)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', again)
    }
  }, [orgId])

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const b = await newBox(orgId)
      navigate(`/staff/boxes/${b.code}?scan=1`)
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  if (!canItems) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-2xl font-black text-ink">Boxes</h1>
        <p className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700">
          Boxes need BunFest or Hop Shop access. Whoever brought you on can switch it on.
        </p>
      </div>
    )
  }

  const needle = q.trim().toLowerCase()
  const shown = (boxes ?? []).filter(
    (b) =>
      !needle ||
      `box ${b.box_no}` === needle ||
      String(b.box_no) === needle.replace(/^box\s*/, '') ||
      b.code.toLowerCase().includes(needle) ||
      (b.location ?? '').toLowerCase().includes(needle) ||
      b.items.some((i) => i.title.toLowerCase().includes(needle) || i.code.toLowerCase().includes(needle)),
  )

  return (
    <div className="max-w-3xl">
      <Link to="/staff/items" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
        <Icon name="arrowLeft" size={16} /> Items
      </Link>
      <h1 className="mt-1 font-display text-2xl font-black text-ink">Boxes</h1>
      <p className="mt-1 text-base text-slate-600">
        Pack labeled items into a numbered box: scan each item’s label, then print the box label with the list of what’s inside. Scanning the box label opens the full list.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => void start()} disabled={busy || !orgId} className={`${btn.orange} min-h-12 text-base disabled:opacity-60`}>
          <Icon name="plus" size={18} /> {busy ? 'Starting…' : 'Start a new box'}
        </button>
        {boxes && boxes.length > 0 && (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Box number, place, or an item"
            aria-label="Find a box"
            className={`${staffInput} !mt-0 !py-3 text-base sm:max-w-sm`}
          />
        )}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700" role="alert">{error}</p>}
      {boxes === null && !error && <Spinner />}
      {boxes && boxes.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-500">No boxes yet. Start one, then scan the items that go in it.</p>
      )}
      {boxes && boxes.length > 0 && shown.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-500">No box matches that.</p>
      )}
      <ul className="mt-4 space-y-2">
        {shown.map((b) => (
          <li key={b.id}>
            <Link to={`/staff/boxes/${b.code}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-brand-blue">
              <span className="inline-flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue">
                <span className="text-[11px] font-extrabold uppercase leading-none">Box</span>
                <span className="font-display text-xl font-black leading-tight">{b.box_no}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-extrabold text-ink">
                  Box {b.box_no}
                  {b.location ? <span className="font-sans text-sm font-semibold text-slate-600"> · {b.location}</span> : null}
                </span>
                <span className="block text-sm text-slate-600">
                  {b.items.length} item{b.items.length === 1 ? '' : 's'} · {b.label_printed_at ? 'label printed' : 'label not printed yet'}
                </span>
                {b.items.length > 0 && (
                  <span className="block truncate text-sm text-slate-500">
                    {b.items
                      .slice(0, 4)
                      .map((i) => i.title)
                      .join(', ')}
                    {b.items.length > 4 ? ', …' : ''}
                  </span>
                )}
              </span>
              <Icon name="chevron" size={20} className="mt-4 shrink-0 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
