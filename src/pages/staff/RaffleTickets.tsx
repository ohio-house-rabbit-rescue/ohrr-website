// Staff → Raffle tickets: desktop edition of the app's raffle desk — the
// same RPCs (supabase/migrations/20260921170000_raffle_tickets.sql in the
// app repo). Reservations, mark paid, sell at the table, draw winners or
// record the bucket number.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card } from '../../components/ui'
import { formatPrice } from '../../lib/format'

const EVENT_SLUG = 'midwest-bunfest-2026'

interface Ticket {
  id: string
  no: number
  prize: string | null
  drawn_at: string | null
}
interface Order {
  id: string
  claim_token: string
  name: string
  phone: string | null
  qty: number
  amount_cents: number | null
  status: 'reserved' | 'paid' | 'void'
  source: 'app' | 'table'
  created_at: string
  tickets: Ticket[]
}
interface Winner {
  ticket_id: string
  no: number
  name: string
  phone: string | null
  prize: string | null
  found?: boolean
}
interface Summary {
  reserved: number
  paid_tickets: number
  paid_cents: number
  drawn: number
}
interface Prize {
  id: string
  title: string
  status: string
}

const label = (no: number) => `A-${String(no).padStart(4, '0')}`
function range(tickets: Ticket[]): string {
  const nos = tickets.map((t) => t.no).sort((a, b) => a - b)
  if (nos.length === 0) return ''
  const consecutive = nos.every((n, i) => i === 0 || n === nos[i - 1] + 1)
  return consecutive && nos.length > 1 ? `${label(nos[0])} – ${label(nos[nos.length - 1])}` : nos.map(label).join(', ')
}

export default function RaffleTicketsDesk() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [q, setQ] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [list, setList] = useState<Winner[]>([])
  const [prizeId, setPrizeId] = useState('')
  const [bucketNo, setBucketNo] = useState('')
  const [latest, setLatest] = useState<Winner | null>(null)
  const [sell, setSell] = useState({ qty: 1, name: '', phone: '' })
  const [sold, setSold] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [o, s, w, p] = await Promise.all([
        supabase.rpc('raffle_desk', { p_org: orgId, p_event: EVENT_SLUG, p_query: q || null }),
        supabase.rpc('raffle_desk_summary', { p_org: orgId, p_event: EVENT_SLUG }),
        supabase.rpc('raffle_winners', { p_org: orgId, p_event: EVENT_SLUG }),
        supabase.from('raffle_prizes').select('id, title, status').eq('org_id', orgId).eq('event_slug', EVENT_SLUG).order('sort_order').order('title'),
      ])
      if (o.error) throw o.error
      setOrders((o.data as Order[]) ?? [])
      setSummary((s.data as Summary | null) ?? null)
      setList((w.data as Winner[]) ?? [])
      setPrizes((p.data as Prize[]) ?? [])
      setError(null)
    } catch (e) {
      setError(errMessage(e))
      setOrders([])
    }
  }, [orgId, q])
  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  if (!can('events.bunfest.manage')) return <p className="text-slate-600">You don’t have access to the raffle desk.</p>

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const setStatus = (id: string, status: Order['status']) =>
    run(async () => {
      const { error } = await supabase.rpc('set_raffle_order_status', { p_id: id, p_status: status })
      if (error) throw error
    })
  const sellNow = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const { data, error } = await supabase.rpc('sell_raffle_tickets_at_table', { p_org: orgId, p_event: EVENT_SLUG, p_qty: sell.qty, p_name: sell.name, p_phone: sell.phone || null })
      if (error) throw error
      setSold(data as Order)
      setSell({ qty: 1, name: '', phone: '' })
    })
  }
  const draw = () =>
    run(async () => {
      const { data, error } = await supabase.rpc('draw_raffle_ticket', { p_org: orgId, p_event: EVENT_SLUG, p_prize_id: prizeId || null })
      if (error) throw error
      setLatest(data as Winner)
      setPrizeId('')
    })
  const bucket = (e: FormEvent) => {
    e.preventDefault()
    const no = Number(bucketNo.replace(/[^0-9]/g, ''))
    if (!no) return
    void run(async () => {
      const { data, error } = await supabase.rpc('record_bucket_draw', { p_org: orgId, p_event: EVENT_SLUG, p_ticket_no: no, p_prize_id: prizeId || null })
      if (error) throw error
      const w = data as Winner
      if (w.found === false) setNote(`${label(no)} isn’t an app ticket — a paper-roll number. Nothing to record.`)
      else {
        setLatest(w)
        setPrizeId('')
      }
      setBucketNo('')
    })
  }
  const undo = (w: Winner) =>
    window.confirm(`Undo the draw of ${label(w.no)}?`) &&
    run(async () => {
      const { error } = await supabase.rpc('undo_raffle_draw', { p_ticket_id: w.ticket_id })
      if (error) throw error
      if (latest?.ticket_id === w.ticket_id) setLatest(null)
    })

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Raffle tickets</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Numbered tickets reserved in the app and paid at the raffle table; tickets sold at the table; the draw. Prices come from the app’s Silent Auction → Auction setup; prizes from Scan an item.
      </p>
      {summary && (
        <div className="mt-5 grid max-w-xl grid-cols-4 gap-3 text-center">
          {[
            [summary.reserved, 'to pay'],
            [summary.paid_tickets, 'paid tickets'],
            [formatPrice(summary.paid_cents), 'taken'],
            [summary.drawn, 'drawn'],
          ].map(([v, l]) => (
            <Card key={String(l)} className="!p-3">
              <p className="font-display text-xl font-black text-brand-blue">{v}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{l}</p>
            </Card>
          ))}
        </div>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {note && <p className="mt-4 text-sm text-slate-600">{note}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-extrabold text-ink">Reservations</h2>
          <input className={`${staffInput} mt-2 max-w-md`} placeholder="Search name, phone or ticket number" value={q} onChange={(e) => setQ(e.target.value)} />
          {orders === null && <Spinner />}
          {orders && orders.length === 0 && <p className="mt-4 text-sm text-slate-500">{q ? 'Nothing matches.' : 'No reservations yet.'}</p>}
          <div className="mt-4 space-y-3">
            {orders?.map((o) => (
              <Card key={o.id} className={`flex flex-wrap items-center justify-between gap-3 ${o.status === 'void' ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <p className="font-display text-base font-extrabold text-ink">
                    {o.name} <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{o.status === 'paid' ? 'Paid' : o.status === 'void' ? 'Void' : 'To pay'}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {o.qty} {o.qty === 1 ? 'ticket' : 'tickets'}
                    {o.amount_cents != null ? ` · ${formatPrice(o.amount_cents)}` : ''}
                    {o.phone ? ` · ${o.phone}` : ''}
                    {o.source === 'table' ? ' · sold at the table' : ''}
                  </p>
                  <p className="font-mono text-sm font-bold text-ink">{range(o.tickets)}</p>
                  {o.tickets.some((t) => t.drawn_at) && (
                    <p className="text-sm font-bold text-brand-blue">🎉 Winner: {o.tickets.filter((t) => t.drawn_at).map((t) => `${label(t.no)}${t.prize ? ` — ${t.prize}` : ''}`).join(', ')}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {o.status === 'reserved' && (
                    <button type="button" disabled={busy} onClick={() => void setStatus(o.id, 'paid')} className={btn.orange}>
                      Mark paid
                    </button>
                  )}
                  {o.status === 'paid' && (
                    <button type="button" disabled={busy} onClick={() => void setStatus(o.id, 'reserved')} className={btn.outline}>
                      Undo paid
                    </button>
                  )}
                  {o.status !== 'void' ? (
                    <button type="button" disabled={busy} onClick={() => window.confirm(`Void ${o.name}’s tickets?`) && void setStatus(o.id, 'void')} className="text-sm font-bold text-red-600">
                      Void
                    </button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => void setStatus(o.id, 'reserved')} className={btn.outline}>
                      Restore
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={sellNow}>
            <Card className="space-y-3">
              <h2 className="font-display text-lg font-extrabold text-ink">Sell at the table</h2>
              <p className="text-xs text-slate-500">Paid straight away; numbers go into the same draw.</p>
              <label className="block text-sm font-semibold text-slate-700">
                How many
                <input className={staffInput} type="number" min={1} max={200} value={sell.qty} onChange={(e) => setSell({ ...sell, qty: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Name (optional)
                <input className={staffInput} value={sell.name} onChange={(e) => setSell({ ...sell, name: e.target.value })} placeholder="Walk-up" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Phone (optional)
                <input className={staffInput} type="tel" value={sell.phone} onChange={(e) => setSell({ ...sell, phone: e.target.value })} />
              </label>
              <button type="submit" disabled={busy} className={btn.orange}>
                Sell {sell.qty} {sell.qty === 1 ? 'ticket' : 'tickets'}
              </button>
              {sold && (
                <p className="text-sm">
                  Sold to <strong>{sold.name}</strong>: <span className="font-mono font-bold">{range(sold.tickets)}</span>
                </p>
              )}
            </Card>
          </form>

          <Card className="space-y-3">
            <h2 className="font-display text-lg font-extrabold text-ink">Draw</h2>
            <label className="block text-sm font-semibold text-slate-700">
              Prize (optional)
              <select className={staffInput} value={prizeId} onChange={(e) => setPrizeId(e.target.value)}>
                <option value="">— any / not tied to a prize —</option>
                {prizes.filter((p) => p.status !== 'drawn').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy} onClick={() => void draw()} className={`${btn.orange} w-full`}>
              Draw a winner
            </button>
            <form onSubmit={bucket} className="flex gap-2">
              <input className={`${staffInput} !mt-0 font-mono`} placeholder="Bucket number, e.g. A-0042" value={bucketNo} onChange={(e) => setBucketNo(e.target.value)} />
              <button type="submit" disabled={busy || !bucketNo} className={btn.blue}>
                Record
              </button>
            </form>
            {latest && (
              <div className="rounded-xl bg-brand-orange-50 p-3 text-center">
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange-dark">Winner</p>
                <p className="font-mono text-3xl font-black text-ink">{label(latest.no)}</p>
                <p className="font-bold text-ink">{latest.name}</p>
                {latest.phone && <p className="text-sm text-slate-600">{latest.phone}</p>}
                {latest.prize && <p className="text-sm font-bold text-brand-blue">{latest.prize}</p>}
              </div>
            )}
            {list.length > 0 && (
              <ul className="space-y-1 text-sm">
                {list.map((w) => (
                  <li key={w.ticket_id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-mono font-bold">{label(w.no)}</span> {w.name}
                      {w.prize ? ` — ${w.prize}` : ''}
                    </span>
                    <button type="button" onClick={() => void undo(w)} className="text-xs font-bold text-red-600">
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
