// Print labels — the desk copy of the app's page, since USB label printers
// live next to a computer. Two lists, one page (as in the app, update 41):
//   /staff/items/labels     donations and prizes: QR + barcode + DON number +
//                           name + donor (one per piece for a lot of 50)
//   /staff/hopshop/labels   Hop Shop price labels: QR + barcode + SKU + name +
//                           price (one per item in stock)
// Tick the items (nothing is ticked to start with — Show / Added / Kind / Sort,
// day groups with "Tick these" and 50 at a time keep hundreds usable), choose
// the label size, then Print — one label per page, margins zero — or make a PDF with one
// label per page to print from wherever the printer is. Each ticked label can
// print more than once: a copies box, and "One per piece" / "One per item in
// stock". ?code=X (repeatable) ticks just those; &copies=N sets their copies;
// ?c=X:N (repeatable) ticks X with N copies (a delivery's labels, update 42).
// Labels printed on another phone or computer show up here at once (labelSync).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { KIND_META, UPDATE_36_NOTE, isMissingFunction, listItems, markLabelsPrinted, type TaggedItem } from '../../lib/items'
import { listProducts, money, type StockCard } from '../../lib/hopshop'
import {
  LABEL_SIZES,
  LABEL_SIZE_SETTING,
  customLabelSize,
  labelDataUrl,
  labelSizeFrom,
  labelSizePickedAt,
  labelSizeSetAt,
  labelsPdf,
  loadLabelSize,
  saveLabelSize,
  type LabelItem,
  type LabelSize,
} from '../../lib/labels'
import { setSetting, useSetting, type Json } from '../../lib/settings'
import { listenForLabelChanges, tellOthersLabelsChanged } from '../../lib/labelSync'
import { PAGE_SIZE, SHOW_OPTIONS, SORT_OPTIONS, WHEN_OPTIONS, filterRows, groupByDay, loadView, saveView, type ListView } from '../../lib/labelList'

type Mode = 'items' | 'shop'

/** One line on the page: a donation or prize, or a Hop Shop product. */
interface Row {
  key: string
  code: string
  title: string
  /** The gray line under the name. */
  sub: string
  /** Read out with the tick box: "Hay, from Ann". */
  spoken: string
  photo_url: string | null
  icon: IconName
  quantity: number | null
  label_printed_at: string | null
  price_cents: number | null
  label: LabelItem
  /** When it was added (ISO), for "Added" and the day groups. */
  added: string | null
  /** The item kind, or the Hop Shop type — for the Kind / Type list. */
  kind: string
}

const PRICE_KEY = 'ohrr.labels.shopPrice'
function loadShowPrice(): boolean {
  try {
    return localStorage.getItem(PRICE_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Copies of one label: a whole number from 1 to 999 (blank or nonsense = 1). */
const MAX_COPIES = 999
const copiesOf = (s: string | undefined) => Math.min(MAX_COPIES, Math.max(1, parseInt(s ?? '1', 10) || 1))

function itemRow(i: TaggedItem): Row {
  return {
    key: i.tag_id,
    code: i.code,
    title: i.title,
    sub: `${i.donated_by ? `From ${i.donated_by} · ` : ''}${KIND_META[i.kind].label}`,
    spoken: `${i.title}${i.donated_by ? `, from ${i.donated_by}` : ''}`,
    photo_url: i.photo_url,
    icon: KIND_META[i.kind].icon,
    quantity: i.quantity,
    label_printed_at: i.label_printed_at ?? null,
    price_cents: null,
    label: { code: i.code, title: i.title, donated_by: i.donated_by, photo_url: i.photo_url, kindLabel: i.kind === 'donation' ? null : KIND_META[i.kind].label },
    added: i.created_at ?? null,
    kind: i.kind,
  }
}

function productRow(p: StockCard): Row {
  const code = p.code ?? p.sku ?? ''
  return {
    key: p.id,
    code,
    title: p.name,
    sub: [money(p.price_cents), `${p.quantity ?? 0} in stock`, p.type_name ?? p.category, p.is_active ? null : 'hidden'].filter(Boolean).join(' · '),
    spoken: p.name,
    photo_url: p.photo_url,
    icon: 'bag',
    quantity: p.quantity,
    label_printed_at: p.label_printed_at ?? null,
    price_cents: p.price_cents,
    label: { code, title: p.name, photo_url: p.photo_url, shop: true, price_cents: p.price_cents },
    added: (p as { created_at?: string | null }).created_at ?? p.updated_at ?? null,
    kind: p.type_name ?? p.category ?? 'Other',
  }
}

/** The dropdowns: label size, Show, Added, Kind, Sort. */
const select = `${staffInput} !py-3 text-base`

export default function PrintLabels({ mode = 'items' }: { mode?: Mode }) {
  const shop = mode === 'shop'
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  // The label size is the rescue's (one printer, one roll): whoever may manage
  // settings sets it for every phone and computer; anyone else can pick another
  // size for this computer. The last size picked stays until someone changes it.
  const sharedSize = useSetting<Json>(LABEL_SIZE_SETTING, null)
  const setsForAll = can('settings.manage')
  const [items, setItems] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPrice, setShowPrice] = useState(loadShowPrice)
  // ?code=DON-00042 (one or more): tick just those — "Print its label" from Items, a product card or Scan an item.
  const [searchParams] = useSearchParams()
  const perCode = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of searchParams.getAll('c')) {
      const [code, n] = v.split(':')
      if (code?.trim()) m.set(code.trim().toUpperCase(), Number(n) || 1)
    }
    return m
  }, [searchParams])
  const wanted = useMemo(
    () => [...searchParams.getAll('code').map((c) => c.trim().toUpperCase()).filter(Boolean), ...perCode.keys()],
    [searchParams, perCode],
  )
  const wantedCopies = Number(searchParams.get('copies')) || 0
  const toLabel = (r: Row): LabelItem => (shop ? { ...r.label, price_cents: showPrice ? r.price_cents : null } : r.label)
  // Show / Added / Kind / Sort, kept on this computer ("Print its label" links show just their items).
  const [view, setViewState] = useState<ListView>(() => (wanted.length ? { ...loadView(), show: 'ticked' } : loadView()))
  const [limit, setLimit] = useState(PAGE_SIZE)
  const setView = (patch: Partial<ListView>) => {
    const next = { ...view, ...patch }
    setViewState(next)
    saveView(next)
    setLimit(PAGE_SIZE)
  }
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [size, setSize] = useState<LabelSize>(() => loadLabelSize())
  const [customW, setCustomW] = useState(String(size.wIn))
  const [customH, setCustomH] = useState(String(size.hIn))
  const [preview, setPreview] = useState<string | null>(null)
  const [printImgs, setPrintImgs] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [lastMarked, setLastMarked] = useState<string[]>([])
  // Copies per label, as typed, by code.
  const [copies, setCopies] = useState<Record<string, string>>({})

  const load = async (again = false) => {
    try {
      // Hop Shop products print on their own page, as price labels.
      const rows = shop
        ? (await listProducts(orgId)).filter((p) => p.code || p.sku).map(productRow)
        : (await listItems(orgId)).filter((i) => i.kind !== 'stock').map(itemRow)
      if (again) {
        // Printed on another phone or computer since the last look: untick them, so nothing prints twice.
        const before = new Map((items ?? []).map((r) => [r.code, r.label_printed_at]))
        const done = rows.filter((r) => r.label_printed_at && before.has(r.code) && !before.get(r.code)).map((r) => r.code)
        if (done.length) {
          setPicked((p) => {
            const gone = done.filter((c) => p.has(c))
            if (gone.length === 0) return p
            // The note now speaks of someone else's printing, so its Undo mustn't un-mark this computer's last print.
            setLastMarked([])
            setNote(`${count(gone.length)} you had ticked ${gone.length === 1 ? 'was' : 'were'} printed by someone else, so ${gone.length === 1 ? 'it is' : 'they are'} unticked.`)
            return new Set([...p].filter((c) => !gone.includes(c)))
          })
        }
      }
      setItems(rows)
      setPicked((p) => {
        if (again || p.size) return p
        if (wanted.length) {
          const have = new Set(rows.map((r) => r.code))
          const w = wanted.filter((c) => have.has(c))
          if (w.length) {
            const many = w.map((c) => [c, perCode.get(c) ?? wantedCopies] as const).filter(([, n]) => n > 1)
            if (many.length) setCopies(Object.fromEntries(many.map(([c, n]) => [c, String(copiesOf(String(n)))])))
            return new Set(w)
          }
        }
        // Nothing ticked to start with: with hundreds of items, people tick what they want.
        return new Set<string>()
      })
    } catch (e) {
      setError(errMessage(e))
    }
  }
  useEffect(() => {
    if (orgId) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, mode])
  // Printing marks the labels in the database for everyone. When another device
  // does that, it sends a nudge (labelSync.ts) and this page reads the list again
  // — no polling. It also reads it again when the page comes back into view, in
  // case a nudge was missed.
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    if (!orgId) return
    const again = () => {
      if (document.visibilityState === 'visible') void loadRef.current(true)
    }
    const stop = listenForLabelChanges(orgId, () => void loadRef.current(true))
    document.addEventListener('visibilitychange', again)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', again)
    }
  }, [orgId, mode])

  const shown = useMemo(() => filterRows(items ?? [], view, q, picked), [items, view, q, picked])
  const groups = useMemo(() => groupByDay(shown.slice(0, limit), view.sort), [shown, limit, view.sort])
  const kinds = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of items ?? []) if (!seen.has(r.kind)) seen.set(r.kind, shop ? r.kind : (KIND_META[r.kind as keyof typeof KIND_META]?.label ?? r.kind))
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items, shop])
  const selected = useMemo(() => (items ?? []).filter((i) => picked.has(i.code)), [items, picked])
  // Every label to make, each repeated for its copies.
  const labelCount = selected.reduce((n, i) => n + copiesOf(copies[i.code]), 0)
  const setCopy = (code: string, v: string) => setCopies((c) => ({ ...c, [code]: v }))

  // A preview of the first ticked label, at the chosen size.
  useEffect(() => {
    const first = selected[0] ?? shown[0]
    if (!first) {
      setPreview(null)
      return
    }
    let alive = true
    labelDataUrl(toLabel(first), size, 150)
      .then((u) => alive && setPreview(u))
      .catch(() => alive && setPreview(null))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, shown, size, showPrice])

  const [customOpen, setCustomOpen] = useState(false)
  const showSize = (s: LabelSize, at: number) => {
    setSize(s)
    saveLabelSize(s, at)
    setCustomW(String(s.wIn))
    setCustomH(String(s.hIn))
  }
  const rescueSize = sharedSize.loading ? null : labelSizeFrom(sharedSize.value)
  const rescueAt = labelSizeSetAt(sharedSize.value)
  useEffect(() => {
    // The newer pick wins: the rescue's size only replaces this computer's own pick if it was set after it.
    if (rescueSize && rescueAt > labelSizePickedAt()) showSize(rescueSize, rescueAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescueSize?.key, rescueAt])
  const chooseSize = (s: LabelSize) => {
    const at = Date.now()
    showSize(s, at)
    setCustomOpen(false)
    if (setsForAll && orgId)
      setSetting(LABEL_SIZE_SETTING, { wIn: s.wIn, hIn: s.hIn, at }, { orgId, userId: user?.id }).catch((e) =>
        setError(`The size is set on this computer, but couldn’t be saved for everyone: ${errMessage(e)}`),
      )
  }
  const applyCustom = () => {
    const w = Number(customW)
    const h = Number(customH)
    if (w >= 0.5 && h >= 0.5 && w <= 8.5 && h <= 11) chooseSize(customLabelSize(w, h))
  }
  const choosePrice = (on: boolean) => {
    setShowPrice(on)
    try {
      localStorage.setItem(PRICE_KEY, on ? 'on' : 'off')
    } catch {
      /* private mode */
    }
  }

  const toggle = (code: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(code)) n.delete(code)
      else n.add(code)
      return n
    })

  /** Remember which labels are done. Returns a sentence to add to the note (empty when it worked). */
  const markPrinted = async (codes: string[], printed = true): Promise<string> => {
    try {
      await markLabelsPrinted(orgId, codes, printed)
      tellOthersLabelsChanged(orgId)
      setItems((rows) => (rows ?? []).map((r) => (codes.includes(r.code) ? { ...r, label_printed_at: printed ? new Date().toISOString() : null } : r)))
      setLastMarked(printed ? codes : [])
      return ''
    } catch (e) {
      setLastMarked([])
      // Before update 36 the database can't remember which labels are printed; the printing itself still worked.
      if (isMissingFunction(e)) return ` (They can’t be marked as printed yet — ${UPDATE_36_NOTE.replace('This part needs', 'that needs').replace(' Everything else here still works.', '')})`
      setError(errMessage(e))
      return ''
    }
  }

  const count = (n: number) => `${n} label${n === 1 ? '' : 's'}`

  // Paint every ticked label, put each on its own print page, open the print dialog.
  const print = async () => {
    if (selected.length === 0) return
    setBusy('Making the labels…')
    setError(null)
    setNote(null)
    try {
      // Each label is painted once; its copies are the same picture again.
      const imgs: string[] = []
      for (const it of selected) {
        const src = await labelDataUrl(toLabel(it), size)
        for (let c = copiesOf(copies[it.code]); c > 0; c--) imgs.push(src)
      }
      setPrintImgs(imgs)
      // Let the print pages render before the dialog opens.
      await new Promise((r) => setTimeout(r, 200))
      window.print()
      const extra = await markPrinted(selected.map((s) => s.code))
      setNote(`${count(imgs.length)} sent to print${extra ? '.' + extra : ' and marked as printed.'}`)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  // A PDF with one label per page — for the printer's own app, or to send along.
  const pdf = async () => {
    if (selected.length === 0) return
    setBusy('Making the PDF…')
    setError(null)
    setNote(null)
    try {
      const blob = await labelsPdf(
        selected.flatMap((it) => Array.from({ length: copiesOf(copies[it.code]) }, () => toLabel(it))),
        size,
      )
      const name = `ohrr-${shop ? 'shop-' : ''}labels-${new Date().toISOString().slice(0, 10)}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      const extra = await markPrinted(selected.map((s) => s.code))
      setNote(`${count(labelCount)} in the PDF, each on its own ${size.wIn} × ${size.hIn} in page${extra ? '.' + extra : ', marked as printed.'}`)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const undo = async () => {
    const codes = lastMarked
    const extra = await markPrinted(codes, false)
    if (!extra) setNote(`${count(codes.length)} marked as not printed.`)
  }

  const counts = {
    unprinted: (items ?? []).filter((i) => !i.label_printed_at).length,
    printed: (items ?? []).filter((i) => i.label_printed_at).length,
    all: items?.length ?? 0,
    ticked: picked.size,
  }

  return (
    <>
      <div className="print:hidden">
        <Link to={shop ? '/staff/hopshop' : '/staff/items'} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
          <Icon name="arrowLeft" size={16} /> {shop ? 'Hop Shop inventory' : 'Items'}
        </Link>
        <h1 className="mt-1 font-display text-2xl font-black text-ink">{shop ? 'Hop Shop labels' : 'Print labels'}</h1>
        <p className="mt-1 max-w-2xl text-base text-slate-600">
          {shop
            ? 'A price label for each item on the shelf: the name, the price and its SKU. The barcode scans at the till; the QR code opens the item. Any label printer works.'
            : 'A label per donation — or a copy for every piece: the QR code opens it, the barcode scans at the till or the desk, and the DON number can be typed. Any label printer works — tick the items, choose the label size, then Print.'}
        </p>
        <p className="mt-1 text-base">
          <Link to={shop ? '/staff/items/labels' : '/staff/hopshop/labels'} className="inline-flex min-h-11 items-center font-bold text-brand-blue">
            {shop ? 'Donation labels →' : 'Hop Shop price labels →'}
          </Link>
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          {/* The items to print, ticked */}
          <section aria-label="Items to print">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
              <label className="text-sm font-semibold text-slate-700">
                Show
                <select value={view.show} onChange={(e) => setView({ show: e.target.value as ListView['show'] })} className={select}>
                  {SHOW_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} ({counts[o.value]})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Added
                <select value={view.when} onChange={(e) => setView({ when: e.target.value as ListView['when'] })} className={select}>
                  {WHEN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {kinds.length > 1 && (
                <label className="text-sm font-semibold text-slate-700">
                  {shop ? 'Type' : 'Kind'}
                  <select value={view.kind} onChange={(e) => setView({ kind: e.target.value })} className={select}>
                    <option value="all">All</option>
                    {kinds.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-sm font-semibold text-slate-700">
                Sort
                <select value={view.sort} onChange={(e) => setView({ sort: e.target.value as ListView['sort'] })} className={select}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2">
              <span className="text-sm text-slate-600">
                {shown.length} shown · {picked.size} ticked
              </span>
              {shown.length > 0 && (
                <button type="button" onClick={() => setPicked((p) => new Set([...p, ...shown.map((i) => i.code)]))} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
                  Tick all {shown.length}
                </button>
              )}
              {picked.size > 0 && (
                <button type="button" onClick={() => setPicked(new Set())} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
                  Untick all
                </button>
              )}
            </div>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={shop ? 'Search by name, type or SKU' : 'Search by name, donor or code'}
              aria-label="Search items"
              className={`${staffInput} mt-2 max-w-md !py-3 text-base`}
            />

            {error && <p className="mt-4 text-base font-semibold text-red-600">{error}</p>}
            {items === null && !error && <Spinner />}
            {items && shown.length === 0 && (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-500">
                {items.length === 0
                  ? shop
                    ? 'No Hop Shop items have a SKU yet. Add one in Hop Shop inventory.'
                    : 'Nothing has a DON number yet. Add a donation on the Items page.'
                  : view.show === 'unprinted' && view.when === 'any' && view.kind === 'all' && !q.trim()
                    ? 'Every label has been printed.'
                    : 'Nothing matches. Try Any time, All, or a different search.'}
              </p>
            )}
            {groups.map((g) => (
              <section key={g.heading || 'all'} className="mt-3">
                {g.heading && (
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-base font-extrabold text-ink">
                      {g.heading} <span className="font-sans text-sm font-semibold text-slate-500">· {g.rows.length}</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setPicked((p) => new Set([...p, ...g.rows.map((i) => i.code)]))}
                      className="min-h-11 px-2 text-sm font-bold text-brand-blue"
                    >
                      Tick these {g.rows.length}
                    </button>
                  </div>
                )}
            <ul className="mt-1 space-y-2">
              {g.rows.map((i) => {
                const on = picked.has(i.code)
                const pieces = i.quantity ?? 0
                return (
                  <li key={i.key} className={`rounded-2xl border transition ${on ? 'border-brand-blue bg-brand-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 p-3">
                      <input type="checkbox" checked={on} onChange={() => toggle(i.code)} className="h-6 w-6 shrink-0 accent-brand-blue" aria-label={`Print a label for ${i.spoken}`} />
                      {i.photo_url ? (
                        <img src={i.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                      ) : (
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <Icon name={i.icon} size={22} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-base font-extrabold text-ink">{i.title}</span>
                        <span className="block truncate text-sm text-slate-600">
                          {i.sub}
                          {i.label_printed_at ? ' · printed' : ''}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-bold text-slate-500">{i.code}</span>
                    </label>
                    {on && (
                      <div className="flex flex-wrap items-center gap-2 px-3 pb-3 sm:pl-12">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                          Copies
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_COPIES}
                            step={1}
                            value={copies[i.code] ?? '1'}
                            onChange={(e) => setCopy(i.code, e.target.value)}
                            onBlur={(e) => setCopy(i.code, String(copiesOf(e.target.value)))}
                            className={`${staffInput} !mt-0 !w-24`}
                            aria-label={`Copies of the label for ${i.spoken}`}
                          />
                        </label>
                        {pieces > 1 && (
                          <button
                            type="button"
                            onClick={() => setCopy(i.code, String(Math.min(MAX_COPIES, pieces)))}
                            aria-pressed={copiesOf(copies[i.code]) === Math.min(MAX_COPIES, pieces)}
                            className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-blue/60 bg-white px-4 text-sm font-bold text-brand-blue transition hover:bg-brand-blue-50"
                          >
                            {shop ? 'One per item in stock' : 'One per piece'} ({Math.min(MAX_COPIES, pieces)})
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
              </section>
            ))}
            {shown.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE_SIZE)} className={`${btn.outline} mt-3 w-full`}>
                Show {Math.min(PAGE_SIZE, shown.length - limit)} more ({shown.length - limit} not shown yet)
              </button>
            )}
          </section>

          {/* Label size, preview and the print buttons — stay in view while ticking a long list */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <label htmlFor="label-size" className="font-display text-lg font-extrabold text-ink">
                Label size
              </label>
              <select
                id="label-size"
                value={customOpen || size.key.startsWith('custom:') ? 'custom' : size.key}
                onChange={(e) => {
                  const s = LABEL_SIZES.find((x) => x.key === e.target.value)
                  if (s) chooseSize(s)
                  else setCustomOpen(true)
                }}
                className={select}
              >
                {LABEL_SIZES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
                <option value="custom">{size.key.startsWith('custom:') ? size.label : 'Another size…'}</option>
              </select>
              <p className="mt-1 text-sm text-slate-600">
                {setsForAll
                  ? 'Stays until someone changes it — for the whole rescue, on every phone and computer.'
                  : rescueSize
                    ? `Stays until it’s changed. The rescue’s size is ${rescueSize.label}.`
                    : 'Stays on this computer until it’s changed.'}
              </p>
              {(customOpen || size.key.startsWith('custom:')) && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Width (in)
                  <input type="number" step="0.05" min="0.5" max="8.5" value={customW} onChange={(e) => setCustomW(e.target.value)} className={`${staffInput} w-24`} />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Height (in)
                  <input type="number" step="0.05" min="0.5" max="11" value={customH} onChange={(e) => setCustomH(e.target.value)} className={`${staffInput} w-24`} />
                </label>
                <button type="button" onClick={applyCustom} className={btn.outline}>
                  Use this size
                </button>
              </div>
              )}
              {shop && (
                <label className="mt-3 flex min-h-11 items-center gap-2 text-base font-bold text-slate-700">
                  <input type="checkbox" checked={showPrice} onChange={(e) => choosePrice(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand-blue" />
                  Show the price on the label
                </label>
              )}
              {preview && (
                <div className="mt-4">
                  <p className="mb-1 text-sm font-semibold text-slate-700">Preview · {size.label}</p>
                  <img src={preview} alt="Label preview" className="w-full max-w-sm rounded-lg border border-slate-200 shadow-sm" style={{ aspectRatio: `${size.wIn} / ${size.hIn}` }} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void print()} disabled={!!busy || selected.length === 0} className={`${btn.orange} disabled:opacity-60`}>
                <Icon name="printer" size={16} /> {busy ?? `Print ${labelCount}`}
              </button>
              <button type="button" onClick={() => void pdf()} disabled={!!busy || selected.length === 0} className={`${btn.outline} disabled:opacity-60`}>
                PDF
              </button>
            </div>
            {note && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">
                {note}{' '}
                {lastMarked.length > 0 && (
                  <button type="button" onClick={() => void undo()} className="inline-flex min-h-11 items-center font-bold text-brand-blue">
                    Undo — mark not printed
                  </button>
                )}
              </p>
            )}
            <p className="text-sm text-slate-600">
              In the print dialog choose the label printer and its label size; margins are zero, one label per page. “Save as PDF” works there too.
            </p>
          </div>
        </div>
      </div>

      {/* print-only: one label per page at the label's size */}
      <div className="hidden print:block">
        {printImgs.map((src, i) => (
          <div key={i} className="label-page">
            <img src={src} alt="" />
          </div>
        ))}
      </div>
      <style>{`
        @media print {
          @page { size: ${size.wIn}in ${size.hIn}in; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          header, aside, nav, footer, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          [class*="max-w-7xl"] { max-width: none !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; }
          [class*="bg-canvas"] { background: white !important; }
          .label-page { width: ${size.wIn}in; height: ${size.hIn}in; overflow: hidden; page-break-after: always; break-after: page; }
          .label-page:last-child { page-break-after: auto; break-after: auto; }
          .label-page img { display: block; width: ${size.wIn}in; height: ${size.hIn}in; }
        }
      `}</style>
    </>
  )
}
