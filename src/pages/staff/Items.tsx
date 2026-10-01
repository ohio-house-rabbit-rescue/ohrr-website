// Items — the desktop mirror of the app's Items list: everything with an OHRR
// code, whether a donation still to sort, an auction lot, a raffle prize or
// shop stock. Reads and writes through the same RPCs (list_tagged_items /
// save_scanned_item / …), so an edit here shows on a phone immediately and
// vice-versa. Update 36 adds "Add a donation" (the database makes the code),
// "Move to…" for sorting a donation into the auction, the raffle or the shop
// under the same code, and the label printer (/staff/items/labels). Update 39
// adds the details a donation can carry: how many, a price for one, condition,
// what sort of thing and where it's kept (the same fields as the app's
// Catalog donations).
//
// Update 40 (donation intake): Add a donation starts with who it is from (a
// drop-off, for the thank-you letter), then each item: photos, name, how
// many, a value for each or for all, and where it's headed. The list sorts
// donations by where they're headed, moves all of one kind in one go, splits
// a lot, makes baskets, and marks things used for the rabbits or passed on.
// Shop stock bought from a supplier is added in Hop Shop inventory only.
// /staff/items?add=1 brings the Add a donation form into view and focuses it.
// From Scan an item (2026-10-01): /staff/items?add=1&code=XXXXX fills that
// label's code into Add a donation (the new donation gets it), and
// /staff/items?code=XXXXX opens that item's edit panel. Photos can be dropped
// onto Add a donation and the photo editor, as well as chosen.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner, shortDate, todayOhio } from '../../lib/staff'
import { uploadItemPhoto } from '../../lib/hopshop'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import {
  CATEGORY_IDEAS,
  CONDITIONS,
  HEADED_FOR,
  KIND_META,
  MAX_ITEM_PHOTOS,
  SORT_INTO,
  UPDATE_36_NOTE,
  UPDATE_39_ADD_NOTE,
  UPDATE_39_EXTRAS_NOTE,
  UPDATE_40_ADD_NOTE,
  catalogNewItem,
  catalogSuggestions,
  conditionLabel,
  donationValues,
  extrasSummary,
  has40,
  hasDetails,
  isMissingFunction,
  isNeeds40,
  itemPhotos,
  listDropoffs,
  listItems,
  makeBasket,
  money,
  recentDonors,
  saveItem,
  setDonationOutcome,
  setDonationPlan,
  setItemExtras,
  setItemPhotos,
  sortHeadedDonations,
  splitDonation,
  startDropoff,
  statusLabel,
  toCents,
  dueSoon,
  valueLine,
  type DonationPlan,
  type Dropoff,
  type HeadedFor,
  type ItemKind,
  type TaggedItem,
} from '../../lib/items'
import { dropoffName, loadCurrentDropoff, saveCurrentDropoff } from '../../lib/donations'
import { normalizeCode } from '../../lib/codes'
import PhotoDrop, { fileFocus } from '../../components/PhotoDrop'

/** Recent places and categories (update 39; empty lists before it). */
type Suggestions = { locations: string[]; categories: string[] }

/** Newest first, no repeats (ignoring case), at most `max`. */
const bump = (list: string[], v: string, max: number) => {
  const t = v.trim()
  return t ? [t, ...list.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, max) : list
}

/** Dollars for a money box ("5", "12.50"), or empty. */
const dollars = (c: number | null | undefined) => (c == null ? '' : c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2))

type Filter = 'all' | ItemKind
// Donations first: they are the pile on the desk.
const FILTERS: Filter[] = ['donation', 'all', 'auction', 'raffle', 'stock']

/** The donations, by where they're headed (update 40). */
type DonationView = 'waiting' | 'unsure' | HeadedFor | 'done'
const DONATION_VIEWS: { v: DonationView; label: string }[] = [
  { v: 'waiting', label: 'All waiting' },
  { v: 'unsure', label: 'Not sure yet' },
  { v: 'raffle', label: 'Raffle' },
  { v: 'auction', label: 'Silent Auction' },
  { v: 'shop', label: 'Hop Shop' },
  { v: 'rabbits', label: 'For the rabbits' },
  { v: 'done', label: 'Done' },
]

function inView(it: TaggedItem, v: DonationView): boolean {
  if (it.kind !== 'donation') return false
  if (v === 'done') return Boolean(it.outcome)
  if (it.outcome) return false
  if (v === 'waiting') return true
  if (v === 'unsure') return !it.headed_for
  return it.headed_for === v
}

/** "the raffle", for "Move all 3 to the raffle". */
const PLACE_NAME: Record<'raffle' | 'auction' | 'shop', string> = { raffle: 'the raffle', auction: 'the Silent Auction', shop: 'the Hop Shop' }

type Panel = { id: string; kind: 'move' | 'edit' | 'split' } | null

const chip = (on: boolean) =>
  `min-h-11 rounded-full px-4 text-sm font-bold transition ${on ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-blue'}`

const smallBtn =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand-blue disabled:opacity-60'

const linkClass = 'font-bold text-brand-blue underline-offset-2 hover:underline'

export default function Items() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const canAuction = can('events.bunfest.manage')
  const canStock = can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')
  const canAddStock = can('hopshop.products.create')
  const canDonations = canAuction || canStock
  const [items, setItems] = useState<TaggedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<ReactNode>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<DonationView>('waiting')
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [suggestions, setSuggestions] = useState<Suggestions>({ locations: [], categories: [] })
  // A message under one row (an outcome that didn't go, update 40 not run).
  const [rowNote, setRowNote] = useState<{ id: string; text: string } | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [basketMode, setBasketMode] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // ?add=1 (the dashboard's "Add a donation"): bring the form into view, focused.
  // ?add=1&code=X (Scan an item, a new label): the same, with that code filled in.
  // ?code=X (Scan an item, "Open it"): open that item's edit panel.
  const [params, setParams] = useSearchParams()
  const wantsAdd = params.get('add') === '1'
  const codeParam = params.get('code')
  const [focusAdd, setFocusAdd] = useState(0)
  const [addCode, setAddCode] = useState<string | null>(null)
  const [openCode, setOpenCode] = useState<string | null>(null)
  // The item opened from a scan: outlined, scrolled to and focused.
  const [spot, setSpot] = useState<string | null>(null)

  const load = async () => {
    try {
      setItems(await listItems(orgId))
    } catch (e) {
      setError(errMessage(e))
    }
  }
  useEffect(() => {
    if (orgId) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])
  useEffect(() => {
    if (!orgId) return
    let alive = true
    void catalogSuggestions(orgId).then((s) => alive && setSuggestions(s))
    return () => {
      alive = false
    }
  }, [orgId])
  // Read once, then drop it, so a reload doesn't jump to the form again.
  useEffect(() => {
    if (!wantsAdd && !codeParam) return
    const code = codeParam ? normalizeCode(codeParam) : ''
    if (wantsAdd) {
      setAddCode(code || null)
      setFocusAdd((n) => n + 1)
    } else if (code) {
      setOpenCode(code)
    }
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.delete('add')
        next.delete('code')
        return next
      },
      { replace: true },
    )
  }, [wantsAdd, codeParam, setParams])

  // ?code=X: once the list is in, open that item (or say nothing has the code).
  useEffect(() => {
    if (!openCode || !items) return
    setOpenCode(null)
    const it = items.find((i) => normalizeCode(i.code) === openCode)
    if (!it) {
      setNote(
        <>
          Nothing here has the code <span className="font-mono font-bold tracking-widest">{openCode}</span>.{' '}
          <Link to={`/staff/scan?code=${encodeURIComponent(openCode)}`} className={linkClass}>
            Look it up in Scan an item
          </Link>
        </>,
      )
      return
    }
    setFilter('all')
    setQ('')
    setBasketMode(false)
    if (mayEdit(it)) setPanel({ id: it.tag_id, kind: 'edit' })
    setSpot(it.tag_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCode, items])
  useEffect(() => {
    if (!spot) return
    const el = document.getElementById(`item-${spot}`)
    el?.scrollIntoView({ block: 'start', behavior: 'instant' })
    el?.focus({ preventScroll: true })
  }, [spot])

  // A place or sort of thing just typed goes to the front of its chips.
  const used = (it: TaggedItem) =>
    setSuggestions((s) => ({ locations: bump(s.locations, it.location ?? '', 10), categories: bump(s.categories, it.category ?? '', 12) }))

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (items ?? []).filter(
      (i) =>
        (filter === 'all' || i.kind === filter) &&
        (filter !== 'donation' || inView(i, view)) &&
        (!n || i.title.toLowerCase().includes(n) || i.code.toLowerCase().includes(n) || (i.donated_by ?? '').toLowerCase().includes(n)),
    )
  }, [items, filter, view, q])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, donation: 0, auction: 0, raffle: 0, stock: 0 }
    for (const i of items ?? []) {
      c.all++
      if (i.kind in c) c[i.kind]++
    }
    return c
  }, [items])

  const viewCounts = useMemo(() => {
    const c = Object.fromEntries(DONATION_VIEWS.map((d) => [d.v, 0])) as Record<DonationView, number>
    for (const i of items ?? []) for (const d of DONATION_VIEWS) if (inView(i, d.v)) c[d.v]++
    return c
  }, [items])

  const swap = (it: TaggedItem) => setItems((list) => (list ?? []).map((x) => (x.tag_id === it.tag_id ? it : x)))

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    setError(null)
    const { data, error } = await supabase.rpc(fn, args)
    if (error) {
      setError(errMessage(error))
      return
    }
    if (data) swap(data as TaggedItem)
  }

  const remove = async (it: TaggedItem) => {
    if (!window.confirm(`Remove “${it.title}” completely? This can’t be undone.`)) return
    const { error } = await supabase.rpc('delete_item_by_code', { p_org: orgId, p_code: it.code })
    if (error) setError(errMessage(error))
    // A basket going frees what was in it, so read the list again then.
    else if (it.contents?.length) void load()
    else setItems((list) => (list ?? []).filter((x) => x.tag_id !== it.tag_id))
  }

  // Used for the rabbits / passed on / undo (update 40). Taking one out of a
  // basket changes the basket too, so the list is read again.
  const outcome = async (it: TaggedItem, o: 'rabbits' | 'passed_on' | null) => {
    setRowBusy(it.tag_id)
    setRowNote(null)
    try {
      const saved = await setDonationOutcome(orgId, it.code, o)
      if (it.outcome === 'basket') await load()
      else if (saved) swap(saved)
    } catch (e) {
      setRowNote({ id: it.tag_id, text: errMessage(e) })
    } finally {
      setRowBusy(null)
    }
  }

  // The database checks for real (can_manage_item_kind); this only decides what to show.
  const mayEdit = (it: TaggedItem) => (it.kind === 'stock' ? canStock : it.kind === 'donation' ? canDonations : canAuction)
  const mayMoveTo = (k: ItemKind) => (k === 'stock' ? canAddStock : canAuction)

  // "Move all" — the headed-for view picked, how many, and whether this person may.
  const headed: HeadedFor | null = filter === 'donation' && (view === 'raffle' || view === 'auction' || view === 'shop' || view === 'rabbits') ? view : null
  const bulkCount = headed ? viewCounts[headed] : 0
  const mayBulk = headed === 'shop' ? canAddStock : headed === 'rabbits' ? canDonations : canAuction

  const moveAll = async () => {
    if (!headed || bulkCount === 0) return
    const ask =
      headed === 'rabbits'
        ? `Mark all ${bulkCount} as used for the rabbits?`
        : `Move all ${bulkCount} to ${PLACE_NAME[headed]}? Each keeps its code, so a label already printed still works.`
    if (!window.confirm(ask)) return
    setBulkBusy(true)
    setBulkError(null)
    try {
      const n = await sortHeadedDonations(orgId, headed)
      await load()
      setNote(
        headed === 'rabbits'
          ? `Marked ${n} as used for the rabbits.`
          : headed === 'shop'
            ? `Moved ${n} to the Hop Shop. Any without a price are hidden until they’re priced in Hop Shop inventory.`
            : `Moved ${n} to ${PLACE_NAME[headed]}. Each kept its code, so its label still works.`,
      )
    } catch (e) {
      setBulkError(errMessage(e))
    } finally {
      setBulkBusy(false)
    }
  }

  const startBasket = () => {
    setBasketMode(true)
    setPicked(new Set())
    setFilter('donation')
    if (view === 'done') setView('waiting')
    setPanel(null)
  }
  const pickedItems = (items ?? []).filter((i) => picked.has(i.code))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Items</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Everything with an OHRR code: donations waiting to be sorted, auction lots, raffle prizes and shop stock. Add a donation here or catalog it in the
            app, then decide where it goes, tidy details, mark items won or drawn, and count stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/staff/items/labels" className={btn.blue}>
            <Icon name="printer" size={16} /> Print labels
          </Link>
          <Link to="/staff/items/tags" className={btn.outline}>
            <Icon name="printer" size={16} /> Print tags
          </Link>
          {canDonations && (
            <>
              <Link to="/staff/dropoffs" className={btn.outline}>
                <Icon name="gift" size={16} /> Drop-offs
              </Link>
              <Link to="/staff/donations/report" className={btn.outline}>
                <Icon name="book" size={16} /> Donations report
              </Link>
            </>
          )}
        </div>
      </div>

      {canDonations && (
        <AddDonation
          orgId={orgId}
          suggestions={suggestions}
          stockLink={canAddStock}
          focusRequest={focusAdd}
          presetCode={addCode}
          onCodeDone={() => setAddCode(null)}
          onAdded={(it) => {
            setItems((list) => [it, ...(list ?? [])])
            used(it)
          }}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f)
              if (f !== 'donation') setBasketMode(false)
            }}
            aria-pressed={filter === f}
            className={chip(filter === f)}
          >
            {f === 'all' ? 'All' : f === 'donation' ? 'Donations' : KIND_META[f].label} ({counts[f]})
          </button>
        ))}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, donor or code" className={`${staffInput} !mt-0 max-w-xs`} aria-label="Search items" />
      </div>

      {filter === 'donation' && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div role="group" aria-label="Donations by where they’re headed" className="flex flex-wrap items-center gap-2">
            {DONATION_VIEWS.map((d) => (
              <button
                key={d.v}
                type="button"
                onClick={() => {
                  setView(d.v)
                  setBulkError(null)
                }}
                aria-pressed={view === d.v}
                className={chip(view === d.v)}
              >
                {d.label} ({viewCounts[d.v]})
              </button>
            ))}
          </div>
          {view === 'done' && <p className="mt-2 text-sm text-slate-600">Done: in a basket, used for the rabbits, or passed on.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {headed && mayBulk && (
              <button type="button" onClick={() => void moveAll()} disabled={bulkBusy || bulkCount === 0} className={`${btn.orange} disabled:opacity-60`}>
                {bulkBusy
                  ? 'Moving…'
                  : headed === 'rabbits'
                    ? `Mark all ${bulkCount} as used for the rabbits`
                    : `Move all ${bulkCount} to ${PLACE_NAME[headed]}`}
              </button>
            )}
            {canAuction && !basketMode && view !== 'done' && (
              <button type="button" onClick={startBasket} className={btn.outline}>
                <Icon name="gift" size={16} /> Make a basket
              </button>
            )}
          </div>
          {headed === 'shop' && (
            <p className="mt-2 text-sm text-slate-600">Hop Shop ones without a price arrive hidden until they’re priced in Hop Shop inventory.</p>
          )}
          {bulkError && <p className="mt-2 text-base font-semibold text-red-600">{bulkError}</p>}
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {note && (
        <div className="mt-4 rounded-xl bg-brand-blue-50 px-3 py-2 text-base text-slate-800" role="status">
          {note}{' '}
          <button type="button" onClick={() => setNote(null)} className="min-h-11 px-1 font-bold text-brand-blue">
            OK
          </button>
        </div>
      )}
      {basketMode && (
        <BasketPanel
          orgId={orgId}
          picked={pickedItems}
          onCancel={() => {
            setBasketMode(false)
            setPicked(new Set())
          }}
          onMade={(basket, adds) => {
            setBasketMode(false)
            setPicked(new Set())
            void load()
            setNote(
              <>
                Made the basket “{basket.title}” for {basket.kind === 'auction' ? 'the Silent Auction' : 'the raffle'}. Its code is{' '}
                <span className="font-mono font-bold tracking-widest">{basket.code}</span>. {adds}{' '}
                <Link to={`/staff/items/labels?code=${encodeURIComponent(basket.code)}`} className={linkClass}>
                  Print its label
                </Link>
              </>,
            )
          }}
        />
      )}
      {items === null && !error && <Spinner />}
      {items && shown.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          {items.length === 0
            ? 'Nothing has a code yet. Add a donation above, or print tags and scan them in the app.'
            : filter === 'donation' && view !== 'done'
              ? 'Nothing waiting here.'
              : 'Nothing matches.'}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {shown.map((it) => {
          const k = KIND_META[it.kind]
          const done = it.status === k.done
          const donation = it.kind === 'donation'
          const waiting = donation && !it.outcome
          const tile = k.tone === 'orange' ? 'bg-brand-orange-50 text-brand-orange-ink' : 'bg-brand-blue-50 text-brand-blue'
          const extras = extrasSummary(it)
          const open = panel?.id === it.tag_id ? panel.kind : null
          const toggle = (kind: 'move' | 'edit' | 'split') => setPanel(open === kind ? null : { id: it.tag_id, kind })
          const busyRow = rowBusy === it.tag_id
          const ticked = picked.has(it.code)
          return (
            <li
              key={it.tag_id}
              id={`item-${it.tag_id}`}
              tabIndex={spot === it.tag_id ? -1 : undefined}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${spot === it.tag_id ? 'border-brand-blue ring-2 ring-brand-blue/40' : basketMode && ticked ? 'border-brand-blue' : 'border-black/5'}`}
            >
              <div className="flex flex-wrap items-start gap-4">
                {basketMode && waiting && (
                  <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center self-center">
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() =>
                        setPicked((p) => {
                          const n = new Set(p)
                          if (n.has(it.code)) n.delete(it.code)
                          else n.add(it.code)
                          return n
                        })
                      }
                      className="h-6 w-6 accent-brand-blue"
                      aria-label={`Put “${it.title}” in the basket`}
                    />
                  </label>
                )}
                {it.photo_url ? (
                  <img src={it.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <span className={`inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                    <Icon name={k.icon} size={30} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-extrabold text-ink">
                    {it.title}
                    {waiting && dueSoon(it.use_by) && (
                      <span className="ml-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 align-middle font-sans text-sm font-bold text-amber-900">Use soon</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600">
                    {k.label} · {statusLabel(it)}
                    {donation && it.outcome === 'basket' && it.in_basket ? ` (${it.in_basket.code})` : ''}
                    {it.kind === 'stock' ? ` · ${money(it.price_cents) || 'no price'} each` : ''}
                    {it.kind !== 'stock' && it.donated_by ? ` · from ${it.donated_by}` : ''}
                    {!donation && it.kind !== 'stock' && it.value_cents != null ? ` · worth ${money(it.value_cents)}` : ''}
                    {donation && it.received_on ? ` · received ${shortDate(it.received_on)}` : ''}
                  </p>
                  {extras && <p className="text-sm font-semibold text-slate-700">{extras}</p>}
                  {!donation && it.contents && it.contents.length > 0 && <BasketContents item={it} />}
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs font-bold tracking-widest text-slate-500">
                    {it.code}
                    {it.label_printed_at && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-sans text-xs font-bold tracking-normal text-slate-600">label printed</span>
                    )}
                  </p>
                </div>
              </div>
              {mayEdit(it) && !basketMode && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {waiting ? (
                    <>
                      <button type="button" onClick={() => toggle('move')} aria-expanded={open === 'move'} className={btn.blue}>
                        {open === 'move' ? 'Close' : 'Move to…'}
                      </button>
                      {(it.quantity ?? 1) > 1 && (
                        <button type="button" onClick={() => toggle('split')} aria-expanded={open === 'split'} className={btn.outline}>
                          {open === 'split' ? 'Close' : 'Split…'}
                        </button>
                      )}
                      <button type="button" disabled={busyRow} onClick={() => void outcome(it, 'rabbits')} className={smallBtn}>
                        Used for the rabbits
                      </button>
                      <button type="button" disabled={busyRow} onClick={() => void outcome(it, 'passed_on')} className={smallBtn}>
                        Passed on / not usable
                      </button>
                    </>
                  ) : donation ? (
                    <button type="button" disabled={busyRow} onClick={() => void outcome(it, null)} className={btn.outline}>
                      {busyRow ? 'Working…' : it.outcome === 'basket' ? 'Take out of the basket' : 'Undo'}
                    </button>
                  ) : it.kind === 'stock' ? (
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
                  <button type="button" onClick={() => toggle('edit')} aria-expanded={open === 'edit'} className={btn.outline}>
                    {open === 'edit' ? 'Close' : 'Edit'}
                  </button>
                  <button type="button" onClick={() => void remove(it)} className="min-h-11 px-2 text-sm font-bold text-red-600">
                    Remove
                  </button>
                </div>
              )}
              {rowNote?.id === it.tag_id && <p className="mt-2 text-base font-semibold text-red-600">{rowNote.text}</p>}
              {open === 'move' && (
                <MovePanel
                  item={it}
                  orgId={orgId}
                  canMoveTo={mayMoveTo}
                  onMoved={(saved) => {
                    swap(saved)
                    setPanel(null)
                    setNote(`“${saved.title}” is now in ${KIND_META[saved.kind].label} — same code, ${saved.code}, so its label still works.`)
                  }}
                />
              )}
              {open === 'split' && (
                <SplitPanel
                  item={it}
                  orgId={orgId}
                  onSplit={(part, n) => {
                    setPanel(null)
                    void load()
                    setNote(
                      <>
                        Split off {n} of “{it.title}”. The new part’s code is <span className="font-mono font-bold tracking-widest">{part.code}</span>.{' '}
                        <Link to={`/staff/items/labels?code=${encodeURIComponent(part.code)}`} className={linkClass}>
                          Print its label
                        </Link>
                      </>,
                    )
                  }}
                />
              )}
              {open === 'edit' && (
                <EditForm
                  item={it}
                  orgId={orgId}
                  suggestions={suggestions}
                  onSaved={(saved) => {
                    swap(saved)
                    used(saved)
                    setPanel(null)
                  }}
                  // A photo change saves at once and keeps the editor open (to reorder
                  // several); so does a save whose condition/category/place didn't go.
                  onChanged={swap}
                />
              )}
            </li>
          )
        })}
      </ul>

      {/* While ticking a long list: how many are picked, and the way back up to the form. */}
      {basketMode && pickedItems.length > 0 && (
        <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-brand-blue bg-white px-4 py-2 shadow-xl">
          <span className="text-base font-semibold text-ink">
            {pickedItems.length} picked for the basket
            {(() => {
              const t = pickedItems.reduce((s, p) => s + (donationValues(p).total ?? 0), 0)
              return t ? ` · ${money(t)}` : ''
            })()}
          </span>
          <button
            type="button"
            onClick={() => {
              const name = document.getElementById(BASKET_NAME_ID) as HTMLInputElement | null
              name?.scrollIntoView({ block: 'center' })
              name?.focus({ preventScroll: true })
            }}
            className={btn.blue}
          >
            Name it and make it
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------- baskets */

/** "$25 + $60 = $85" — how a basket's value adds up. */
function addsUp(values: (number | null | undefined)[]): string {
  const have = values.filter((v): v is number => v != null)
  if (have.length === 0) return 'None of these has a value yet.'
  const total = have.reduce((s, v) => s + v, 0)
  const missing = values.length - have.length
  const sum = have.length === 1 ? money(total) : `${have.map((v) => money(v)).join(' + ')} = ${money(total)}`
  return `Its value adds up to ${sum}${missing ? ` (${missing} with no value)` : ''}.`
}

/** What's in a basket (a raffle prize or auction lot made from donations). */
function BasketContents({ item }: { item: TaggedItem }) {
  const list = item.contents ?? []
  return (
    <div className="mt-1 rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-sm font-bold text-slate-700">In this basket:</p>
      <ul className="text-sm text-slate-700">
        {list.map((c, i) => (
          <li key={`${c.code ?? ''}-${i}`}>
            {c.quantity} × {c.title}
            {c.size ? ` (${c.size})` : ''}
            {c.donated_by ? ` · from ${c.donated_by}` : ''}
            {c.value_total_cents != null ? ` · ${money(c.value_total_cents)}` : ''}
            {c.code ? <span className="ml-1 font-mono text-xs font-bold tracking-widest text-slate-500">{c.code}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The basket's name box, so the "Name it and make it" bar can bring it back into view. */
const BASKET_NAME_ID = 'basket-name'

/**
 * "Make a basket": the donations ticked in the list become one raffle prize or
 * Silent Auction lot with its own code (make_basket, update 40). The basket's
 * value is what they're worth together.
 */
function BasketPanel({
  orgId,
  picked,
  onCancel,
  onMade,
}: {
  orgId: string
  picked: TaggedItem[]
  onCancel: () => void
  onMade: (basket: TaggedItem, addsUpText: string) => void
}) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'raffle' | 'auction'>('raffle')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const values = picked.map((p) => donationValues(p).total)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!picked.length || !title.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const basket = await makeBasket(
        orgId,
        picked.map((p) => p.code),
        kind,
        title,
        description,
      )
      const fromDb = basket.contents?.map((c) => c.value_total_cents)
      onMade(basket, addsUp(fromDb && fromDb.length ? fromDb : values))
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Make a basket"
      className="mt-4 rounded-2xl border-2 border-brand-blue bg-white p-4 shadow-sm"
    >
      <p className="font-display text-lg font-extrabold text-ink">Make a basket</p>
      <p className="text-sm text-slate-600">
        {picked.length === 0
          ? 'Tick the donations that go in it, in the list below.'
          : `${picked.length} picked. ${addsUp(values)}`}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="block text-sm font-semibold text-slate-700">
          Name of the basket
          <input id={BASKET_NAME_ID} className={staffInput} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bunny spa day basket" />
        </label>
        <div>
          <p className="text-sm font-semibold text-slate-700">Where it goes</p>
          <div role="group" aria-label="Where the basket goes" className="mt-1 flex flex-wrap gap-1.5">
            {(['raffle', 'auction'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={pickChip(kind === k)}>
                {k === 'raffle' ? 'Raffle' : 'Silent Auction'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Description <span className="font-normal text-slate-600">(optional; what’s in it is added for you)</span>
        <textarea className={staffInput} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <p className="mt-2 text-base font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={busy || picked.length === 0 || !title.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Making it…' : `Make the basket${picked.length ? ` (${picked.length})` : ''}`}
        </button>
        <button type="button" onClick={onCancel} className={btn.outline}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------- photo order */

/** The helper line under every photo editor. */
const COVER_NOTE = 'The cover shows in the catalog, on labels and on the public pages.'

/** A list with one entry moved one place earlier (-1) or later (+1). */
function moved<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** A list with one entry made the first (the cover). */
function asCover<T>(list: T[], i: number): T[] {
  return [list[i], ...list.filter((_, j) => j !== i)]
}

const orderBtn =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-sm font-bold text-brand-blue transition hover:border-brand-blue disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400'

/**
 * One photo in an editor: the picture (the first carries the Cover badge),
 * then Earlier / Later, Make cover (not on the cover) and Remove — every
 * button at least 44 px. Used for photos already saved and for ones picked
 * but not yet uploaded.
 */
function PhotoTile({
  src,
  index,
  count,
  disabled,
  onMove,
  onCover,
  onRemove,
}: {
  src: string
  index: number
  count: number
  disabled: boolean
  onMove: (dir: -1 | 1) => void
  onCover: () => void
  onRemove: () => void
}) {
  const cover = index === 0
  return (
    <li className="w-[11rem] rounded-xl border border-slate-200 bg-white p-2">
      <div className="relative">
        <img src={src} alt={`Photo ${index + 1} of ${count}${cover ? ' (the cover)' : ''}`} className={`aspect-square w-full rounded-lg object-cover ${cover ? 'ring-2 ring-brand-blue' : ''}`} />
        {cover && <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-blue px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-white">Cover</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button type="button" disabled={disabled || index === 0} onClick={() => onMove(-1)} aria-label="Move earlier" title="Move earlier" className={orderBtn}>
          <Icon name="chevron" size={16} className="rotate-180" /> Earlier
        </button>
        <button type="button" disabled={disabled || index === count - 1} onClick={() => onMove(1)} aria-label="Move later" title="Move later" className={orderBtn}>
          Later <Icon name="chevron" size={16} />
        </button>
        {!cover && (
          <button type="button" disabled={disabled} onClick={onCover} className={orderBtn}>
            Make cover
          </button>
        )}
        <button type="button" disabled={disabled} onClick={onRemove} aria-label={`Remove photo ${index + 1}`} className={`${orderBtn} !text-red-700 ${cover ? 'col-span-2' : ''}`}>
          Remove
        </button>
      </div>
    </li>
  )
}

/** A photo picked on this computer, not uploaded yet, with its on-screen preview. */
interface LocalPhoto {
  file: File
  url: string
}

/**
 * What to say after photos are chosen or dropped: `photos` were pictures,
 * `added` of them fitted, `given` files came in all. Nothing when all went in.
 */
function photoNoteFor(photos: number, added: number, given: number): string | null {
  if (given > 0 && photos === 0) return 'That isn’t a photo. Only pictures can be added.'
  if (added < photos) {
    const left = photos - added
    return `An item can have ${MAX_ITEM_PHOTOS} photos, so ${left === 1 ? 'one was' : `${left} were`} left out.`
  }
  if (given > photos) return 'The photos are in. The other files weren’t pictures, so they were left out.'
  return null
}

/* ------------------------------------------------- donation details */

/** The extra details as typed (update 39). Money is in dollars. */
interface Details {
  quantity: string
  price: string
  /** '', 'new', 'like_new', 'good' or 'fair'. */
  condition: string
  category: string
  location: string
}

const emptyDetails = (location = ''): Details => ({ quantity: '1', price: '', condition: '', category: '', location })

const detailsOf = (it: TaggedItem): Details => ({
  quantity: String(it.quantity ?? 1),
  price: dollars(it.price_cents),
  condition: it.condition ?? '',
  category: it.category ?? '',
  location: it.location ?? '',
})

/** How many, as a whole number of at least one. */
const count = (s: string) => Math.min(9999, Math.max(1, parseInt(s || '1', 10) || 1))

const pickChip = (on: boolean) =>
  `min-h-11 rounded-full px-3 text-sm font-semibold transition ${on ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-blue'}`

/** One-click choices: click to pick, click the picked one again to clear. */
function ChoiceChips({ options, value, onPick, label }: { options: string[]; value: string; onPick: (v: string) => void; label: string }) {
  if (options.length === 0) return null
  return (
    <div role="group" aria-label={label} className="contents">
      {options.map((o) => {
        const on = value.trim().toLowerCase() === o.toLowerCase()
        return (
          <button key={o} type="button" onClick={() => onPick(on ? '' : o)} aria-pressed={on} className={pickChip(on)}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

/** Where a donation is headed: one of five, "Not sure yet" meaning sort it later (update 40). */
function HeadedChips({ value, onPick, label = 'Where it’s headed' }: { value: HeadedFor | ''; onPick: (v: HeadedFor | '') => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="mt-1 flex flex-wrap gap-1.5">
      {HEADED_FOR.map((h) => (
        <button key={h.value || 'unsure'} type="button" onClick={() => onPick(h.value)} aria-pressed={value === h.value} className={pickChip(value === h.value)}>
          {h.label}
        </button>
      ))}
    </div>
  )
}

/** Is the value typed for one, or for the whole lot? (update 40) */
function BasisToggle({ value, onPick }: { value: 'each' | 'all'; onPick: (v: 'each' | 'all') => void }) {
  return (
    <div role="group" aria-label="The value is for" className="inline-flex rounded-full border border-slate-300 bg-white p-0.5">
      {(['each', 'all'] as const).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onPick(b)}
          aria-pressed={value === b}
          className={`min-h-11 rounded-full px-4 text-sm font-bold transition ${value === b ? 'bg-brand-blue text-white' : 'text-slate-700 hover:text-brand-blue'}`}
        >
          {b === 'each' ? 'Each' : 'For all'}
        </button>
      ))}
    </div>
  )
}

const fieldLabel = 'block text-sm font-semibold text-slate-700'

function ConditionField({ value, set }: { value: string; set: (v: string) => void }) {
  return (
    <div>
      <p className={fieldLabel}>Condition</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <ChoiceChips options={CONDITIONS.map((c) => c.label)} value={conditionLabel(value)} onPick={(l) => set(CONDITIONS.find((c) => c.label === l)?.value ?? '')} label="Condition" />
      </div>
    </div>
  )
}

function CategoryField({ value, set, suggestions }: { value: string; set: (v: string) => void; suggestions: Suggestions }) {
  const categories = [...new Set([...suggestions.categories, ...CATEGORY_IDEAS])].slice(0, 12)
  return (
    <div>
      <p className={fieldLabel}>What sort of thing?</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <ChoiceChips options={categories} value={value} onPick={set} label="Sort of thing" />
        <input className={`${staffInput} !mt-0 sm:!w-56`} value={value} onChange={(e) => set(e.target.value)} placeholder="Or type one" aria-label="What sort of thing it is" />
      </div>
    </div>
  )
}

function PlaceField({ value, set, suggestions, shelf }: { value: string; set: (v: string) => void; suggestions: Suggestions; shelf?: boolean }) {
  return (
    <div>
      <p className={fieldLabel}>
        Where is it kept? <span className="font-normal text-slate-600">{shelf ? 'its shelf' : 'a bin, shelf or closet'}</span>
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <ChoiceChips options={suggestions.locations} value={value} onPick={set} label="Recent places" />
        <input className={`${staffInput} !mt-0 sm:!w-56`} value={value} onChange={(e) => set(e.target.value)} placeholder="Bin 3, back closet" aria-label="Where it is kept" />
      </div>
    </div>
  )
}

/**
 * How many, a price for one, condition, what sort of thing and where it's
 * kept — each optional, the same as the app's Catalog donations. Shop stock
 * shows only the sort of thing and its shelf (`only="place"`).
 */
function DetailsFields({ v, set, suggestions, only }: { v: Details; set: (p: Partial<Details>) => void; suggestions: Suggestions; only?: 'place' }) {
  return (
    <div className="space-y-3">
      {only !== 'place' && (
        <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,18rem)] md:grid-cols-[8rem_18rem_minmax(0,1fr)] sm:items-start">
          <label className={fieldLabel}>
            How many?
            <input className={staffInput} type="number" inputMode="numeric" min={1} max={9999} step={1} value={v.quantity} onChange={(e) => set({ quantity: e.target.value })} />
          </label>
          <label className={fieldLabel}>
            Price for one ($) <span className="font-normal text-slate-600">(if it may be sold)</span>
            <input className={staffInput} inputMode="decimal" value={v.price} onChange={(e) => set({ price: e.target.value })} />
          </label>
          <div className="sm:col-span-2 md:col-span-1">
            <ConditionField value={v.condition} set={(condition) => set({ condition })} />
          </div>
        </div>
      )}
      <CategoryField value={v.category} set={(category) => set({ category })} suggestions={suggestions} />
      <PlaceField value={v.location} set={(location) => set({ location })} suggestions={suggestions} shelf={only === 'place'} />
    </div>
  )
}

/* ------------------------------------------------- Add a donation */

/**
 * Catalog a donation from the desk (update 36; details 39; intake 40). First
 * who it's from — a drop-off, remembered on this computer for the rest of the
 * day, so the thank-you letter lists everything they brought. Then each item:
 * photos, name, how many, a value for each or for all, and where it's headed.
 * The rest (size, condition, sort of thing, where it's kept, use by, a price,
 * notes) sits under "More details". The database makes the code. Before
 * update 40 the drop-off part is left out (the donor's name goes on each
 * item) and the item is saved without where it's headed, size or use-by.
 */
function AddDonation({
  orgId,
  suggestions,
  stockLink,
  focusRequest,
  presetCode,
  onCodeDone,
  onAdded,
}: {
  orgId: string
  suggestions: Suggestions
  /** Show the way to Hop Shop inventory (shop stock), for people who can add it. */
  stockLink: boolean
  /** Changes when the form should come into view and take the focus (?add=1). */
  focusRequest: number
  /** A scanned label's code (?add=1&code=X): the next donation gets it, not a new one. */
  presetCode: string | null
  /** The preset code is used, or not wanted: back to a new code each time. */
  onCodeDone: () => void
  onAdded: (it: TaggedItem) => void
}) {
  // Who it's from
  const [dropoff, setDropoff] = useState<Dropoff | null>(() => loadCurrentDropoff(orgId))
  /** Has the database got drop-offs (update 40)? null while finding out. */
  const [dropoffs, setDropoffs] = useState<boolean | null>(null)
  const [donor, setDonor] = useState('')
  const [email, setEmail] = useState('')
  const [day, setDay] = useState(() => todayOhio())
  const [donors, setDonors] = useState<string[]>([])
  const [dropBusy, setDropBusy] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  // Each item
  const [title, setTitle] = useState('')
  const [qty, setQty] = useState('1')
  const [value, setValue] = useState('')
  const [basis, setBasis] = useState<'each' | 'all'>('each')
  const [headed, setHeaded] = useState<HeadedFor | ''>('')
  const [more, setMore] = useState(false)
  const [size, setSize] = useState('')
  const [useBy, setUseBy] = useState('')
  const [details, setDetails] = useState<Details>(emptyDetails())
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<LocalPhoto[]>([])
  const [photoNote, setPhotoNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<TaggedItem | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const donorRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<LocalPhoto[]>([])
  const focusDonorNext = useRef(false)
  // Before update 40 there are no drop-offs, whatever this computer remembers.
  const current = dropoffs === false ? null : dropoff

  useEffect(() => {
    if (!orgId) return
    let alive = true
    recentDonors(orgId)
      .then((d) => alive && setDonors(d))
      .catch(() => {
        /* before update 36 there are no chips — nothing to say */
      })
    listDropoffs(orgId, 1)
      .then(() => alive && setDropoffs(true))
      .catch((e) => alive && setDropoffs(isNeeds40(e) ? false : null))
    return () => {
      alive = false
    }
  }, [orgId])

  // The previews are this browser's own copies: let them go when the form does.
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  // ?add=1: bring the form into view and put the cursor where the next thing is typed.
  useEffect(() => {
    if (!focusRequest) return
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    const target = current ? titleRef.current : (donorRef.current ?? titleRef.current)
    target?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest])

  // "Start a new one" puts the cursor back in the donor's name once it shows again.
  useEffect(() => {
    if (!current && focusDonorNext.current) {
      focusDonorNext.current = false
      donorRef.current?.focus()
    }
  }, [current])

  const rememberDonor = (name: string | null | undefined) => {
    const d = (name ?? '').trim()
    if (d) setDonors((prev) => [d, ...prev.filter((x) => x.toLowerCase() !== d.toLowerCase())].slice(0, 12))
  }

  /** Start the drop-off. Returns it, or null when the database hasn't got drop-offs yet. */
  const begin = async (): Promise<Dropoff | null> => {
    try {
      const d = await startDropoff(orgId, { donorName: donor, donorEmail: email, receivedOn: day })
      setDropoff(d)
      saveCurrentDropoff(orgId, d)
      rememberDonor(d.donor_name)
      return d
    } catch (e) {
      if (isNeeds40(e)) {
        setDropoffs(false)
        return null
      }
      throw e
    }
  }

  const start = async () => {
    if (dropBusy) return
    setDropBusy(true)
    setDropError(null)
    try {
      if (await begin()) titleRef.current?.focus()
    } catch (e) {
      setDropError(errMessage(e))
    } finally {
      setDropBusy(false)
    }
  }

  const startNew = () => {
    focusDonorNext.current = true
    setDropoff(null)
    saveCurrentDropoff(orgId, null)
    setDonor('')
    setEmail('')
    setDay(todayOhio())
    setDropError(null)
  }

  /** Chosen or dropped photos, after the ones already there, up to four. `given` counts every file dropped, photos or not. */
  const addPhotos = (list: File[], given = list.length) => {
    const room = Math.max(0, MAX_ITEM_PHOTOS - photos.length)
    const added = list.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPhotos((p) => [...p, ...added])
    if (fileRef.current) fileRef.current.value = ''
    setPhotoNote(photoNoteFor(list.length, added.length, given))
  }
  const removePhoto = (i: number) => {
    const gone = photos[i]
    if (gone) URL.revokeObjectURL(gone.url)
    setPhotos((list) => list.filter((_, j) => j !== i))
    setPhotoNote(null)
  }
  const clearPhoto = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    setPhotos([])
    setPhotoNote(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const q = count(qty)
  const worth = valueLine({ value_cents: toCents(value), value_basis: basis, quantity: q })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || busy) return
    setError(null)
    try {
      // A name or email typed but not started: start the drop-off now, so the
      // thank-you letter has this item on it.
      let d = current
      if (!d && dropoffs !== false && (donor.trim() || email.trim())) {
        setBusy('Starting the drop-off…')
        d = await begin()
      }
      // Uploaded in the order shown, so the first is the cover.
      const urls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        setBusy(photos.length === 1 ? 'Uploading the photo…' : `Uploading photo ${i + 1} of ${photos.length}…`)
        urls.push(await uploadItemPhoto(photos[i].file, orgId))
      }
      setBusy('Saving…')
      const plan: DonationPlan = {
        headed_for: headed || null,
        value_basis: basis,
        size: size.trim() || null,
        use_by: useBy || null,
        dropoff_id: d?.id ?? null,
      }
      let it = await catalogNewItem(orgId, {
        title,
        // A scanned label's code; otherwise the database makes one.
        code: presetCode,
        donatedBy: d ? (d.donor_name ?? '') : donor,
        valueCents: toCents(value),
        photoUrl: urls[0] ?? null,
        description: notes,
        quantity: q,
        priceCents: toCents(details.price),
        condition: details.condition,
        category: details.category,
        location: details.location,
        plan,
      })
      const skipped = { details_skipped: it.details_skipped, plan_skipped: it.plan_skipped }
      if (urls.length > 1) it = await setItemPhotos(orgId, it.code, urls)
      it = { ...it, ...skipped }
      onAdded(it)
      setLast(it)
      if (presetCode) onCodeDone()
      if (!d) rememberDonor(donor)
      // Who it's from, where it's headed and where it's kept stay: the next
      // thing is often from the same box, and a box usually goes to one place.
      setTitle('')
      setQty('1')
      setValue('')
      setBasis('each')
      setSize('')
      setUseBy('')
      setNotes('')
      setDetails((x) => emptyDetails(x.location))
      clearPhoto()
      titleRef.current?.focus()
    } catch (err) {
      setError(isMissingFunction(err) ? UPDATE_36_NOTE : errMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mt-6 scroll-mt-24 rounded-2xl border border-black/5 bg-white p-5 shadow-sm" aria-labelledby="add-donation-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="add-donation-heading" className="font-display text-lg font-extrabold text-ink">
            Add a donation
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">Something given to OHRR. Name it and the code is made for you. Sort it later, or tick where it’s headed.</p>
        </div>
        <Link to="/staff/dropoffs" className={`inline-flex min-h-11 items-center ${linkClass} text-sm`}>
          Drop-offs and thank-you letters
        </Link>
      </div>
      {stockLink && (
        <p className="text-sm text-slate-600">
          Something the shop carries, bought from a supplier?{' '}
          <Link
            to={presetCode ? `/staff/hopshop?add=1&code=${encodeURIComponent(presetCode)}` : '/staff/hopshop?add=1'}
            className={`inline-flex min-h-11 items-center ${linkClass}`}
          >
            Add it in Hop Shop inventory
          </Link>
        </p>
      )}
      {presetCode && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 rounded-xl bg-brand-blue-50 px-3 py-1.5 text-base text-slate-800" role="status">
          <span>
            Its code is <span className="font-mono font-bold tracking-widest">{presetCode}</span>, from the label you scanned.
          </span>
          <button type="button" onClick={onCodeDone} className="min-h-11 px-1 font-bold text-brand-blue">
            Make a new code instead
          </button>
        </p>
      )}

      {/* Who is it from (a drop-off) */}
      <fieldset className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <legend className="px-1 text-base font-bold text-ink">Who is it from?</legend>
        {current ? (
          <p className="text-base text-slate-800">
            Adding to:{' '}
            <Link to={`/staff/dropoffs/${current.id}`} className={`inline-flex min-h-11 items-center ${linkClass}`}>
              {dropoffName(current)}
            </Link>{' '}
            ·{' '}
            <button type="button" onClick={startNew} className="min-h-11 px-1 font-bold text-brand-blue">
              Start a new one
            </button>
          </p>
        ) : (
          <>
            <div className={`grid gap-3 ${dropoffs === false ? '' : 'md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_11rem_auto] md:items-end'}`}>
              <label className={fieldLabel}>
                Donor’s name
                <input ref={donorRef} className={staffInput} value={donor} onChange={(e) => setDonor(e.target.value)} list="recent-donors" autoComplete="off" />
              </label>
              {dropoffs !== false && (
                <>
                  <label className={fieldLabel}>
                    Email <span className="font-normal text-slate-600">(optional, for the thank-you letter)</span>
                    <input className={staffInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
                  </label>
                  <label className={fieldLabel}>
                    Date
                    <input className={staffInput} type="date" required value={day} onChange={(e) => setDay(e.target.value || todayOhio())} />
                  </label>
                  <button type="button" onClick={() => void start()} disabled={dropBusy} className={`${btn.blue} disabled:opacity-60`}>
                    {dropBusy ? 'Starting…' : 'Start'}
                  </button>
                </>
              )}
            </div>
            {donors.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-sm text-slate-600">Recent donors:</span>
                {donors.map((d) => (
                  <button key={d} type="button" onClick={() => setDonor(d)} aria-pressed={donor.trim().toLowerCase() === d.toLowerCase()} className={pickChip(donor.trim().toLowerCase() === d.toLowerCase())}>
                    {d}
                  </button>
                ))}
                <datalist id="recent-donors">
                  {donors.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            )}
            {dropoffs === false ? (
              <p className="mt-2 text-sm text-slate-600">Drop-offs and thank-you letters need database update 40. Until then the donor’s name goes on each item.</p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Start keeps everything they brought together, for one thank-you letter. Leave it blank if nobody gave a name.</p>
            )}
            {dropError && <p className="mt-2 text-base font-semibold text-red-600">{dropError}</p>}
          </>
        )}
      </fieldset>

      {/* Each item */}
      <div className="mt-4 grid grid-cols-2 items-end gap-3 md:grid-cols-[minmax(0,1fr)_7rem_9rem_auto]">
        <label className={`${fieldLabel} col-span-2 md:col-span-1`}>
          What is it?
          <input ref={titleRef} className={staffInput} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hand-knitted bunny blanket" />
        </label>
        <label className={fieldLabel}>
          How many?
          <input className={staffInput} type="number" inputMode="numeric" min={1} max={9999} step={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Value ($)
          <input className={staffInput} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <div className="col-span-2 md:col-span-1">
          <BasisToggle value={basis} onPick={setBasis} />
        </div>
      </div>
      <p className="mt-1 min-h-6 text-sm font-semibold text-slate-700" aria-live="polite">
        {worth}
      </p>

      <div className="mt-2">
        <p className={fieldLabel}>Where it’s headed</p>
        <HeadedChips value={headed} onPick={setHeaded} />
      </div>

      {/* Photos: chosen, or dropped here from a folder on the computer */}
      <PhotoDrop onFiles={addPhotos} disabled={!!busy} className="mt-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${btn.outline} cursor-pointer bg-white ${fileFocus} ${photos.length >= MAX_ITEM_PHOTOS ? 'pointer-events-none opacity-50' : ''}`}>
            <Icon name="camera" size={16} /> {photos.length ? `Add another photo (${photos.length} of ${MAX_ITEM_PHOTOS})` : 'Add photos'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={photos.length >= MAX_ITEM_PHOTOS}
              onChange={(e) => addPhotos(Array.from(e.target.files ?? []))}
            />
          </label>
          {photos.length > 1 && (
            <button type="button" onClick={clearPhoto} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
              Remove all
            </button>
          )}
          <span className="text-sm text-slate-600">
            {photos.length >= MAX_ITEM_PHOTOS ? `That’s ${MAX_ITEM_PHOTOS}, the most an item can have.` : 'Drop photos here, or use Add photos.'} Optional, up to{' '}
            {MAX_ITEM_PHOTOS}. {COVER_NOTE}
          </span>
        </div>
        {photoNote && (
          <p className="mt-2 text-base font-semibold text-amber-900" role="status">
            {photoNote}
          </p>
        )}
        {photos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-3" aria-label="Photos to add, in order">
            {photos.map((p, i) => (
              <PhotoTile
                key={p.url}
                src={p.url}
                index={i}
                count={photos.length}
                disabled={!!busy}
                onMove={(dir) => setPhotos((list) => moved(list, i, dir))}
                onCover={() => setPhotos((list) => asCover(list, i))}
                onRemove={() => removePhoto(i)}
              />
            ))}
          </ul>
        )}
      </PhotoDrop>

      <div className="mt-3 border-t border-slate-100 pt-2">
        <div className="flex flex-wrap items-center gap-x-2">
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} aria-controls="add-more-details" className="inline-flex min-h-11 items-center gap-2 text-base font-bold text-brand-blue">
            <Icon name="chevron" size={16} className={more ? 'rotate-90' : ''} /> More details
          </button>
          <span className="text-sm text-slate-600">Size, condition, sort of thing, where it’s kept, use by, a price, notes</span>
        </div>
        {more && (
          <div id="add-more-details" className="mt-2 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start">
              <label className={fieldLabel}>
                Size <span className="font-normal text-slate-600">(e.g. 24×36)</span>
                <input className={staffInput} value={size} onChange={(e) => setSize(e.target.value)} />
              </label>
              <ConditionField value={details.condition} set={(condition) => setDetails((x) => ({ ...x, condition }))} />
            </div>
            <CategoryField value={details.category} set={(category) => setDetails((x) => ({ ...x, category }))} suggestions={suggestions} />
            <PlaceField value={details.location} set={(location) => setDetails((x) => ({ ...x, location }))} suggestions={suggestions} />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,18rem)] sm:items-start">
              <label className={fieldLabel}>
                Use by <span className="font-normal text-slate-600">(food, medicine)</span>
                <input className={staffInput} type="date" value={useBy} onChange={(e) => setUseBy(e.target.value)} />
              </label>
              <label className={fieldLabel}>
                Price for one ($) <span className="font-normal text-slate-600">(if it may be sold)</span>
                <input className={staffInput} inputMode="decimal" value={details.price} onChange={(e) => setDetails((x) => ({ ...x, price: e.target.value }))} />
              </label>
            </div>
            <label className={fieldLabel}>
              Notes
              <textarea className={staffInput} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Colour, anything a buyer or bidder would want to know" />
            </label>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!!busy || !title.trim()} className={`${btn.orange} min-w-32 disabled:opacity-60`}>
          {busy ?? 'Add'}
        </button>
        {current && <span className="text-sm text-slate-600">It goes on {dropoffName(current)}.</span>}
      </div>
      {error && <p className="mt-3 text-base font-semibold text-red-600">{error}</p>}
      {last && (
        <div className="mt-3 space-y-2" role="status">
          <p className="rounded-xl bg-brand-blue-50 px-3 py-2 text-base text-slate-800">
            Added <strong>{last.title}</strong> — code <span className="font-mono font-bold tracking-widest">{last.code}</span>. Its label is ready in{' '}
            <Link to="/staff/items/labels" className="font-bold text-brand-blue">
              Print labels
            </Link>
            .{extrasSummary(last) && <span className="block text-sm text-slate-700">{extrasSummary(last)}</span>}
          </p>
          {last.details_skipped && <p className="rounded-xl bg-amber-50 px-3 py-2 text-base text-amber-900">{UPDATE_39_ADD_NOTE}</p>}
          {last.plan_skipped && <p className="rounded-xl bg-amber-50 px-3 py-2 text-base text-amber-900">{UPDATE_40_ADD_NOTE}</p>}
        </div>
      )}
    </form>
  )
}

/* ------------------------------------------------- sort one donation */

/**
 * Sort a donation: Silent Auction, Raffle prize or Hop Shop stock. The item
 * keeps its code (the tag re-points; see save_scanned_item). Stock needs a
 * price and a count first; an auction lot goes in as all-day. The value is
 * left to the database, which carries the whole lot's worth across (update 40
 * knows whether it was typed for each or for all).
 */
function MovePanel({
  item,
  orgId,
  canMoveTo,
  onMoved,
}: {
  item: TaggedItem
  orgId: string
  canMoveTo: (k: ItemKind) => boolean
  onMoved: (it: TaggedItem) => void
}) {
  const [kind, setKind] = useState<ItemKind | null>(null)
  // The donation's own price and count (update 39) fill the boxes; left blank,
  // the database would carry them across anyway.
  const [price, setPrice] = useState(dollars(item.price_cents))
  const [quantity, setQuantity] = useState(String(item.quantity ?? 1))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const options = SORT_INTO.filter(canMoveTo)

  const move = async (k: ItemKind) => {
    setBusy(true)
    setError(null)
    try {
      const saved = await saveItem(orgId, item.code, k, {
        title: item.title,
        description: item.description,
        donatedBy: item.donated_by,
        valueCents: null,
        photoUrl: item.photo_url,
        priceCents: k === 'stock' ? toCents(price) : null,
        quantity: k === 'stock' ? parseInt(quantity || '1', 10) || 0 : null,
      })
      onMoved(saved)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-base font-bold text-ink">Where does it go?</p>
      <p className="text-sm text-slate-600">
        It keeps its code, <span className="font-mono font-bold tracking-widest">{item.code}</span>, so a label already printed still works. Auction lots go in as
        all-day; change that on the Silent auction page.
      </p>
      {item.description && (
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-semibold">Notes:</span> {item.description}
        </p>
      )}
      {options.length === 0 && <p className="mt-2 text-sm font-semibold text-slate-600">You can’t move items — ask a lead or admin.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((k) => (
          <button
            key={k}
            type="button"
            disabled={busy}
            onClick={() => (k === 'stock' ? setKind('stock') : void move(k))}
            aria-pressed={kind === k}
            className={`${kind === k ? btn.blue : btn.outline} disabled:opacity-60`}
          >
            <Icon name={KIND_META[k].icon} size={16} /> {busy && kind !== 'stock' ? 'Moving…' : KIND_META[k].label}
          </button>
        ))}
      </div>
      {kind === 'stock' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void move('stock')
          }}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <label className="block text-sm font-semibold text-slate-700">
            Price each ($)
            <input className={`${staffInput} w-28`} inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            How many
            <input className={`${staffInput} w-24`} inputMode="numeric" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
            {busy ? 'Moving…' : 'Move to Hop Shop'}
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

/**
 * Split a lot (update 40): take some off as their own donation with a new
 * code — say 10 of 50 for the raffle, the rest for the shop. A value typed for
 * the whole lot is shared out by how many go with each part.
 */
function SplitPanel({ item, orgId, onSplit }: { item: TaggedItem; orgId: string; onSplit: (part: TaggedItem, n: number) => void }) {
  const total = item.quantity ?? 1
  const max = Math.max(1, total - 1)
  const [n, setN] = useState('1')
  const [head, setHead] = useState<HeadedFor | ''>(item.headed_for ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const take = Math.min(max, Math.max(1, parseInt(n || '1', 10) || 1))
  const { each, total: lot } = donationValues(item)
  const partWorth = item.value_basis === 'all' && lot != null ? Math.round((lot * take) / total) : each != null ? each * take : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      onSplit(await splitDonation(orgId, item.code, take, head || null), take)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-slate-100 pt-4" aria-label={`Split ${item.title}`}>
      <p className="text-base font-bold text-ink">Split this lot</p>
      <p className="text-sm text-slate-600">
        Take some of the {total} off as their own item, with a new code and a label of its own. The rest stay here under {item.code}.
      </p>
      <label className={`${fieldLabel} max-w-xs`}>
        How many to take off? <span className="font-normal text-slate-600">(1 to {max})</span>
        <input className={staffInput} type="number" inputMode="numeric" min={1} max={max} step={1} value={n} onChange={(e) => setN(e.target.value)} />
      </label>
      <div>
        <p className={fieldLabel}>Where is that part headed?</p>
        <HeadedChips value={head} onPick={setHead} label="Where that part is headed" />
      </div>
      <p className="text-sm text-slate-700">
        {take} go{take === 1 ? 'es' : ''} to the new part{partWorth != null ? `, worth ${money(partWorth)}` : ''}; {total - take} stay here.
      </p>
      {error && <p className="text-base font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
        {busy ? 'Splitting…' : `Split off ${take}`}
      </button>
    </form>
  )
}

/**
 * Tidy an item. A donation also has how many, a price for one, condition, sort
 * of thing and where it's kept (update 39); shop stock its sort of thing and
 * shelf. Name, money and counts go through save_scanned_item; condition,
 * category and place through set_item_extras, only when they changed. Before
 * update 39 those fields aren't offered (they couldn't be kept), and a note
 * says why. Update 40 adds a donation's plan — where it's headed, value each
 * or for all, size and use-by — through set_donation_plan, only what changed.
 */
function EditForm({
  item,
  orgId,
  suggestions,
  onSaved,
  onChanged,
}: {
  item: TaggedItem
  orgId: string
  suggestions: Suggestions
  onSaved: (it: TaggedItem) => void
  onChanged: (it: TaggedItem) => void
}) {
  const stock = item.kind === 'stock'
  const donation = item.kind === 'donation'
  const detailsReady = (stock || donation) && hasDetails(item)
  const planReady = donation && has40(item)
  const [d, setD] = useState({
    title: item.title,
    description: item.description ?? '',
    donated_by: item.donated_by ?? '',
    value: dollars(item.value_cents),
    price: dollars(item.price_cents),
    quantity: String(item.quantity ?? 0),
  })
  const [x, setX] = useState<Details>(() => detailsOf(item))
  const [plan, setPlan] = useState({
    headed_for: (item.headed_for ?? '') as HeadedFor | '',
    value_basis: (item.value_basis ?? 'each') as 'each' | 'all',
    size: item.size ?? '',
    use_by: item.use_by ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // photoUrl null keeps the photo it has (coalesce in the database). A
      // donation's blank price keeps the one it has.
      let saved = await saveItem(orgId, item.code, item.kind, {
        title: d.title,
        description: d.description,
        donatedBy: d.donated_by,
        valueCents: toCents(d.value),
        photoUrl: null,
        priceCents: stock ? toCents(d.price) : donation && detailsReady ? toCents(x.price) : null,
        quantity: stock ? Math.max(0, parseInt(d.quantity || '0', 10) || 0) : donation && detailsReady ? count(x.quantity) : null,
      })
      const changed =
        detailsReady &&
        (x.condition !== (item.condition ?? '') || x.category.trim() !== (item.category ?? '') || x.location.trim() !== (item.location ?? ''))
      if (changed) {
        try {
          saved = (await setItemExtras(orgId, item.code, { condition: donation ? x.condition : null, category: x.category, location: x.location })) ?? saved
        } catch (err) {
          // The rest went in: show it, keep the form open with the message.
          onChanged(saved)
          setError(
            err instanceof Error && err.message === UPDATE_39_EXTRAS_NOTE
              ? `The rest is saved. ${UPDATE_39_EXTRAS_NOTE}`
              : `Saved, but not the condition, category or place: ${errMessage(err)}`,
          )
          return
        }
      }
      if (planReady) {
        const p: DonationPlan = {}
        if (plan.headed_for !== (item.headed_for ?? '')) p.headed_for = plan.headed_for || null
        if (plan.value_basis !== (item.value_basis ?? 'each')) p.value_basis = plan.value_basis
        if (plan.size.trim() !== (item.size ?? '')) p.size = plan.size.trim() || null
        if (plan.use_by !== (item.use_by ?? '')) p.use_by = plan.use_by || null
        if (Object.keys(p).length) {
          try {
            saved = (await setDonationPlan(orgId, item.code, p)) ?? saved
          } catch (err) {
            onChanged(saved)
            setError(`The rest is saved, but not where it’s headed, the value basis, size or use-by: ${errMessage(err)}`)
            return
          }
        }
      }
      onSaved(saved)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const editWorth = valueLine({ value_cents: toCents(d.value), value_basis: plan.value_basis, quantity: detailsReady ? count(x.quantity) : item.quantity })
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
      {(stock || donation) &&
        (detailsReady ? (
          <DetailsFields v={x} set={(p) => setX((cur) => ({ ...cur, ...p }))} suggestions={suggestions} only={stock ? 'place' : undefined} />
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {stock
              ? 'What sort of thing and where it’s kept can be added here once database update 39 has run.'
              : 'How many, a price for one, condition, sort of thing and where it’s kept can be added here once database update 39 has run.'}
          </p>
        ))}
      {donation &&
        (planReady ? (
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={fieldLabel}>The value is</span>
              <BasisToggle value={plan.value_basis} onPick={(value_basis) => setPlan((p) => ({ ...p, value_basis }))} />
              {editWorth && <span className="text-sm font-semibold text-slate-700">{editWorth}</span>}
            </div>
            <div>
              <p className={fieldLabel}>Where it’s headed</p>
              <HeadedChips value={plan.headed_for} onPick={(headed_for) => setPlan((p) => ({ ...p, headed_for }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={fieldLabel}>
                Size <span className="font-normal text-slate-600">(e.g. 24×36)</span>
                <input className={staffInput} value={plan.size} onChange={(e) => setPlan((p) => ({ ...p, size: e.target.value }))} />
              </label>
              <label className={fieldLabel}>
                Use by
                <input className={staffInput} type="date" value={plan.use_by} onChange={(e) => setPlan((p) => ({ ...p, use_by: e.target.value }))} />
              </label>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Where it’s headed, a value for each or for all, size and use-by can be set here once database update 40 has run.
          </p>
        ))}
      <label className="block text-sm font-semibold text-slate-700">
        {donation ? 'Notes' : 'Description'}
        <textarea className={staffInput} rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </label>
      <PhotosEditor orgId={orgId} item={item} onSaved={onChanged} />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={busy || !d.title.trim()} className={`${btn.orange} disabled:opacity-60`}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}

/**
 * An item's photos (up to four, update 37): add, remove, put them in order,
 * make another one the cover. Every change is saved at once through
 * set_item_photos, in the order shown.
 */
function PhotosEditor({ orgId, item, onSaved }: { orgId: string; item: TaggedItem; onSaved: (it: TaggedItem) => void }) {
  const photos = itemPhotos(item)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const full = photos.length >= MAX_ITEM_PHOTOS

  const apply = async (urls: string[], doing: string) => {
    setBusy(doing)
    setError(null)
    try {
      onSaved(await setItemPhotos(orgId, item.code, urls))
    } catch (e) {
      setError(isMissingFunction(e) ? 'More than one photo needs database update 37.' : errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  /** Chosen or dropped photos, after the ones already there, up to four. `given` counts every file dropped. */
  const add = async (list: File[], given = list.length) => {
    if (busy) return
    const room = Math.max(0, MAX_ITEM_PHOTOS - photos.length)
    const picked = list.slice(0, room)
    if (fileRef.current) fileRef.current.value = ''
    setNote(photoNoteFor(list.length, picked.length, given))
    if (!picked.length) return
    setBusy(picked.length === 1 ? 'Uploading the photo…' : `Uploading ${picked.length} photos…`)
    setError(null)
    try {
      const urls: string[] = []
      for (const f of picked) urls.push(await uploadItemPhoto(f, orgId))
      await apply([...photos, ...urls], 'Saving…')
    } catch (e) {
      setError(errMessage(e))
      setBusy(null)
    }
  }

  return (
    <PhotoDrop onFiles={(list, given) => void add(list, given)} disabled={!!busy} className="bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-700">
        Photos <span className="font-normal text-slate-600">(up to {MAX_ITEM_PHOTOS})</span>
      </p>
      <p className="text-sm text-slate-600">
        {full ? '' : 'Drop photos here, or use Add photos. '}
        {COVER_NOTE}
      </p>
      {photos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-3" aria-label="Photos, in order">
          {photos.map((u, i) => (
            <PhotoTile
              key={u}
              src={u}
              index={i}
              count={photos.length}
              disabled={!!busy}
              onMove={(dir) => void apply(moved(photos, i, dir), 'Saving the order…')}
              onCover={() => void apply(asCover(photos, i), 'Making it the cover…')}
              onRemove={() => void apply(photos.filter((_, j) => j !== i), 'Removing…')}
            />
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!full && (
          <label className={`${btn.outline} cursor-pointer bg-white ${fileFocus} ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            <Icon name="camera" size={16} /> {photos.length ? 'Add a photo' : 'Add photos'}
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void add(Array.from(e.target.files ?? []))} />
          </label>
        )}
        {busy && (
          <span className="text-sm text-slate-600" role="status">
            {busy}
          </span>
        )}
      </div>
      {note && (
        <p className="mt-2 text-base font-semibold text-amber-900" role="status">
          {note}
        </p>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </PhotoDrop>
  )
}
