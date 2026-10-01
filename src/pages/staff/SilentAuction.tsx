// Staff → Silent Auction: the Midwest BunFest Silent Auction catalogue —
// desktop mirror of the app's StaffRaffle (gated on events.bunfest.manage; the
// DB enforces it too). Same `raffle_items` and `auction_settings` tables and
// the same `raffle-photos` bucket, so an item added here is on a phone at once.
//
// Adding an item starts with the photo, then the details. The "Auction setup"
// panel holds the two session close times, an optional intro line, and the
// raffle ticket pricing + details (the public raffle page shows those only when
// staff have entered them; the ticket form itself is a feature switched on in
// Staff → Features). The public catalog shows the intro line only, never the
// times. Scanned items (Staff → Items) lists the same auction items by tag;
// this page is the full catalogue editor.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner, canSwitchFeatures } from '../../lib/staff'
import { SILENT_AUCTION_FLAG, useFeature } from '../../lib/settings'
import { btn, Card } from '../../components/ui'
import { Icon } from '../../components/icons'
import {
  AUCTION_EVENT_SLUG,
  AUCTION_PRICE_COLUMNS,
  AUCTION_SESSIONS,
  centsToDollars,
  dollarsToCents,
  eventDateTimeToIso,
  eventTimeToIso,
  formatEventDateTime,
  formatEventTime,
  formatValue,
  hasBiddingColumns,
  isoToEventDateTime,
  isoToEventTime,
  itemInitial,
  rafflePriceLine,
  sessionLabel,
  sortForStaff,
  uploadAuctionPhoto,
  type AuctionItem,
  type AuctionSettings,
} from '../../lib/auction'
import { auctionApi } from '../../lib/auctionClient'
import { listSuppliers, type Supplier } from '../../lib/hopshop'
import { vendorRecordsReady } from '../../lib/companies'

// Update 35 not run yet: the row has no bidding columns (PostgREST says so).
const missingColumn = (e: unknown) => /schema cache|column .* does not exist|PGRST204/i.test(errMessage(e))
const missingFunction = (e: unknown) => /could not find the function|PGRST202/i.test(errMessage(e)) || (e as { code?: string })?.code === 'PGRST202'

// Small local stand-ins for the app's shell pieces (as Bookings.tsx does).
function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'orange' | 'slate' }) {
  const t = { blue: 'bg-brand-blue-50 text-brand-blue', orange: 'bg-brand-orange-50 text-brand-orange-dark', slate: 'bg-slate-100 text-slate-600' }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${t}`}>{children}</span>
}
function FormError({ children }: { children?: ReactNode }) {
  return children ? <p className="text-sm font-semibold text-red-600">{children}</p> : null
}
function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-1 text-sm font-extrabold uppercase tracking-wider text-slate-600">{children}</p>
}

const cancelBtn = 'inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60'
const dangerBtn = 'inline-flex items-center justify-center rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60'

/* ------------------------------------------------------------------ */
/* Photo — a real photo of the item, nothing else                      */
/* ------------------------------------------------------------------ */

// An item's own photo. With no photo (or if it fails to load) a neutral block
// carrying the item's initial — real photos only, no stand-in illustrations.
function ItemPhoto({ title, photo, initialClassName = 'text-4xl' }: { title: string; photo?: string | null; initialClassName?: string }) {
  const [failed, setFailed] = useState(false)
  if (photo && !failed) {
    return <img src={photo} alt={title} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100" role="img" aria-label={`${title} (no photo yet)`}>
      <span className={`font-display font-black leading-none text-slate-300 ${initialClassName}`} aria-hidden>
        {itemInitial(title)}
      </span>
    </div>
  )
}

function PhotoCapture({
  orgId,
  photo,
  onPhoto,
  compact = false,
}: {
  orgId: string
  photo: string | null
  onPhoto: (url: string | null) => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  const onFile = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = '' // let the same file be picked again after a retake
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onPhoto(await uploadAuctionPhoto(file, orgId))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const inputs = (
    <>
      {/* capture="environment" opens the rear camera on a phone or tablet; a computer gets a file picker */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={busy} onChange={(e) => onFile(e.target)} />
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => onFile(e.target)} />
    </>
  )

  if (photo) {
    return (
      <div className={compact ? 'flex flex-wrap items-center gap-3' : 'space-y-3'}>
        {inputs}
        <div className={`overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 ${compact ? 'h-24 w-24 shrink-0' : 'aspect-[4/3] w-full max-w-md rounded-2xl'}`}>
          <img src={photo} alt="Item photo" className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className={btn.outline}>
            {busy ? 'Uploading…' : 'Retake'}
          </button>
          <button type="button" disabled={busy} onClick={() => libraryRef.current?.click()} className={btn.outline}>
            Choose another
          </button>
          <button type="button" disabled={busy} onClick={() => onPhoto(null)} className={dangerBtn}>
            Remove
          </button>
        </div>
        <FormError>{error}</FormError>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {inputs}
      <button
        type="button"
        disabled={busy}
        onClick={() => cameraRef.current?.click()}
        className={`flex w-full max-w-md flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-blue/40 bg-brand-blue-50/60 px-4 text-brand-blue transition hover:bg-brand-blue-50 disabled:opacity-60 ${
          compact ? 'py-5' : 'py-10'
        }`}
      >
        <span className="font-display text-base font-extrabold">{busy ? 'Uploading…' : 'Take or upload a photo'}</span>
        <span className="text-sm font-semibold text-slate-600">Opens the camera on a phone; a file picker on a computer</span>
      </button>
      <button type="button" disabled={busy} onClick={() => libraryRef.current?.click()} className={btn.outline}>
        Choose a file instead
      </button>
      <FormError>{error}</FormError>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Item form                                                           */
/* ------------------------------------------------------------------ */

interface Draft {
  title: string
  description: string
  donated_by: string
  value: string // dollars as typed
  session: string
  is_published: boolean
  sort_order: string
  photo_url: string | null
  /** The company in the supplier / vendor list that gave it (update 27). Undefined = leave as it is. */
  donor_supplier_id?: string
  // Online bidding (update 35) — dollars as typed; blank = not set
  starting_bid: string
  bid_step: string
  buy_now: string
  ship: 'pickup' | 'ship'
  ship_fee: string
}

const emptyDraft: Draft = {
  title: '',
  description: '',
  donated_by: '',
  value: '',
  session: 'all-day',
  is_published: true,
  sort_order: '0',
  photo_url: null,
  starting_bid: '',
  bid_step: '',
  buy_now: '',
  ship: 'pickup',
  ship_fee: '',
}

function draftFrom(i: AuctionItem): Draft {
  return {
    title: i.title,
    description: i.description ?? '',
    donated_by: i.donated_by ?? '',
    value: centsToDollars(i.value_cents),
    session: i.session,
    is_published: i.is_published,
    sort_order: String(i.sort_order),
    photo_url: i.photo_url,
    // Only there once update 27 has run; until then the row has no such column.
    donor_supplier_id: 'donor_supplier_id' in i ? ((i as AuctionItem & { donor_supplier_id: string | null }).donor_supplier_id ?? '') : undefined,
    starting_bid: centsToDollars(i.starting_bid_cents),
    bid_step: centsToDollars(i.min_increment_cents),
    buy_now: centsToDollars(i.buy_now_cents),
    ship: i.ship_fee_cents == null ? 'pickup' : 'ship',
    ship_fee: i.ship_fee_cents == null ? '' : centsToDollars(i.ship_fee_cents),
  }
}

function draftToRow(d: Draft) {
  const sort = Number.parseInt(d.sort_order, 10)
  return {
    title: d.title.trim(),
    description: d.description.trim() || null,
    donated_by: d.donated_by.trim() || null,
    value_cents: dollarsToCents(d.value),
    session: d.session,
    is_published: d.is_published,
    sort_order: Number.isFinite(sort) ? sort : 0,
    photo_url: d.photo_url,
    ...(d.donor_supplier_id !== undefined ? { donor_supplier_id: d.donor_supplier_id || null } : {}),
  }
}

// The bidding columns (update 35). Null = unset; a blank shipping fee with
// "ships" chosen means free shipping ($0), pickup means null.
function draftToPrices(d: Draft): Record<(typeof AUCTION_PRICE_COLUMNS)[number], number | null> {
  return {
    starting_bid_cents: dollarsToCents(d.starting_bid),
    min_increment_cents: dollarsToCents(d.bid_step) || null,
    buy_now_cents: dollarsToCents(d.buy_now) || null,
    ship_fee_cents: d.ship === 'ship' ? (dollarsToCents(d.ship_fee) ?? 0) : null,
  }
}

/**
 * Save an item with its prices. Before update 35 the columns aren't there, so
 * the save is tried again without them and the caller is told.
 */
async function saveItemRow(
  write: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>,
  d: Draft,
): Promise<{ pricesSaved: boolean }> {
  const base = draftToRow(d)
  const first = await write({ ...base, ...draftToPrices(d) })
  if (!first.error) return { pricesSaved: true }
  if (!missingColumn(first.error)) throw first.error
  const second = await write(base)
  if (second.error) throw second.error
  return { pricesSaved: false }
}

/** The companies a "Given by" can name — null until update 27 has run (then the picker stays hidden). */
function useDonorCompanies(orgId: string): Supplier[] | null {
  const [list, setList] = useState<Supplier[] | null>(null)
  useEffect(() => {
    let live = true
    void (async () => {
      if (!orgId || !(await vendorRecordsReady())) return
      try {
        const all = await listSuppliers(orgId)
        if (live) setList(all)
      } catch {
        /* the picker simply stays hidden */
      }
    })()
    return () => {
      live = false
    }
  }, [orgId])
  return list
}

function ItemForm({
  initial,
  orgId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  orgId: string
  submitLabel: string
  onSubmit: (d: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const companies = useDonorCompanies(orgId)
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const pickCompany = (id: string) => {
    const name = companies?.find((c) => c.id === id)?.name
    // An empty "Donated by" takes the company's name; one already typed is left alone.
    setDraft((d) => ({ ...d, donor_supplier_id: id, donated_by: d.donated_by.trim() || !name ? d.donated_by : name }))
  }

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(draft)
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <span className="text-sm font-semibold text-slate-700">Photo</span>
        <div className="mt-1.5">
          <PhotoCapture orgId={orgId} photo={draft.photo_url} compact onPhoto={(photo_url) => setDraft((d) => ({ ...d, photo_url }))} />
        </div>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Title
        <input className={staffInput} required value={draft.title} onChange={set('title')} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Description
        <textarea className={staffInput} rows={3} value={draft.description} onChange={set('description')} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Donated by <span className="font-normal text-slate-500">(visitors see this)</span>
          <input className={staffInput} value={draft.donated_by} onChange={set('donated_by')} />
        </label>
        {companies && (
          <label className="block text-sm font-semibold text-slate-700">
            Given by (company) <span className="font-normal text-slate-500">· optional, team only</span>
            <select className={staffInput} value={draft.donor_supplier_id ?? ''} onChange={(e) => pickCompany(e.target.value)}>
              <option value="">— not a company in our list —</option>
              {companies.some((c) => c.is_vendor) && (
                <optgroup label="BunFest vendors">
                  {companies
                    .filter((c) => c.is_vendor)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              )}
              {companies.some((c) => !c.is_vendor) && (
                <optgroup label="Suppliers and others">
                  {companies
                    .filter((c) => !c.is_vendor)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">Puts the item on that company’s card under “Given to OHRR”.</span>
          </label>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Value ($)
          <input className={staffInput} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={draft.value} onChange={set('value')} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Session
          <select className={staffInput} value={draft.session} onChange={set('session')}>
            {AUCTION_SESSIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-sm font-extrabold uppercase tracking-wider text-slate-600">Online bidding</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold text-slate-700">
            Starting bid ($)
            <input className={staffInput} type="number" inputMode="decimal" min="0" step="0.01" placeholder="One bid step" value={draft.starting_bid} onChange={set('starting_bid')} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Bid step ($)
            <input className={staffInput} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="Auction default" value={draft.bid_step} onChange={set('bid_step')} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Buy Now price ($) <span className="font-normal text-slate-500">optional</span>
            <input className={staffInput} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="No Buy Now" value={draft.buy_now} onChange={set('buy_now')} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Getting it to the winner
            <select className={staffInput} value={draft.ship} onChange={(e) => setDraft((d) => ({ ...d, ship: e.target.value === 'ship' ? 'ship' : 'pickup' }))}>
              <option value="pickup">Pickup only (at BunFest)</option>
              <option value="ship">Can be shipped</option>
            </select>
          </label>
          {draft.ship === 'ship' && (
            <label className="block text-sm font-semibold text-slate-700">
              Shipping fee ($) <span className="font-normal text-slate-500">blank = free</span>
              <input className={staffInput} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={draft.ship_fee} onChange={set('ship_fee')} />
            </label>
          )}
        </div>
        <p className="text-xs leading-relaxed text-slate-500">Bidding itself is switched on in the “Online bidding” panel. A blank starting bid means the first bid is one bid step.</p>
      </fieldset>

      <div className="flex flex-wrap items-end gap-4">
        <label className="block w-32 text-sm font-semibold text-slate-700">
          Sort order
          <input className={staffInput} type="number" inputMode="numeric" step="1" value={draft.sort_order} onChange={set('sort_order')} />
        </label>
        <label className="flex items-center gap-2 pb-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-brand-blue"
            checked={draft.is_published}
            onChange={(e) => setDraft((d) => ({ ...d, is_published: e.target.checked }))}
          />
          Show in the app and on the website
        </label>
      </div>

      <FormError>{error}</FormError>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || draft.title.trim().length === 0} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={cancelBtn}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* Add flow: photo first, then details                                 */
/* ------------------------------------------------------------------ */

function AddItem({
  orgId,
  nextSortOrder,
  onCreate,
  onCancel,
}: {
  orgId: string
  nextSortOrder: number
  onCreate: (d: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [step, setStep] = useState<'photo' | 'details'>('photo')
  const [photo, setPhoto] = useState<string | null>(null)

  if (step === 'photo') {
    return (
      <Card className="space-y-3">
        <p className="font-display text-lg font-extrabold text-ink">New item — photo first</p>
        <PhotoCapture orgId={orgId} photo={photo} onPhoto={setPhoto} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStep('details')} className={btn.orange}>
            {photo ? 'Continue' : 'Continue without a photo'}
          </button>
          <button type="button" onClick={onCancel} className={cancelBtn}>
            Cancel
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <p className="mb-3 font-display text-lg font-extrabold text-ink">New item — details</p>
      <ItemForm initial={{ ...emptyDraft, photo_url: photo, sort_order: String(nextSortOrder) }} orgId={orgId} submitLabel="Add item" onSubmit={onCreate} onCancel={onCancel} />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Item card (list)                                                    */
/* ------------------------------------------------------------------ */

function ItemCard({
  item,
  orgId,
  isFirst,
  isLast,
  onChanged,
  onMove,
}: {
  item: AuctionItem
  orgId: string
  isFirst: boolean
  isLast: boolean
  onChanged: () => void
  onMove: (dir: -1 | 1) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = async (values: Partial<AuctionItem>) => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('raffle_items').update(values).eq('id', item.id)
    if (error) setError(errMessage(error))
    setBusy(false)
    if (!error) onChanged()
  }

  const saveEdit = async (d: Draft) => {
    const { pricesSaved } = await saveItemRow((row) => supabase.from('raffle_items').update(row).eq('id', item.id), d)
    setEditing(false)
    if (!pricesSaved) setError('Saved — but the bidding prices need update 35 in the database first.')
    onChanged()
  }

  const doDelete = async () => {
    setBusy(true)
    const { error } = await supabase.from('raffle_items').delete().eq('id', item.id)
    if (error) {
      setError(errMessage(error))
      setBusy(false)
      setConfirmDelete(false)
      return
    }
    onChanged()
  }

  const move = async (dir: -1 | 1) => {
    setBusy(true)
    setError(null)
    try {
      await onMove(dir)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <Card>
        <ItemForm initial={draftFrom(item)} orgId={orgId} submitLabel="Save changes" onSubmit={saveEdit} onCancel={() => setEditing(false)} />
      </Card>
    )
  }

  const won = item.status === 'won'
  const value = formatValue(item.value_cents)
  // A sale made by the system (a closed bid, Buy Now or the desk): the desk owns it now.
  const sold = won && Boolean(item.won_kind)
  const bidding = hasBiddingColumns(item)
  const bidCount = item.bid_count ?? 0

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <ItemPhoto title={item.title} photo={item.photo_url} initialClassName="text-3xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 font-display text-lg font-extrabold text-ink">{item.title}</h3>
            {value && <span className="shrink-0 text-base font-bold text-emerald-700">{value}</span>}
          </div>
          {item.donated_by && <p className="mt-0.5 text-sm font-semibold text-slate-600">Donated by {item.donated_by}</p>}
          {item.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description}</p>}
          {bidding && (
            <p className="mt-1 text-sm text-slate-700">
              {item.current_bid_cents != null ? (
                <>
                  <strong className="text-ink">
                    {sold ? 'Sold for' : 'Current bid'} {formatValue(item.current_bid_cents)}
                  </strong>
                  {' · '}
                  {bidCount} bid{bidCount === 1 ? '' : 's'}
                  {item.high_bidder_no != null && <> · Bidder #{item.high_bidder_no}{sold ? ' won' : ' is high'}</>}
                </>
              ) : (
                <>
                  No bids yet{item.starting_bid_cents ? ` · starts at ${formatValue(item.starting_bid_cents)}` : ''}
                </>
              )}
              {item.buy_now_cents != null && <> · Buy Now {formatValue(item.buy_now_cents)}</>}
              {' · '}
              {item.ship_fee_cents == null ? 'Pickup only' : item.ship_fee_cents === 0 ? 'Ships free' : `Ships +${formatValue(item.ship_fee_cents)}`}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sold ? (
              <Badge tone="orange">Sold{item.won_kind === 'buy_now' ? ' — Buy Now' : item.won_kind === 'desk' ? ' — at the desk' : ' — closing bid'}</Badge>
            ) : won ? (
              <Badge tone="orange">Won</Badge>
            ) : (
              <Badge tone="blue">Available</Badge>
            )}
            {!item.is_published && <Badge tone="slate">Hidden</Badge>}
            <Badge tone="slate">{sessionLabel(item.session)}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            aria-label={`Move ${item.title} up`}
            disabled={busy || isFirst}
            onClick={() => move(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <Icon name="chevron" size={18} className="-rotate-90" />
          </button>
          <button
            type="button"
            aria-label={`Move ${item.title} down`}
            disabled={busy || isLast}
            onClick={() => move(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <Icon name="chevron" size={18} className="rotate-90" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sold ? (
          <Link to="/staff/auction/desk" className={btn.outline}>
            See the sale at the desk
          </Link>
        ) : won ? (
          <button type="button" disabled={busy} onClick={() => patch({ status: 'available' })} className={btn.outline}>
            Back to available
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => patch({ status: 'won' })} className={`${btn.orange} disabled:opacity-60`}>
            Mark won
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => patch({ is_published: !item.is_published })} className={btn.outline}>
          {item.is_published ? 'Unpublish' : 'Publish'}
        </button>
        <button type="button" onClick={() => setEditing(true)} className={btn.outline}>
          Edit
        </button>
        {confirmDelete ? (
          <>
            <button type="button" onClick={doDelete} disabled={busy} className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {busy ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={cancelBtn}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={dangerBtn}>
            Delete
          </button>
        )}
      </div>
      <FormError>{error}</FormError>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Auction setup panel                                                 */
/* ------------------------------------------------------------------ */

function SetupPanel({
  orgId,
  settings,
  canManageSettings,
  onSaved,
}: {
  orgId: string
  settings: AuctionSettings | null
  canManageSettings: boolean
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [morning, setMorning] = useState('')
  const [afternoon, setAfternoon] = useState('')
  const [intro, setIntro] = useState('')
  // Raffle tickets (dollars / counts as typed; blank = not set)
  const [ticketPrice, setTicketPrice] = useState('')
  const [bundleQty, setBundleQty] = useState('')
  const [bundlePrice, setBundlePrice] = useState('')
  const [raffleDetails, setRaffleDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setMorning(isoToEventTime(settings?.morning_closes_at))
    setAfternoon(isoToEventTime(settings?.afternoon_closes_at))
    setIntro(settings?.intro_text ?? '')
    setTicketPrice(centsToDollars(settings?.raffle_ticket_price_cents))
    setBundleQty(settings?.raffle_bundle_qty ? String(settings.raffle_bundle_qty) : '')
    setBundlePrice(centsToDollars(settings?.raffle_bundle_price_cents))
    setRaffleDetails(settings?.raffle_details ?? '')
    setError(null)
    setEditing(true)
  }

  const save = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const qty = Number.parseInt(bundleQty, 10)
    const bundle_qty = Number.isFinite(qty) && qty >= 2 ? qty : null
    const bundle_price = dollarsToCents(bundlePrice)
    if ((bundle_qty === null) !== (bundle_price === null)) {
      setBusy(false)
      setError('Enter both the bundle quantity (2 or more) and the bundle price, or leave both blank.')
      return
    }
    const { error } = await supabase.from('auction_settings').upsert(
      {
        org_id: orgId,
        event_slug: AUCTION_EVENT_SLUG,
        morning_closes_at: eventTimeToIso(morning),
        afternoon_closes_at: eventTimeToIso(afternoon),
        intro_text: intro.trim() || null,
        raffle_ticket_price_cents: dollarsToCents(ticketPrice),
        raffle_bundle_qty: bundle_qty,
        raffle_bundle_price_cents: bundle_price,
        raffle_details: raffleDetails.trim() || null,
      },
      { onConflict: 'org_id,event_slug' },
    )
    setBusy(false)
    if (error) {
      setError(errMessage(error))
      return
    }
    setEditing(false)
    onSaved()
  }

  const morningLabel = formatEventTime(settings?.morning_closes_at)
  const afternoonLabel = formatEventTime(settings?.afternoon_closes_at)
  const priceLabel = rafflePriceLine(settings)

  return (
    <section className="space-y-2.5">
      <SectionLabel>Auction setup</SectionLabel>
      <Card className="space-y-3">
        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <p className="text-sm leading-relaxed text-slate-600">
              Close times are on BunFest day (Oct 25, 2026), Eastern time. Visitors see the session names on each item, not these
              times.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Morning closes
                <input className={staffInput} type="time" value={morning} onChange={(e) => setMorning(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Afternoon closes
                <input className={staffInput} type="time" value={afternoon} onChange={(e) => setAfternoon(e.target.value)} />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Intro line (optional)
              <input className={staffInput} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Shown at the top of the public catalog" />
            </label>

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div>
                <p className="font-display text-lg font-extrabold text-ink">Raffle tickets</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  Shown on the BunFest raffle page. Leave a price blank and the app shows no price at all — nothing is assumed.
                </p>
              </div>
              <label className="block max-w-xs text-sm font-semibold text-slate-700">
                Ticket price ($ each)
                <input className={staffInput} type="number" inputMode="decimal" min="0" step="0.01" placeholder="Not set" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Bundle quantity
                  <input className={staffInput} type="number" inputMode="numeric" min="2" step="1" placeholder="e.g. 6" value={bundleQty} onChange={(e) => setBundleQty(e.target.value)} />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Bundle price ($)
                  <input className={staffInput} type="number" inputMode="decimal" min="0" step="0.01" placeholder="Not set" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Raffle details (optional)
                <textarea
                  className={staffInput}
                  rows={3}
                  value={raffleDetails}
                  onChange={(e) => setRaffleDetails(e.target.value)}
                  placeholder="Where tickets are sold, drawing time, how winners are notified"
                />
              </label>
            </div>

            <FormError>{error}</FormError>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
                {busy ? 'Saving…' : 'Save setup'}
              </button>
              <button type="button" onClick={() => setEditing(false)} disabled={busy} className={cancelBtn}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-base">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Morning closes</p>
                <p className="mt-0.5 font-semibold text-ink">{morningLabel ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Afternoon closes</p>
                <p className="mt-0.5 font-semibold text-ink">{afternoonLabel ?? 'Not set'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Intro line</p>
              <p className="mt-0.5 text-base text-slate-700">
                {settings?.intro_text?.trim() || <span className="text-slate-600">None — the catalog shows items only</span>}
              </p>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Raffle tickets</p>
              <p className="text-base font-semibold text-ink">
                {priceLabel ?? <span className="font-normal text-slate-600">Price not set — the app shows no price</span>}
              </p>
              <p className="whitespace-pre-line text-base text-slate-700">{settings?.raffle_details?.trim() || <span className="text-slate-600">No details yet</span>}</p>
              <p className="text-sm leading-relaxed text-slate-600">
                The in-app ticket reservation form appears on the raffle page only while switched on in{' '}
                {canManageSettings ? (
                  <Link to="/staff/features" className="font-bold text-brand-blue hover:text-brand-blue-dark">
                    Features
                  </Link>
                ) : (
                  <span>Features (Founders and Developers)</span>
                )}
                . Tickets are sold and drawn under{' '}
                <Link to="/staff/raffle-tickets" className="font-bold text-brand-blue hover:text-brand-blue-dark">
                  Raffle tickets
                </Link>
                .
              </p>
            </div>
            <div>
              <button type="button" onClick={startEdit} className={btn.outline}>
                {settings ? 'Edit setup' : 'Set up'}
              </button>
            </div>
          </>
        )}
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Online bidding panel (update 35)                                    */
/* ------------------------------------------------------------------ */

type Health = Awaited<ReturnType<typeof auctionApi.health>>

// Is the payment server (the website's /api/auction) set up? Plain words, no secrets.
function PaymentServerLine() {
  const [health, setHealth] = useState<Health | undefined>(undefined)
  useEffect(() => {
    let live = true
    void auctionApi.health().then((h) => {
      if (live) setHealth(h)
    })
    return () => {
      live = false
    }
  }, [])
  if (health === undefined) return <p className="text-sm text-slate-500">Checking the payment server…</p>
  if (!health) {
    return (
      <p className="text-sm leading-relaxed text-slate-700">
        <strong>Payment server:</strong> could not be reached from here. On the live website it runs next to the site (Cloudflare Pages); a
        local copy of the site cannot see it.
      </p>
    )
  }
  const ok = health.stripe && health.webhook && health.supabase
  return (
    <div className="space-y-1 text-sm leading-relaxed text-slate-700">
      <p>
        <strong>Payment server:</strong> {ok ? 'ready' : 'not fully set up'} —{' '}
        {health.stripe ? `Stripe ${health.stripe_mode === 'live' ? 'LIVE' : 'test'} key set` : 'Stripe secret key missing'} ·{' '}
        {health.webhook ? 'webhook set' : 'webhook secret missing'} · {health.supabase ? 'database key set' : 'database key missing'}
      </p>
      {!ok && (
        <p className="text-slate-600">
          These are set in Cloudflare Pages → the website project → Settings → Environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
          and SUPABASE_SERVICE_ROLE_KEY. Never paste them anywhere on this page.
        </p>
      )}
      {health.stripe && health.stripe_mode === 'test' && <p className="text-slate-600">Test mode: cards are not really charged. Switch to the live keys before BunFest.</p>}
    </div>
  )
}

function BiddingPanel({ orgId, settings, onSaved }: { orgId: string; settings: AuctionSettings | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [opensAt, setOpensAt] = useState('')
  const [extend, setExtend] = useState('5')
  const [step, setStep] = useState('5')
  const [pk, setPk] = useState('')
  const [biddingNote, setBiddingNote] = useState('')
  const [pickupNote, setPickupNote] = useState('')
  const [shippingNote, setShippingNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Before update 35 the settings row has no bidding_enabled column.
  const ready = settings ? 'bidding_enabled' in settings : null

  const startEdit = () => {
    setEnabled(Boolean(settings?.bidding_enabled))
    setOpensAt(isoToEventDateTime(settings?.bidding_opens_at))
    setExtend(String(settings?.extend_minutes ?? 5))
    setStep(centsToDollars(settings?.default_increment_cents ?? 500))
    setPk(settings?.stripe_publishable_key ?? '')
    setBiddingNote(settings?.bidding_note ?? '')
    setPickupNote(settings?.pickup_note ?? '')
    setShippingNote(settings?.shipping_note ?? '')
    setError(null)
    setEditing(true)
  }

  const save = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    const key = pk.trim()
    if (key && !/^pk_(live|test)_/.test(key)) {
      setError('That is not a publishable key. It starts with pk_live_ or pk_test_. (The secret key, sk_…, never goes here.)')
      return
    }
    if (key.startsWith('sk_')) {
      setError('That is the SECRET key. Never paste it here — it belongs in Cloudflare only.')
      return
    }
    const stepCents = dollarsToCents(step)
    if (!stepCents) {
      setError('Enter a default bid step of at least $0.01.')
      return
    }
    const ext = Number.parseInt(extend, 10)
    if (!Number.isFinite(ext) || ext < 0 || ext > 60) {
      setError('“Going once” is 0 to 60 minutes.')
      return
    }
    if (enabled && !key) {
      setError('To switch bidding on, add the Stripe publishable key first.')
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('auction_save_settings', {
      p_org: orgId,
      p_event: AUCTION_EVENT_SLUG,
      p_patch: {
        bidding_enabled: enabled,
        bidding_opens_at: eventDateTimeToIso(opensAt) ?? '',
        extend_minutes: ext,
        default_increment_cents: stepCents,
        stripe_publishable_key: key,
        bidding_note: biddingNote.trim(),
        pickup_note: pickupNote.trim(),
        shipping_note: shippingNote.trim(),
      },
    })
    setBusy(false)
    if (error) {
      setError(missingFunction(error) ? 'Online bidding is not in the database yet — run update 35 (RUN-THIS-IN-SUPABASE.sql) first.' : errMessage(error))
      return
    }
    setEditing(false)
    onSaved()
  }

  const keyShown = settings?.stripe_publishable_key ? `${settings.stripe_publishable_key.slice(0, 12)}…` : null

  return (
    <section className="space-y-2.5">
      <SectionLabel>Online bidding</SectionLabel>
      <Card className="space-y-3">
        {ready === false && (
          <p className="rounded-xl bg-brand-orange-50 px-3 py-2 text-sm leading-relaxed text-slate-800">
            Online bidding needs <strong>update 35</strong> in the database (RUN-THIS-IN-SUPABASE.sql). Until it is run this panel cannot save.
          </p>
        )}
        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <label className="flex items-center gap-3 text-base font-semibold text-slate-700">
              <input type="checkbox" className="h-6 w-6 rounded border-slate-300 accent-brand-blue" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Online bidding is on (people can register, bid and Buy Now)
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-slate-700">
                Bidding opens <span className="font-normal text-slate-500">optional, Eastern</span>
                <input className={staffInput} type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Going once: extend by (minutes)
                <input className={staffInput} type="number" inputMode="numeric" min="0" max="60" step="1" value={extend} onChange={(e) => setExtend(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Default bid step ($)
                <input className={staffInput} type="number" inputMode="decimal" min="0.01" step="0.01" value={step} onChange={(e) => setStep(e.target.value)} />
              </label>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              A bid in the last few minutes pushes that item’s close out by the same number of minutes (0 switches this off). Items close at
              their session’s time, set in Auction setup.
            </p>
            <label className="block text-sm font-semibold text-slate-700">
              Stripe publishable key
              <input className={`${staffInput} font-mono`} value={pk} onChange={(e) => setPk(e.target.value)} placeholder="pk_live_… or pk_test_…" autoComplete="off" spellCheck={false} />
            </label>
            <p className="text-xs leading-relaxed text-slate-500">
              From Stripe → Developers → API keys, the <strong>Publishable key</strong> (pk_…). It is safe to be public. The <strong>Secret key</strong>{' '}
              (sk_…) never goes here — it goes in Cloudflare, next to the website, as STRIPE_SECRET_KEY.
            </p>
            <label className="block text-sm font-semibold text-slate-700">
              Bidding note <span className="font-normal text-slate-500">shown on the catalog and when registering</span>
              <textarea className={staffInput} rows={2} value={biddingNote} onChange={(e) => setBiddingNote(e.target.value)} placeholder="e.g. Winners are charged when their item closes. Questions: ohrrcontact@…" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Pickup note
                <textarea className={staffInput} rows={2} value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} placeholder="Where and when to collect at BunFest" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Shipping note
                <textarea className={staffInput} rows={2} value={shippingNote} onChange={(e) => setShippingNote(e.target.value)} placeholder="e.g. Ships within two weeks after BunFest, US only" />
              </label>
            </div>
            <FormError>{error}</FormError>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
                {busy ? 'Saving…' : 'Save online bidding'}
              </button>
              <button type="button" onClick={() => setEditing(false)} disabled={busy} className={cancelBtn}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {settings?.bidding_enabled ? <Badge tone="orange">Bidding is ON</Badge> : <Badge tone="slate">Bidding is off — catalog is a preview</Badge>}
              {settings?.bidding_opens_at && <Badge tone="blue">Opens {formatEventDateTime(settings.bidding_opens_at)}</Badge>}
            </div>
            <div className="grid gap-3 text-base sm:grid-cols-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Going once</p>
                <p className="mt-0.5 font-semibold text-ink">{settings?.extend_minutes ? `${settings.extend_minutes} min` : settings?.extend_minutes === 0 ? 'Off' : 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Default bid step</p>
                <p className="mt-0.5 font-semibold text-ink">{settings?.default_increment_cents ? formatValue(settings.default_increment_cents) : 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Stripe publishable key</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{keyShown ?? <span className="font-sans text-slate-600">Not set</span>}</p>
              </div>
            </div>
            {(settings?.bidding_note || settings?.pickup_note || settings?.shipping_note) && (
              <div className="space-y-1 text-sm text-slate-700">
                {settings?.bidding_note && (
                  <p>
                    <strong>Bidding:</strong> {settings.bidding_note}
                  </p>
                )}
                {settings?.pickup_note && (
                  <p>
                    <strong>Pickup:</strong> {settings.pickup_note}
                  </p>
                )}
                {settings?.shipping_note && (
                  <p>
                    <strong>Shipping:</strong> {settings.shipping_note}
                  </p>
                )}
              </div>
            )}
            <PaymentServerLine />
            <FormError>{error}</FormError>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startEdit} className={btn.outline}>
                {ready ? 'Edit online bidding' : 'Set up online bidding'}
              </button>
              <Link to="/staff/auction/desk" className={btn.blue}>
                Open the auction desk
              </Link>
              <Link to="/bunfest/silent-auction" className={cancelBtn}>
                See the public catalog
              </Link>
            </div>
          </>
        )}
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SilentAuctionManager() {
  const { user, membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const allowed = can('events.bunfest.manage')
  // The Silent Auction switch (Staff → Features): off = hidden from the public, bidding closed.
  const switchedOn = useFeature(SILENT_AUCTION_FLAG)

  const [items, setItems] = useState<AuctionItem[]>([])
  const [settings, setSettings] = useState<AuctionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const [itemsRes, settingsRes] = await Promise.all([
      supabase.from('raffle_items').select('*').eq('org_id', orgId).eq('event_slug', AUCTION_EVENT_SLUG).order('sort_order').order('title'),
      supabase.from('auction_settings').select('*').eq('org_id', orgId).eq('event_slug', AUCTION_EVENT_SLUG).maybeSingle(),
    ])
    if (itemsRes.error) {
      setError(errMessage(itemsRes.error))
      setLoading(false)
      return
    }
    setItems(sortForStaff((itemsRes.data ?? []) as AuctionItem[]))
    setSettings((settingsRes.data as AuctionSettings | null) ?? null)
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (d: Draft) => {
    const { pricesSaved } = await saveItemRow(
      (row) => supabase.from('raffle_items').insert({ org_id: orgId, event_slug: AUCTION_EVENT_SLUG, ...row, created_by: userId }),
      d,
    )
    setCreating(false)
    if (!pricesSaved) setError('Item added — but its bidding prices need update 35 in the database first.')
    await load()
  }

  // Swap with the neighbour, then renumber every row whose position changed so
  // items that shared a sort_order (e.g. all 0) actually move.
  const move = async (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === id)
    const to = idx + dir
    if (idx < 0 || to < 0 || to >= items.length) return
    const next = [...items]
    ;[next[idx], next[to]] = [next[to], next[idx]]
    const updates = next.map((item, sort_order) => ({ item, sort_order })).filter(({ item, sort_order }) => item.sort_order !== sort_order)
    const results = await Promise.all(updates.map(({ item, sort_order }) => supabase.from('raffle_items').update({ sort_order }).eq('id', item.id)))
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error
    await load()
  }

  if (!allowed) {
    return (
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Silent Auction</h1>
        <p className="mt-3 text-sm text-slate-600">
          You don’t have access to manage the Silent Auction. An owner or admin can grant the “Manage Midwest BunFest info” capability.
        </p>
      </div>
    )
  }

  const nextSortOrder = items.reduce((max, i) => Math.max(max, i.sort_order), -1) + 1
  const availableCount = items.filter((i) => i.status === 'available' && i.is_published).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Silent Auction</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Items appear in the BunFest app and on this website’s Silent Auction page while they’re published. Mark items won as the day goes.
          </p>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={btn.orange}>
            <Icon name="award" size={16} className="mr-1.5" /> Add an item
          </button>
        )}
      </div>

      {creating && <AddItem orgId={orgId} nextSortOrder={nextSortOrder} onCreate={create} onCancel={() => setCreating(false)} />}

      {!switchedOn.loading && !switchedOn.on && (
        <p role="note" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-base font-semibold leading-relaxed text-amber-900">
          The Silent Auction is switched off, so visitors don’t see it on the app, the website or the BunFest site, and online bidding stays
          closed. You can still get the items ready here. A Founder or Developer switches it on in{' '}
          {canSwitchFeatures(membership) ? (
            <Link to="/staff/features" className="font-bold text-brand-blue underline underline-offset-4">
              Features
            </Link>
          ) : (
            'Features'
          )}
          .
        </p>
      )}

      {!loading && <SetupPanel orgId={orgId} settings={settings} canManageSettings={canSwitchFeatures(membership)} onSaved={() => void load()} />}
      {!loading && <BiddingPanel orgId={orgId} settings={settings} onSaved={() => void load()} />}

      <FormError>{error}</FormError>

      {loading ? (
        <Spinner label="Loading items…" />
      ) : items.length === 0 ? (
        <Card className="border-slate-200 bg-slate-50/80 text-center">
          <p className="text-sm leading-relaxed text-slate-600">No items yet. Choose “Add an item” to photograph the first one — visitors see it in the BunFest app right away.</p>
        </Card>
      ) : (
        <section className="space-y-2.5">
          <SectionLabel>
            Items · {items.length} total · {availableCount} available in the app
          </SectionLabel>
          <div className="grid grid-cols-1 gap-3">
            {items.map((item, i) => (
              <ItemCard key={item.id} item={item} orgId={orgId} isFirst={i === 0} isLast={i === items.length - 1} onChanged={() => void load()} onMove={(dir) => move(item.id, dir)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
