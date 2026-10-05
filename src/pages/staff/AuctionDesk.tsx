// Staff → Auction desk: the silent auction on the day and after (update 35).
// One read, auction_desk(), gives every item with its bids and sale, every
// bidder, and the money totals; it is read again every 20 s and after each
// action. Closing and charging goes through the payment server (the website's
// /api/auction/charge) with the staff member's own session token — Postgres
// checks their permission, the server only does the charging. Everything else
// (table sales, pickup, shipping, cash, refunds, blocking) is a Postgres
// function called straight from here.
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card, ext } from '../../components/ui'
import { toCsv, exportCsv } from '../../lib/exportFile'
import {
  AUCTION_EVENT,
  auctionApi,
  dollarsToCents,
  fmtWhen,
  money,
  sessionLabel,
  FULFIL_LABEL,
  PAYMENT_LABEL,
  type AuctionItem,
  type AuctionSettings,
  type Bidder,
  type ChargeResult,
  type Fulfil,
  type Sale,
} from '../../lib/auctionClient'
import { addressLine, cardLine, isMissingFunction, itemPath } from '../../lib/auctionSite'

interface DeskItem extends AuctionItem {
  is_published: boolean
  high_bidder: { id: string; name: string; email: string; phone: string | null; bidder_no: number; fulfil: Fulfil } | null
  bids: { amount_cents: number; kind: string; at: string; is_high: boolean; bidder_no: number | null; name: string | null }[]
  sale: Sale | null
}
interface DeskBidder extends Omit<Bidder, 'access_token'> {
  bids: number
  won: number
}
interface Totals {
  paid_cents: number
  pending_cents: number
  failed: number
  sold: number
  to_ship: number
  to_pick_up: number
}
interface Desk {
  now: string
  settings: AuctionSettings | null
  items: DeskItem[]
  bidders: DeskBidder[]
  totals: Totals
}

type Tab = 'items' | 'bidders'

function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'orange' | 'slate' | 'green' | 'red' }) {
  const t = {
    blue: 'bg-brand-blue-50 text-brand-blue',
    orange: 'bg-brand-orange-50 text-brand-orange-ink',
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-800',
    red: 'bg-red-50 text-red-700',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${t}`}>{children}</span>
}
const dangerBtn = 'inline-flex min-h-11 items-center justify-center rounded-full border-2 border-red-200 px-5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60'
const tabBtn = (on: boolean) =>
  `inline-flex min-h-11 items-center rounded-full px-5 text-base font-bold ${on ? 'bg-brand-blue text-white' : 'border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`

const payTone = (s: Sale['payment_status']) =>
  s === 'paid' || s === 'cash' ? 'green' : s === 'failed' ? 'red' : s === 'pending' ? 'orange' : 'slate'

/** What the payment server said about one charge, in a line. */
function chargeLine(r: ChargeResult): { tone: 'green' | 'orange' | 'red'; text: string } {
  const who = `${r.sale.item?.title ?? 'Item'} — ${r.sale.buyer.name ?? 'buyer'}${r.sale.buyer.bidder_no != null ? ` (#${r.sale.buyer.bidder_no})` : ''} ${money(r.sale.total_cents)}`
  if (r.ok) return { tone: 'green', text: `Paid: ${who}` }
  if (r.requires_action) return { tone: 'orange', text: `Needs the bidder’s bank check: ${who}. They can finish it from “Your bids” on the website (Pay now).` }
  return { tone: 'red', text: `Declined: ${who} — ${r.error}` }
}

/* ------------------------------------------------------------------ */
/* A table sale (paper bidder or walk-up)                              */
/* ------------------------------------------------------------------ */

function TableSaleForm({ item, onDone, onCancel }: { item: DeskItem; onDone: () => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(item.high_bidder?.name ?? '')
  const [phone, setPhone] = useState(item.high_bidder?.phone ?? '')
  const [email, setEmail] = useState(item.high_bidder?.email ?? '')
  const [amount, setAmount] = useState(item.current_bid_cents != null ? (item.current_bid_cents / 100).toFixed(2).replace(/\.00$/, '') : '')
  const [fulfil, setFulfil] = useState<Fulfil>('pickup')
  const [paid, setPaid] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cents = dollarsToCents(amount)
    if (cents == null) {
      setError('Enter the amount.')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('auction_desk_sale', {
      p_item_id: item.id,
      p_name: name.trim() || null,
      p_phone: phone.trim() || null,
      p_email: email.trim() || null,
      p_amount_cents: cents,
      p_fulfil: fulfil,
      p_paid: paid,
      p_ship_fee_cents: null,
    })
    setBusy(false)
    if (error) {
      setError(errMessage(error))
      return
    }
    await onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-slate-50 p-3">
      <p className="font-display text-base font-extrabold text-ink">Record a table sale</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Buyer’s name
          <input className={staffInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Walk-up" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Amount ($)
          <input className={staffInput} type="number" inputMode="decimal" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Phone (optional)
          <input className={staffInput} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Email (optional)
          <input className={staffInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Getting it to them
          <select className={staffInput} value={fulfil} onChange={(e) => setFulfil(e.target.value === 'ship' ? 'ship' : 'pickup')}>
            <option value="pickup">Pickup (taking it now or later)</option>
            {item.ship_fee_cents != null && <option value="ship">Ship it{item.ship_fee_cents ? ` (+${money(item.ship_fee_cents)})` : ''}</option>}
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="h-5 w-5 rounded border-slate-300 accent-brand-blue" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Paid at the desk
        </label>
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : 'Record sale'}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className={btn.outline}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* One item on the desk                                                */
/* ------------------------------------------------------------------ */

function ItemRow({ item, busy, run, charge }: { item: DeskItem; busy: boolean; run: (fn: () => Promise<void>) => Promise<void>; charge: (body: { sale_id: string } | { offer_next_sale_id: string }) => Promise<void> }) {
  const [selling, setSelling] = useState(false)
  const [tracking, setTracking] = useState('')
  const sale = item.sale
  const hb = item.high_bidder

  const updateSale = (patch: { p_payment_status?: string; p_fulfil_status?: string; p_tracking?: string }) =>
    run(async () => {
      if (!sale) return
      const { error } = await supabase.rpc('auction_update_sale', { p_sale_id: sale.sale_id, p_payment_status: null, p_fulfil_status: null, p_tracking: null, p_note: null, ...patch })
      if (error) throw error
    })

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold text-ink">
            <Link to={itemPath(item.id)} className="text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
              {item.title}
            </Link>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-slate-700">
            <Badge tone="slate">{sessionLabel(item.session)}</Badge>
            {!item.is_published && <Badge tone="slate">Hidden</Badge>}
            {item.status === 'won' ? <Badge tone="orange">Sold</Badge> : item.is_open ? <Badge tone="green">Open</Badge> : <Badge tone="slate">{item.closes_at ? 'Closed' : 'Not open'}</Badge>}
            {item.closes_at && <span>Closes {fmtWhen(item.closes_at)}</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-black text-ink">{item.current_bid_cents != null ? money(item.current_bid_cents) : '—'}</p>
          <p className="text-sm text-slate-600">
            {item.bid_count} bid{item.bid_count === 1 ? '' : 's'}
            {item.buy_now_cents != null && ` · Buy Now ${money(item.buy_now_cents)}`}
          </p>
        </div>
      </div>

      {hb && (
        <p className="text-sm text-slate-700">
          <strong className="text-ink">High bidder #{hb.bidder_no} {hb.name}</strong>
          {hb.phone && ` · ${hb.phone}`} · {hb.email} · {hb.fulfil === 'ship' ? 'wants shipping' : 'pickup'}
        </p>
      )}

      {sale ? (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone={payTone(sale.payment_status)}>{PAYMENT_LABEL[sale.payment_status]}</Badge>
            <span>
              {sale.kind === 'buy_now' ? 'Buy Now' : sale.kind === 'desk' ? 'Table sale' : 'Closing bid'} {money(sale.amount_cents)}
              {sale.ship_fee_cents > 0 && <> + shipping {money(sale.ship_fee_cents)}</>} = <strong className="text-ink">{money(sale.total_cents)}</strong>
            </span>
          </p>
          <p>
            <strong className="text-ink">
              {sale.buyer.name ?? 'Buyer'}
              {sale.buyer.bidder_no != null && ` (#${sale.buyer.bidder_no})`}
            </strong>
            {sale.buyer.phone && ` · ${sale.buyer.phone}`}
            {sale.buyer.email && ` · ${sale.buyer.email}`}
            {sale.buyer.card_last4 && ` · card ending ${sale.buyer.card_last4}`}
          </p>
          <p>
            {sale.fulfil === 'ship' ? (
              <>
                Ship to {addressLine(sale.ship_address) || '(no address)'} · {FULFIL_LABEL[sale.fulfil_status]}
                {sale.tracking && ` · Tracking ${sale.tracking}`}
              </>
            ) : (
              <>Pickup · {FULFIL_LABEL[sale.fulfil_status]}</>
            )}
            {sale.paid_at && ` · Paid ${fmtWhen(sale.paid_at)}`}
          </p>
          {sale.failure_message && <p className="font-semibold text-red-700">{sale.failure_message}</p>}
          {sale.note && <p className="text-slate-600">{sale.note}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            {(sale.payment_status === 'pending' || sale.payment_status === 'failed') && (
              <>
                {sale.bidder_id && (
                  <button type="button" disabled={busy} onClick={() => void charge({ sale_id: sale.sale_id })} className={`${btn.orange} disabled:opacity-60`}>
                    Charge card again
                  </button>
                )}
                {sale.kind !== 'desk' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => window.confirm(`Pass “${item.title}” to the next-highest bidder with a card and charge them? This cancels ${sale.buyer.name ?? 'the buyer'}’s sale.`) && void charge({ offer_next_sale_id: sale.sale_id })}
                    className={btn.outline}
                  >
                    Offer to next bidder
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => void updateSale({ p_payment_status: 'cash' })} className={btn.outline}>
                  Paid at the desk
                </button>
              </>
            )}
            {(sale.payment_status === 'paid' || sale.payment_status === 'cash') && sale.fulfil === 'pickup' && (
              sale.fulfil_status === 'picked_up' ? (
                <button type="button" disabled={busy} onClick={() => void updateSale({ p_fulfil_status: 'pending' })} className={btn.outline}>
                  Not picked up after all
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void updateSale({ p_fulfil_status: 'picked_up' })} className={`${btn.orange} disabled:opacity-60`}>
                  Picked up
                </button>
              )
            )}
            {(sale.payment_status === 'paid' || sale.payment_status === 'cash') && sale.fulfil === 'ship' && (
              sale.fulfil_status === 'shipped' ? (
                <button type="button" disabled={busy} onClick={() => void updateSale({ p_fulfil_status: 'pending' })} className={btn.outline}>
                  Not shipped after all
                </button>
              ) : (
                <span className="flex flex-wrap items-end gap-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Tracking (optional)
                    <input className={`${staffInput} !mt-1 w-56`} value={tracking} onChange={(e) => setTracking(e.target.value)} />
                  </label>
                  <button type="button" disabled={busy} onClick={() => void updateSale({ p_fulfil_status: 'shipped', p_tracking: tracking.trim() || undefined })} className={`${btn.orange} disabled:opacity-60`}>
                    Shipped
                  </button>
                </span>
              )
            )}
            {sale.payment_status === 'paid' && sale.stripe_payment_intent_id && (
              <>
                <a href={`https://dashboard.stripe.com/payments/${sale.stripe_payment_intent_id}`} {...ext} className={btn.outline}>
                  Refund in Stripe
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => window.confirm('Mark this sale refunded? Do the refund itself in Stripe first — this only records it.') && void updateSale({ p_payment_status: 'refunded' })}
                  className={btn.outline}
                >
                  Mark refunded
                </button>
              </>
            )}
            {sale.payment_status !== 'void' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => window.confirm(`Cancel this sale of “${item.title}”? The item goes back up for sale. ${sale.payment_status === 'paid' ? 'It does NOT refund the card — do that in Stripe.' : ''}`) && void updateSale({ p_payment_status: 'void' })}
                className={dangerBtn}
              >
                Cancel sale
              </button>
            )}
          </div>
        </div>
      ) : item.status === 'won' ? (
        <p className="text-sm text-slate-600">Marked won by hand (no sale record). Change that under Silent auction if a sale should be recorded.</p>
      ) : selling ? (
        <TableSaleForm
          item={item}
          onDone={async () => {
            setSelling(false)
            await run(async () => {})
          }}
          onCancel={() => setSelling(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => setSelling(true)} className={btn.outline}>
            Record a table sale
          </button>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AuctionDesk() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const allowed = can('events.bunfest.manage')
  const [desk, setDesk] = useState<Desk | null>(null)
  const [notReady, setNotReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('items')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<{ results: ChargeResult[]; errors: { item_id?: string; error: string }[]; message?: string } | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const load = useCallback(async () => {
    if (!orgId || !allowed) return
    const { data, error } = await supabase.rpc('auction_desk', { p_org: orgId, p_event: AUCTION_EVENT })
    if (error) {
      if (isMissingFunction(error)) setNotReady(true)
      else setError(errMessage(error))
      setDesk((d) => d ?? { now: new Date().toISOString(), settings: null, items: [], bidders: [], totals: { paid_cents: 0, pending_cents: 0, failed: 0, sold: 0, to_ship: 0, to_pick_up: 0 } })
      return
    }
    setNotReady(false)
    setError(null)
    setDesk(data as Desk)
  }, [orgId, allowed])
  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 20000)
    return () => clearInterval(t)
  }, [load])

  if (!allowed) return <p className="text-slate-600">You don’t have access to the auction desk.</p>

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const charge = (body: { org_id: string; event: string } | { sale_id: string } | { offer_next_sale_id: string }) =>
    run(async () => {
      const { data } = await supabase.auth.getSession()
      const jwt = data.session?.access_token
      if (!jwt) throw new Error('Sign in again, then try once more.')
      const r = await auctionApi.charge(jwt, body)
      setResults(r)
    })

  const closeAndCharge = () => {
    setConfirmClose(false)
    void charge({ org_id: orgId, event: AUCTION_EVENT })
  }

  const setBlocked = (b: DeskBidder, blocked: boolean) =>
    (!blocked || window.confirm(`Block #${b.bidder_no} ${b.name} from bidding? Their bids so far stand; they cannot place new ones.`)) &&
    run(async () => {
      const { error } = await supabase.rpc('auction_set_bidder_blocked', { p_bidder_id: b.id, p_blocked: blocked })
      if (error) throw error
    })

  const download = () => {
    if (!desk) return
    const rows = desk.items
      .filter((i) => i.sale)
      .map((i) => {
        const s = i.sale as Sale
        return [
          i.title,
          s.buyer.name ?? '',
          s.buyer.email ?? '',
          s.buyer.phone ?? '',
          s.kind === 'buy_now' ? 'Buy Now' : s.kind === 'desk' ? 'Table sale' : 'Closing bid',
          (s.amount_cents / 100).toFixed(2),
          (s.ship_fee_cents / 100).toFixed(2),
          (s.total_cents / 100).toFixed(2),
          PAYMENT_LABEL[s.payment_status],
          `${s.fulfil === 'ship' ? 'Ship' : 'Pickup'} — ${FULFIL_LABEL[s.fulfil_status]}`,
          s.fulfil === 'ship' ? addressLine(s.ship_address) : '',
          s.tracking ?? '',
        ]
      })
    exportCsv(
      `ohrr-auction-sales-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(['Item', 'Buyer', 'Email', 'Phone', 'Kind', 'Amount', 'Shipping', 'Total', 'Payment', 'Pickup / shipping', 'Address', 'Tracking'], rows),
    )
  }

  const needle = q.trim().toLowerCase()
  const matches = (i: DeskItem) => {
    if (!needle) return true
    const hay = [i.title, i.high_bidder?.name, i.high_bidder?.bidder_no != null ? `#${i.high_bidder.bidder_no}` : '', i.sale?.buyer.name, i.sale?.buyer.email, i.sale?.buyer.bidder_no != null ? `#${i.sale.buyer.bidder_no}` : '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  }
  const matchesBidder = (b: DeskBidder) => !needle || `#${b.bidder_no} ${b.name} ${b.email} ${b.phone ?? ''}`.toLowerCase().includes(needle)

  const readyToClose = desk?.items.filter((i) => i.status === 'available' && !i.sale && i.high_bidder && i.closes_at && new Date(i.closes_at) <= new Date(desk.now)).length ?? 0
  const t = desk?.totals

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Auction desk</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Who is high on every item, who has won, who has paid, and what still has to be handed over or shipped. Prices and the bidding switch
            are under{' '}
            <Link to="/staff/auction" className="font-bold text-brand-blue">
              Silent auction
            </Link>
            .
          </p>
        </div>
        <button type="button" onClick={download} disabled={!desk || desk.items.every((i) => !i.sale)} className={`${btn.outline} disabled:opacity-60`}>
          Download sales (CSV)
        </button>
      </div>

      {notReady && (
        <Card className="mt-5 border-brand-orange/40 bg-brand-orange-50">
          <p className="text-base leading-relaxed text-slate-800">
            <strong>Online bidding isn’t in the database yet.</strong> Run update 35 (RUN-THIS-IN-SUPABASE.sql, in the 02 App Design folder) and
            this desk fills in. Until then, items are marked won by hand under Silent auction.
          </p>
        </Card>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {desk === null ? (
        <Spinner label="Opening the desk…" />
      ) : (
        <>
          {t && (
            <div className="mt-5 grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
              {[
                [money(t.paid_cents) || '$0', 'paid'],
                [money(t.pending_cents) || '$0', 'not paid yet'],
                [t.failed, 'declined'],
                [t.sold, 'sold'],
                [t.to_pick_up, 'to pick up'],
                [t.to_ship, 'to ship'],
              ].map(([v, l]) => (
                <Card key={String(l)} className="!p-3">
                  <p className="font-display text-xl font-black text-brand-blue">{v}</p>
                  <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600">{l}</p>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-extrabold text-ink">Close &amp; charge</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  Charges the high bidder of every item whose time has passed, on the card they saved. Run it after each session closes; it is
                  safe to run again — items already sold are skipped.
                  {readyToClose > 0 && (
                    <>
                      {' '}
                      <strong className="text-ink">
                        {readyToClose} item{readyToClose === 1 ? '' : 's'} ready now.
                      </strong>
                    </>
                  )}
                </p>
              </div>
              {confirmClose ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy || notReady} onClick={closeAndCharge} className={`${btn.orange} disabled:opacity-60`}>
                    {busy ? 'Charging…' : 'Yes, charge the winners'}
                  </button>
                  <button type="button" onClick={() => setConfirmClose(false)} className={btn.outline}>
                    Not yet
                  </button>
                </div>
              ) : (
                <button type="button" disabled={busy || notReady} onClick={() => setConfirmClose(true)} className={`${btn.orange} disabled:opacity-60`}>
                  Close &amp; charge now
                </button>
              )}
            </div>
            {results && (
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
                {results.message && <p className="text-slate-700">{results.message}</p>}
                {results.results.length === 0 && results.errors.length === 0 && !results.message && <p className="text-slate-700">Nothing to charge right now.</p>}
                {results.results.map((r, i) => {
                  const line = chargeLine(r)
                  return (
                    <p key={i} className={line.tone === 'green' ? 'text-emerald-800' : line.tone === 'red' ? 'font-semibold text-red-700' : 'text-brand-orange-ink'}>
                      {line.text}
                    </p>
                  )
                })}
                {results.errors.map((e, i) => (
                  <p key={`e${i}`} className="font-semibold text-red-700">
                    {e.item_id ? `${desk.items.find((x) => x.id === e.item_id)?.title ?? 'Item'}: ` : ''}
                    {e.error}
                  </p>
                ))}
                <button type="button" onClick={() => setResults(null)} className="text-sm font-bold text-brand-blue">
                  Clear
                </button>
              </div>
            )}
          </Card>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setTab('items')} className={tabBtn(tab === 'items')} aria-pressed={tab === 'items'}>
              Items ({desk.items.length})
            </button>
            <button type="button" onClick={() => setTab('bidders')} className={tabBtn(tab === 'bidders')} aria-pressed={tab === 'bidders'}>
              Bidders ({desk.bidders.length})
            </button>
            <input className={`${staffInput} !mt-0 ml-auto max-w-xs`} placeholder="Search item, name or #number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          </div>

          {tab === 'items' && (
            <div className="mt-4 space-y-3">
              {desk.items.length === 0 && <p className="text-sm text-slate-500">{notReady ? '' : 'No items in the auction yet — add them under Silent auction.'}</p>}
              {desk.items.filter(matches).map((i) => (
                <ItemRow key={i.id} item={i} busy={busy} run={run} charge={charge} />
              ))}
              {desk.items.length > 0 && desk.items.filter(matches).length === 0 && <p className="text-sm text-slate-500">Nothing matches.</p>}
            </div>
          )}

          {tab === 'bidders' && (
            <div className="mt-4 space-y-3">
              {desk.bidders.length === 0 && <p className="text-sm text-slate-500">Nobody has registered yet.</p>}
              {desk.bidders.filter(matchesBidder).map((b) => (
                <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 text-sm text-slate-700">
                    <p className="font-display text-base font-extrabold text-ink">
                      #{b.bidder_no} {b.name}{' '}
                      {b.is_blocked && <Badge tone="red">Blocked</Badge>}
                    </p>
                    <p>
                      {b.email}
                      {b.phone && ` · ${b.phone}`}
                    </p>
                    <p>
                      {b.fulfil === 'ship' ? `Ship to ${addressLine(b.address) || '(no address)'}` : 'Pickup'} · {cardLine(b)} · {b.bids} bid{b.bids === 1 ? '' : 's'} · {b.won} won
                    </p>
                  </div>
                  {b.is_blocked ? (
                    <button type="button" disabled={busy} onClick={() => void setBlocked(b, false)} className={btn.outline}>
                      Unblock
                    </button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => void setBlocked(b, true)} className={dangerBtn}>
                      Block
                    </button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
