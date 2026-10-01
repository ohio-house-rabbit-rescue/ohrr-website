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
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner, shortDate } from '../../lib/staff'
import { uploadItemPhoto } from '../../lib/hopshop'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import {
  CATEGORY_IDEAS,
  CONDITIONS,
  KIND_META,
  MAX_ITEM_PHOTOS,
  SORT_INTO,
  UPDATE_36_NOTE,
  UPDATE_39_ADD_NOTE,
  UPDATE_39_EXTRAS_NOTE,
  catalogNewItem,
  catalogSuggestions,
  conditionLabel,
  extrasSummary,
  hasDetails,
  isMissingFunction,
  itemPhotos,
  listItems,
  setItemExtras,
  setItemPhotos,
  money,
  recentDonors,
  saveItem,
  statusLabel,
  toCents,
  type ItemKind,
  type TaggedItem,
} from '../../lib/items'

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
// "To sort" first: it is the pile on the desk.
const FILTERS: Filter[] = ['donation', 'all', 'auction', 'raffle', 'stock']

const chip = (on: boolean) =>
  `min-h-11 rounded-full px-4 text-sm font-bold transition ${on ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-blue'}`

export default function Items() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const canAuction = can('events.bunfest.manage')
  const canStock = can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')
  const canAddStock = can('hopshop.products.create')
  const [items, setItems] = useState<TaggedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestions>({ locations: [], categories: [] })

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
  // A place or sort of thing just typed goes to the front of its chips.
  const used = (it: TaggedItem) =>
    setSuggestions((s) => ({ locations: bump(s.locations, it.location ?? '', 10), categories: bump(s.categories, it.category ?? '', 12) }))

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (items ?? []).filter(
      (i) => (filter === 'all' || i.kind === filter) && (!n || i.title.toLowerCase().includes(n) || i.code.toLowerCase().includes(n) || (i.donated_by ?? '').toLowerCase().includes(n)),
    )
  }, [items, filter, q])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, donation: 0, auction: 0, raffle: 0, stock: 0 }
    for (const i of items ?? []) {
      c.all++
      if (i.kind in c) c[i.kind]++
    }
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
    else setItems((list) => (list ?? []).filter((x) => x.tag_id !== it.tag_id))
  }

  // The database checks for real (can_manage_item_kind); this only decides what to show.
  const mayEdit = (it: TaggedItem) => (it.kind === 'stock' ? canStock : it.kind === 'donation' ? canAuction || canStock : canAuction)
  const mayMoveTo = (k: ItemKind) => (k === 'stock' ? canAddStock : canAuction)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Items</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Everything with an OHRR code: donations still to sort, auction lots, raffle prizes and shop stock. Add a donation here or catalog it in the app, then
            decide where it goes, tidy details, mark items won or drawn, and count stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/staff/items/labels" className={btn.blue}>
            <Icon name="printer" size={16} /> Print labels
          </Link>
          <Link to="/staff/items/tags" className={btn.outline}>
            <Icon name="printer" size={16} /> Print tags
          </Link>
        </div>
      </div>

      {(canAuction || canStock) && (
        <AddDonation
          orgId={orgId}
          suggestions={suggestions}
          onAdded={(it) => {
            setItems((list) => [it, ...(list ?? [])])
            used(it)
          }}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={chip(filter === f)}>
            {f === 'all' ? 'All' : f === 'donation' ? 'To sort' : KIND_META[f].label} ({counts[f]})
          </button>
        ))}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, donor or code" className={`${staffInput} !mt-0 max-w-xs`} aria-label="Search items" />
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {note && (
        <p className="mt-4 rounded-xl bg-brand-blue-50 px-3 py-2 text-base text-slate-800">
          {note}{' '}
          <button type="button" onClick={() => setNote(null)} className="font-bold text-brand-blue">
            OK
          </button>
        </p>
      )}
      {items === null && !error && <Spinner />}
      {items && shown.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          {items.length === 0
            ? 'Nothing has a code yet. Add a donation above, or print tags and scan them in the app.'
            : filter === 'donation'
              ? 'Nothing left to sort.'
              : 'Nothing matches.'}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {shown.map((it) => {
          const k = KIND_META[it.kind]
          const done = it.status === k.done
          const donation = it.kind === 'donation'
          const tile = k.tone === 'orange' ? 'bg-brand-orange-50 text-brand-orange-ink' : 'bg-brand-blue-50 text-brand-blue'
          const extras = extrasSummary(it)
          return (
            <li key={it.tag_id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-4">
                {it.photo_url ? (
                  <img src={it.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <span className={`inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                    <Icon name={k.icon} size={30} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-extrabold text-ink">{it.title}</p>
                  <p className="text-sm text-slate-600">
                    {k.label} · {statusLabel(it)}
                    {it.kind === 'stock' ? ` · ${money(it.price_cents) || 'no price'} each` : ''}
                    {it.kind !== 'stock' && it.donated_by ? ` · from ${it.donated_by}` : ''}
                    {it.kind !== 'stock' && it.value_cents != null ? ` · worth ${money(it.value_cents)}` : ''}
                    {donation && it.received_on ? ` · received ${shortDate(it.received_on)}` : ''}
                  </p>
                  {extras && <p className="text-sm font-semibold text-slate-700">{extras}</p>}
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs font-bold tracking-widest text-slate-400">
                    {it.code}
                    {it.label_printed_at && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-sans text-xs font-bold tracking-normal text-slate-600">label printed</span>
                    )}
                  </p>
                </div>
                {mayEdit(it) && (
                  <div className="flex flex-wrap gap-2">
                    {donation ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMoving(moving === it.tag_id ? null : it.tag_id)
                          setEditing(null)
                        }}
                        aria-expanded={moving === it.tag_id}
                        className={btn.blue}
                      >
                        {moving === it.tag_id ? 'Close' : 'Move to…'}
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
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(editing === it.tag_id ? null : it.tag_id)
                        setMoving(null)
                      }}
                      className={btn.outline}
                    >
                      {editing === it.tag_id ? 'Close' : 'Edit'}
                    </button>
                    <button type="button" onClick={() => void remove(it)} className="min-h-11 px-2 text-sm font-bold text-red-600">
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {moving === it.tag_id && (
                <MovePanel
                  item={it}
                  orgId={orgId}
                  canMoveTo={mayMoveTo}
                  onMoved={(saved) => {
                    swap(saved)
                    setMoving(null)
                    setNote(`“${saved.title}” is now in ${KIND_META[saved.kind].label} — same code, ${saved.code}, so its label still works.`)
                  }}
                />
              )}
              {editing === it.tag_id && (
                <EditForm
                  item={it}
                  orgId={orgId}
                  suggestions={suggestions}
                  onSaved={(saved) => {
                    swap(saved)
                    used(saved)
                    setEditing(null)
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
    </div>
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

const fieldLabel = 'block text-sm font-semibold text-slate-700'

/**
 * How many, a price for one, condition, what sort of thing and where it's
 * kept — each optional, the same as the app's Catalog donations. Shop stock
 * shows only the sort of thing and its shelf (`only="place"`).
 */
function DetailsFields({
  v,
  set,
  suggestions,
  only,
}: {
  v: Details
  set: (p: Partial<Details>) => void
  suggestions: Suggestions
  only?: 'place'
}) {
  const categories = [...new Set([...suggestions.categories, ...CATEGORY_IDEAS])].slice(0, 12)
  return (
    <div className="space-y-3">
      {only !== 'place' && (
        <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,18rem)] md:grid-cols-[8rem_18rem_minmax(0,1fr)] sm:items-start">
          <label className={fieldLabel}>
            How many?
            <input
              className={staffInput}
              type="number"
              inputMode="numeric"
              min={1}
              max={9999}
              step={1}
              value={v.quantity}
              onChange={(e) => set({ quantity: e.target.value })}
            />
          </label>
          <label className={fieldLabel}>
            Price for one ($) <span className="font-normal text-slate-600">(if it may be sold)</span>
            <input className={staffInput} inputMode="decimal" value={v.price} onChange={(e) => set({ price: e.target.value })} />
          </label>
          <div className="sm:col-span-2 md:col-span-1">
            <p className={fieldLabel}>Condition</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <ChoiceChips
                options={CONDITIONS.map((c) => c.label)}
                value={conditionLabel(v.condition)}
                onPick={(l) => set({ condition: CONDITIONS.find((c) => c.label === l)?.value ?? '' })}
                label="Condition"
              />
            </div>
          </div>
        </div>
      )}
      <div>
        <p className={fieldLabel}>What sort of thing?</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <ChoiceChips options={categories} value={v.category} onPick={(c) => set({ category: c })} label="Sort of thing" />
          <input
            className={`${staffInput} !mt-0 sm:!w-56`}
            value={v.category}
            onChange={(e) => set({ category: e.target.value })}
            placeholder="Or type one"
            aria-label="What sort of thing it is"
          />
        </div>
      </div>
      <div>
        <p className={fieldLabel}>
          Where is it kept? <span className="font-normal text-slate-600">{only === 'place' ? 'its shelf' : 'a bin, shelf or closet'}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <ChoiceChips options={suggestions.locations} value={v.location} onPick={(l) => set({ location: l })} label="Recent places" />
          <input
            className={`${staffInput} !mt-0 sm:!w-56`}
            value={v.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Bin 3, back closet"
            aria-label="Where it is kept"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Catalog a donation from the desk: name, who gave it, what it's worth, photos
 * if there are any (put in order here; the first is the cover). The database
 * makes the code; the item lands in "To sort" and gets sorted with "Move to…"
 * (update 36). Update 39 adds how many, a price for one, condition, sort of
 * thing, where it's kept and notes; before it the item is still saved, and
 * the screen says the details need the update.
 */
function AddDonation({ orgId, suggestions, onAdded }: { orgId: string; suggestions: Suggestions; onAdded: (it: TaggedItem) => void }) {
  const [title, setTitle] = useState('')
  const [donor, setDonor] = useState('')
  const [value, setValue] = useState('')
  const [details, setDetails] = useState<Details>(emptyDetails())
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<LocalPhoto[]>([])
  const [donors, setDonors] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<TaggedItem | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<LocalPhoto[]>([])

  useEffect(() => {
    if (!orgId) return
    let alive = true
    recentDonors(orgId)
      .then((d) => alive && setDonors(d))
      .catch(() => {
        /* before update 36 there are no chips — nothing to say */
      })
    return () => {
      alive = false
    }
  }, [orgId])

  // The previews are this browser's own copies: let them go when the form does.
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const room = Math.max(0, MAX_ITEM_PHOTOS - photos.length)
    const added = Array.from(files)
      .slice(0, room)
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPhotos((p) => [...p, ...added])
    if (fileRef.current) fileRef.current.value = ''
  }
  const removePhoto = (i: number) => {
    const gone = photos[i]
    if (gone) URL.revokeObjectURL(gone.url)
    setPhotos((list) => list.filter((_, j) => j !== i))
  }
  const clearPhoto = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    setPhotos([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || busy) return
    setError(null)
    try {
      // Uploaded in the order shown, so the first is the cover.
      const urls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        setBusy(photos.length === 1 ? 'Uploading the photo…' : `Uploading photo ${i + 1} of ${photos.length}…`)
        urls.push(await uploadItemPhoto(photos[i].file, orgId))
      }
      setBusy('Saving…')
      let it = await catalogNewItem(orgId, {
        title,
        donatedBy: donor,
        valueCents: toCents(value),
        photoUrl: urls[0] ?? null,
        description: notes,
        quantity: count(details.quantity),
        priceCents: toCents(details.price),
        condition: details.condition,
        category: details.category,
        location: details.location,
      })
      const skipped = Boolean(it.details_skipped)
      if (urls.length > 1) it = await setItemPhotos(orgId, it.code, urls)
      if (skipped) it = { ...it, details_skipped: true }
      onAdded(it)
      setLast(it)
      const d = donor.trim()
      if (d) setDonors((prev) => [d, ...prev.filter((x) => x.toLowerCase() !== d.toLowerCase())].slice(0, 12))
      // The donor and the place stay — the next thing is often from the same
      // box, and a whole box usually goes to one place.
      setTitle('')
      setValue('')
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
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-extrabold text-ink">Add a donation</h2>
      <p className="mt-0.5 text-sm text-slate-600">Name it now and the code is made for you. Decide auction, raffle or shop later with “Move to…”.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_7rem_auto] md:items-end">
        <label className="block text-sm font-semibold text-slate-700">
          What is it?
          <input ref={titleRef} className={staffInput} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hand-knitted bunny blanket" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          From (donor)
          <input className={staffInput} value={donor} onChange={(e) => setDonor(e.target.value)} list="recent-donors" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Value ($)
          <input className={staffInput} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button type="submit" disabled={!!busy || !title.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ?? 'Add'}
        </button>
      </div>
      {donors.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm text-slate-600">Recent donors:</span>
          {donors.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDonor(d)}
              aria-pressed={donor.trim().toLowerCase() === d.toLowerCase()}
              className={`min-h-11 rounded-full px-3 text-sm font-semibold transition ${
                donor.trim().toLowerCase() === d.toLowerCase() ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-blue'
              }`}
            >
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
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-2 text-sm text-slate-600">More details, all optional:</p>
        <DetailsFields v={details} set={(p) => setDetails((x) => ({ ...x, ...p }))} suggestions={suggestions} />
        <label className={`${fieldLabel} mt-3`}>
          Notes
          <textarea
            className={staffInput}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Size, colour, anything a buyer or bidder would want to know"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className={`${btn.outline} cursor-pointer ${photos.length >= MAX_ITEM_PHOTOS ? 'pointer-events-none opacity-50' : ''}`}>
          <Icon name="camera" size={16} /> {photos.length ? `Add another photo (${photos.length} of ${MAX_ITEM_PHOTOS})` : 'Add photos'}
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" disabled={photos.length >= MAX_ITEM_PHOTOS} onChange={(e) => addPhotos(e.target.files)} />
        </label>
        {photos.length > 1 && (
          <button type="button" onClick={clearPhoto} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
            Remove all
          </button>
        )}
        <span className="text-sm text-slate-600">
          Optional, up to {MAX_ITEM_PHOTOS}. {COVER_NOTE}
        </span>
      </div>
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
        </div>
      )}
    </form>
  )
}

/**
 * Sort a donation: Silent Auction, Raffle prize or Hop Shop stock. The item
 * keeps its code (the tag re-points; see save_scanned_item). Stock needs a
 * price and a count first; an auction lot goes in as all-day.
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
        valueCents: item.value_cents,
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
 * Tidy an item. A donation also has how many, a price for one, condition, sort
 * of thing and where it's kept (update 39); shop stock its sort of thing and
 * shelf. Name, money and counts go through save_scanned_item; condition,
 * category and place through set_item_extras, only when they changed. Before
 * update 39 those fields aren't offered (they couldn't be kept), and a note
 * says why.
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
  const [d, setD] = useState({
    title: item.title,
    description: item.description ?? '',
    donated_by: item.donated_by ?? '',
    value: dollars(item.value_cents),
    price: dollars(item.price_cents),
    quantity: String(item.quantity ?? 0),
  })
  const [x, setX] = useState<Details>(() => detailsOf(item))
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
      onSaved(saved)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
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

  const add = async (files: FileList | null) => {
    if (!files || !files.length) return
    const room = Math.max(0, MAX_ITEM_PHOTOS - photos.length)
    const picked = Array.from(files).slice(0, room)
    if (fileRef.current) fileRef.current.value = ''
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-700">
        Photos <span className="font-normal text-slate-600">(up to {MAX_ITEM_PHOTOS})</span>
      </p>
      <p className="text-sm text-slate-600">{COVER_NOTE}</p>
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
          <label className={`${btn.outline} cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            <Icon name="camera" size={16} /> {photos.length ? 'Add a photo' : 'Add photos'}
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void add(e.target.files)} />
          </label>
        )}
        {busy && (
          <span className="text-sm text-slate-600" role="status">
            {busy}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}
