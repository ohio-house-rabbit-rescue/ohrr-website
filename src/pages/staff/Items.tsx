// Scanned items — the desktop mirror of the app's "Scan an item" list. Reads
// and writes through the same RPCs (item_by_code / save_scanned_item / …), so
// an edit here shows on a phone immediately and vice-versa. Scanning itself
// stays on the phone; here you can fix details, mark items won/drawn, count
// stock and print tag sheets.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'

type Kind = 'auction' | 'raffle' | 'stock'
interface Item {
  tag_id: string
  code: string
  kind: Kind
  ref_id: string
  title: string
  description: string | null
  donated_by: string | null
  value_cents: number | null
  photo_url: string | null
  price_cents: number | null
  quantity: number | null
  status: string
  is_published: boolean
  created_at: string
}

const KIND: Record<Kind, { label: string; icon: IconName; done: string; doneLabel: string; open: string }> = {
  auction: { label: 'Silent Auction', icon: 'gavel', done: 'won', doneLabel: 'Won', open: 'available' },
  raffle: { label: 'Raffle prize', icon: 'ticket', done: 'drawn', doneLabel: 'Drawn', open: 'available' },
  stock: { label: 'Hop Shop stock', icon: 'box', done: 'inactive', doneLabel: 'Hidden', open: 'active' },
}

const money = (c: number | null) => (c == null ? '' : `$${c % 100 === 0 ? c / 100 : (c / 100).toFixed(2)}`)
const toCents = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ''))
  return s.trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 100)
}

export default function Items() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const canAuction = can('events.bunfest.manage')
  const canStock = can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Kind>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase.rpc('list_tagged_items', { p_org: orgId, p_kind: null })
    if (error) setError(errMessage(error))
    else setItems((data ?? []) as Item[])
  }
  useEffect(() => {
    if (orgId) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (items ?? []).filter(
      (i) => (filter === 'all' || i.kind === filter) && (!n || i.title.toLowerCase().includes(n) || i.code.toLowerCase().includes(n) || (i.donated_by ?? '').toLowerCase().includes(n)),
    )
  }, [items, filter, q])

  const swap = (it: Item) => setItems((list) => (list ?? []).map((x) => (x.tag_id === it.tag_id ? it : x)))

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    setError(null)
    const { data, error } = await supabase.rpc(fn, args)
    if (error) {
      setError(errMessage(error))
      return
    }
    if (data) swap(data as Item)
  }

  const remove = async (it: Item) => {
    if (!window.confirm(`Remove “${it.title}” completely? This can’t be undone.`)) return
    const { error } = await supabase.rpc('delete_item_by_code', { p_org: orgId, p_code: it.code })
    if (error) setError(errMessage(error))
    else setItems((list) => (list ?? []).filter((x) => x.tag_id !== it.tag_id))
  }

  const mayEdit = (it: Item) => (it.kind === 'stock' ? canStock : canAuction)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Scanned items</h1>
          <p className="mt-1 text-sm text-slate-600">
            Everything with an OHRR tag or a scanned barcode. Items are added by scanning in the app; here you can tidy details, mark them won or drawn, and count stock.
          </p>
        </div>
        <Link to="/staff/items/tags" className={btn.blue}>
          <Icon name="printer" size={16} /> Print tag sheets
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(['all', 'auction', 'raffle', 'stock'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${filter === f ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
          >
            {f === 'all' ? 'All' : KIND[f].label} ({(items ?? []).filter((i) => f === 'all' || i.kind === f).length})
          </button>
        ))}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, donor or code"
          className={`${staffInput} !mt-0 max-w-xs`}
          aria-label="Search items"
        />
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {items === null && !error && <Spinner />}
      {items && shown.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          {items.length === 0 ? 'Nothing has been scanned yet. Print tags, then scan them in the app.' : 'Nothing matches.'}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {shown.map((it) => {
          const k = KIND[it.kind]
          const done = it.status === k.done
          return (
            <li key={it.tag_id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-4">
                {it.photo_url ? (
                  <img src={it.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue">
                    <Icon name={k.icon} size={30} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-extrabold text-ink">{it.title}</p>
                  <p className="text-sm text-slate-600">
                    {k.label}
                    {it.kind === 'stock' ? ` · ${it.quantity ?? 0} in stock · ${money(it.price_cents) || 'no price'} each` : ` · ${done ? k.doneLabel : 'Available'}`}
                    {it.kind !== 'stock' && it.donated_by ? ` · from ${it.donated_by}` : ''}
                    {it.kind !== 'stock' && it.value_cents != null ? ` · worth ${money(it.value_cents)}` : ''}
                    {it.kind !== 'stock' && !it.is_published ? ' · hidden' : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-bold tracking-widest text-slate-400">{it.code}</p>
                </div>
                {mayEdit(it) && (
                  <div className="flex flex-wrap gap-2">
                    {it.kind === 'stock' ? (
                      <>
                        <button type="button" onClick={() => void rpc('adjust_stock_by_code', { p_org: orgId, p_code: it.code, p_delta: -1 })} className={btn.outline} aria-label="One fewer">
                          −1
                        </button>
                        <button type="button" onClick={() => void rpc('adjust_stock_by_code', { p_org: orgId, p_code: it.code, p_delta: 1 })} className={btn.outline} aria-label="One more">
                          +1
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => void rpc('set_item_status_by_code', { p_org: orgId, p_code: it.code, p_status: done ? k.open : k.done })} className={btn.outline}>
                          {done ? `Not ${k.doneLabel.toLowerCase()}` : `Mark ${k.doneLabel.toLowerCase()}`}
                        </button>
                        <button type="button" onClick={() => void rpc('set_item_published_by_code', { p_org: orgId, p_code: it.code, p_published: !it.is_published })} className={btn.outline}>
                          {it.is_published ? 'Hide' : 'Show'}
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => setEditing(editing === it.tag_id ? null : it.tag_id)} className={btn.outline}>
                      {editing === it.tag_id ? 'Close' : 'Edit'}
                    </button>
                    <button type="button" onClick={() => void remove(it)} className="text-sm font-bold text-red-600">
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {editing === it.tag_id && (
                <EditForm
                  item={it}
                  orgId={orgId}
                  onSaved={(saved) => {
                    swap(saved)
                    setEditing(null)
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EditForm({ item, orgId, onSaved }: { item: Item; orgId: string; onSaved: (it: Item) => void }) {
  const stock = item.kind === 'stock'
  const [d, setD] = useState({
    title: item.title,
    description: item.description ?? '',
    donated_by: item.donated_by ?? '',
    value: item.value_cents == null ? '' : String(item.value_cents / 100),
    price: item.price_cents == null ? '' : String(item.price_cents / 100),
    quantity: String(item.quantity ?? 0),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('save_scanned_item', {
      p_org: orgId,
      p_code: item.code,
      p_kind: item.kind,
      p_title: d.title,
      p_description: d.description.trim() || null,
      p_donated_by: stock ? null : d.donated_by.trim() || null,
      p_value_cents: stock ? null : toCents(d.value),
      p_photo_url: null,
      p_price_cents: stock ? toCents(d.price) : null,
      p_quantity: stock ? Math.max(0, parseInt(d.quantity || '0', 10) || 0) : null,
      p_session: null,
    })
    setBusy(false)
    if (error) setError(errMessage(error))
    else onSaved(data as Item)
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Name
          <input className={staffInput} required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        </label>
        {stock ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-slate-700">
              In stock
              <input className={staffInput} inputMode="numeric" value={d.quantity} onChange={(e) => setD({ ...d, quantity: e.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Price each ($)
              <input className={staffInput} inputMode="decimal" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-slate-700">
              Donated by
              <input className={staffInput} value={d.donated_by} onChange={(e) => setD({ ...d, donated_by: e.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Value ($)
              <input className={staffInput} inputMode="decimal" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} />
            </label>
          </div>
        )}
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Description
        <textarea className={staffInput} rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </label>
      <p className="text-xs text-slate-500">Photos are taken in the app (Scan an item → Photo).</p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={busy || !d.title.trim()} className={`${btn.orange} disabled:opacity-60`}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
