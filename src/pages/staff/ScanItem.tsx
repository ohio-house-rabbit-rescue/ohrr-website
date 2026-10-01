// Scan an item (/staff/scan) — the website's version of the app's "Scan an
// item", made for a laptop at the desk (OHRR, 2026-10-01: "on the web version
// for the laptop users i think they still need the option to scan and input
// like on the app. they can upload images if they have them verse use the
// camera").
//
// Three ways to read a label, all ending in the same look-up (item_by_code):
//   - the big box: a USB barcode scanner types the code and presses Enter, or
//     the number is typed by hand (DON-00042, "don 42", HAY-101-001, or the
//     barcode on a packet) — read the same way as the database (update 41);
//   - "Use the camera": the laptop's webcam (components/Scanner.tsx);
//   - "Read the code from a photo": a picture of the label, chosen or dropped.
// Found: what it is, with Open it (its edit panel on Items, or its card in Hop
// Shop inventory), Print its label (donation labels, or the Hop Shop price
// labels for shop stock) and Scan another. Not found: "What is it?" — a
// donation (Add a donation; it gets the next DON number) or a Hop Shop item
// (the new-item form, with a packet barcode filled in), the same two choices
// as the app; a packet barcode puts the Hop Shop first. The page is loaded on
// its own (React.lazy in App.tsx), and ZXing only when the camera or a photo
// needs it, so the site's main bundle doesn't grow.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import Scanner from '../../components/Scanner'
import PhotoDrop, { fileFocus } from '../../components/PhotoDrop'
import { isDonationCode, isRetailBarcode, normalizeCode } from '../../lib/codes'
import { KIND_META, extrasSummary, findByCode, itemPhotos, money, statusLabel, type TaggedItem } from '../../lib/items'
import { PhotoUnreadable, readCodeFromImage } from '../../lib/readCode'

type Result = { item: TaggedItem } | { code: string } | null

const NO_CODE_IN_PHOTO = 'No code found in that photo — try a closer, sharper picture, or type the code.'

const linkClass = 'font-bold text-brand-blue underline-offset-2 hover:underline'

/** The camera button and the photo box: the same size, side by side on a laptop. */
const toolBox = 'flex min-h-16 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-base font-bold transition'

/** Where an item is edited: shop stock in Hop Shop inventory, everything else on Items. */
const openItemPath = (item: Pick<TaggedItem, 'kind' | 'code'>) =>
  item.kind === 'stock' ? `/staff/hopshop?code=${encodeURIComponent(item.code)}` : `/staff/items?code=${encodeURIComponent(item.code)}`

/** Where its label prints: shop stock on the Hop Shop price labels, everything else with the donations. */
const labelPath = (item: Pick<TaggedItem, 'kind' | 'code'>) =>
  `${item.kind === 'stock' ? '/staff/hopshop/labels' : '/staff/items/labels'}?code=${encodeURIComponent(item.code)}`

export default function ScanItem() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  // The same people as Items and Add a donation (staffTiles.ts).
  const shop = can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')
  const canItems = can('events.bunfest.manage') || shop
  const canAddStock = can('hopshop.products.create')

  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [camera, setCamera] = useState(false)
  const [said, setSaid] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // Only the newest look-up may show (a scanner can be quicker than the network).
  const ticket = useRef(0)
  const [params, setParams] = useSearchParams()

  const backToBox = () => {
    const el = inputRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.select()
  }

  const lookup = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      // A QR code that is someone's web link, not an OHRR label (which carries /t/DON-00042).
      const code = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) && !/\/t\/[^/?#]+/.test(text) ? '' : normalizeCode(text)
      if (!code) {
        ticket.current++
        setBusy(null)
        setResult(null)
        setError('That isn’t an OHRR number or a barcode. Check it and try again — a donation’s number looks like DON-00042, a Hop Shop SKU like HAY-101-001.')
        setSaid('That isn’t an OHRR number or a barcode.')
        return
      }
      const mine = ++ticket.current
      setTyped(code)
      setCamera(false)
      setError(null)
      setResult(null)
      setBusy('Looking it up…')
      // Selected at once, so a second scan that comes in before the answer replaces it.
      requestAnimationFrame(backToBox)
      try {
        const item = await findByCode(orgId, code)
        if (mine !== ticket.current) return
        setResult(item ? { item } : { code })
        setSaid(item ? `Found ${item.title}, ${KIND_META[item.kind].label}.` : `No item has the code ${code} yet. What is it?`)
      } catch (e) {
        if (mine !== ticket.current) return
        setError(errMessage(e))
      } finally {
        if (mine === ticket.current) {
          setBusy(null)
          // Ready for the next scan: the code stays in the box, selected, so the next one replaces it.
          requestAnimationFrame(backToBox)
        }
      }
    },
    [orgId],
  )

  // /staff/scan?code=DON-00042 looks it up straight away (then the code leaves the address).
  const codeParam = params.get('code')
  useEffect(() => {
    if (!codeParam || !orgId) return
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.delete('code')
        return next
      },
      { replace: true },
    )
    void lookup(codeParam)
  }, [codeParam, orgId, lookup, setParams])

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return
    const mine = ++ticket.current
    setCamera(false)
    setError(null)
    setResult(null)
    setBusy('Reading the photo…')
    try {
      const text = await readCodeFromImage(file)
      if (mine !== ticket.current) return
      if (!text) {
        setBusy(null)
        setError(NO_CODE_IN_PHOTO)
        setSaid(NO_CODE_IN_PHOTO)
        return
      }
      await lookup(text)
    } catch (e) {
      if (mine !== ticket.current) return
      setBusy(null)
      setError(e instanceof PhotoUnreadable ? e.message : errMessage(e))
    }
  }

  const scanAnother = () => {
    ticket.current++
    setResult(null)
    setError(null)
    setBusy(null)
    setTyped('')
    setSaid('')
    requestAnimationFrame(backToBox)
  }

  // Enter always looks up, even while the last scan is still being looked up (the newest wins).
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (typed.trim()) void lookup(typed)
  }

  if (!canItems) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-2xl font-black text-ink">Scan an item</h1>
        <p className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700">
          Scanning items needs BunFest or Hop Shop access. Whoever brought you on can switch it on.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-black text-ink">Scan an item</h1>
      <p className="mt-1 text-base text-slate-600">See, change or sort anything with an OHRR label or a packet barcode.</p>

      {/* The box a USB scanner types into */}
      <form onSubmit={submit} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" role="search" aria-label="Find an item by its code">
        <label htmlFor="scan-code" className="block font-display text-lg font-extrabold text-ink">
          Scan or type the code
        </label>
        <p id="scan-code-help" className="text-base text-slate-600">
          With a barcode scanner, just scan the label. Or type the number under the barcode: DON-00042 for a donation, or a Hop Shop SKU like HAY-101-001.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="scan-code"
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="DON-00042"
            aria-describedby="scan-code-help"
            className="min-h-16 w-full min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 font-mono text-2xl font-bold uppercase tracking-widest text-ink outline-none transition placeholder:text-slate-300 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/20"
          />
          <button type="submit" disabled={!typed.trim()} className={`${btn.blue} min-h-16 px-8 text-base disabled:opacity-60`}>
            <Icon name="search" size={20} /> Find it
          </button>
        </div>
      </form>

      {/* No scanner? The camera, or a photo of the label */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setCamera((c) => !c)
          }}
          aria-pressed={camera}
          className={`${toolBox} border-2 ${camera ? 'border-brand-blue bg-brand-blue text-white' : 'border-brand-blue/60 bg-white text-brand-blue hover:bg-brand-blue-50'}`}
        >
          <Icon name="camera" size={22} /> {camera ? 'Stop the camera' : 'Use the camera'}
        </button>
        <PhotoDrop
          onFiles={(files, n) => {
            if (files.length) void fromPhoto(files[0])
            else if (n) setError('That isn’t a photo. Drop a picture of the label.')
          }}
          className="flex bg-white"
        >
          <label className={`${toolBox} cursor-pointer flex-col !gap-0 text-brand-blue hover:bg-brand-blue-50 ${fileFocus} ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            <span className="inline-flex items-center gap-2">
              <Icon name="scan" size={22} /> Read the code from a photo
            </span>
            <span className="text-sm font-normal text-slate-600">Choose one, or drop it here</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                void fromPhoto(f)
              }}
            />
          </label>
        </PhotoDrop>
      </div>

      {camera && (
        <div className="mt-4">
          <Scanner onResult={(raw) => void lookup(raw)} />
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {said}
      </p>
      {busy && (
        <p className="mt-4 flex items-center gap-3 text-base font-semibold text-slate-600" role="status">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-blue" aria-hidden="true" />
          {busy}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}

      {result && 'item' in result && <Found item={result.item} onLookup={(c) => void lookup(c)} onAnother={scanAnother} />}
      {result && 'code' in result && <NotFound code={result.code} canAddStock={canAddStock} onAnother={scanAnother} />}

      {!result && !busy && (
        <p className="mt-6 text-base text-slate-600">
          No label on it yet?{' '}
          <Link to="/staff/items?add=1" className={linkClass}>
            Add it as a donation
          </Link>{' '}
          — it gets the next DON number.
          {canAddStock && (
            <>
              {' '}
              Something the shop carries?{' '}
              <Link to="/staff/hopshop?add=1" className={linkClass}>
                Add it to Hop Shop inventory
              </Link>{' '}
              — it gets a SKU.
            </>
          )}{' '}
          Then print its label.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ found */

function Found({ item, onLookup, onAnother }: { item: TaggedItem; onLookup: (code: string) => void; onAnother: () => void }) {
  const k = KIND_META[item.kind]
  const tile = k.tone === 'orange' ? 'bg-brand-orange-50 text-brand-orange-ink' : 'bg-brand-blue-50 text-brand-blue'
  const cover = itemPhotos(item)[0]
  const extras = extrasSummary(item)
  const worth = item.kind === 'stock' ? (item.price_cents != null ? `${money(item.price_cents)} each` : '') : item.value_cents != null && item.kind !== 'donation' ? `Worth ${money(item.value_cents)}` : ''
  const fromLine = [item.donated_by ? `From ${item.donated_by}` : '', worth].filter(Boolean).join(' · ')
  const where = item.kind === 'stock' ? 'Hop Shop inventory' : 'Items'
  return (
    <section aria-labelledby="found-h" className="mt-5 rounded-2xl border-2 border-brand-blue/30 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-green-700">Found it</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row">
        {cover ? (
          <img src={cover} alt={item.title} className="aspect-square w-full max-w-56 shrink-0 rounded-xl object-cover sm:w-44" />
        ) : (
          <span className={`flex aspect-square w-32 shrink-0 items-center justify-center rounded-xl sm:w-44 ${tile}`} aria-hidden="true">
            <Icon name={k.icon} size={48} />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 id="found-h" className="font-display text-2xl font-black leading-tight text-ink">
            {item.title}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-slate-700">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${tile}`}>
              <Icon name={k.icon} size={15} /> {k.label}
            </span>
            <span className="font-semibold">{statusLabel(item)}</span>
          </p>
          {fromLine && <p className="text-base text-slate-600">{fromLine}</p>}
          {extras && <p className="text-base font-semibold text-slate-700">{extras}</p>}
          <p className="font-mono text-base font-bold tracking-widest text-slate-500">{item.code}</p>
        </div>
      </div>
      {item.kind === 'donation' && item.in_basket && (
        <p className="mt-3 text-base text-slate-700">
          It’s in the basket “{item.in_basket.title}”.{' '}
          <button type="button" onClick={() => onLookup(item.in_basket!.code)} className={`min-h-11 ${linkClass}`}>
            See the basket
          </button>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={openItemPath(item)} className={`${btn.orange} min-w-36 text-base`} aria-describedby="open-where">
          Open it
        </Link>
        <Link to={labelPath(item)} className={`${btn.outline} text-base`}>
          <Icon name="printer" size={18} /> Print its label
        </Link>
        <button type="button" onClick={onAnother} className={`${btn.outline} text-base`}>
          <Icon name="scan" size={18} /> Scan another
        </button>
      </div>
      <p id="open-where" className="mt-2 text-sm text-slate-600">
        Open it takes you to {where}, ready to change it.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------ not found */

interface Choice {
  to: string
  label: string
  hint: string
  icon: IconName
}

function NotFound({ code, canAddStock, onAnother }: { code: string; canAddStock: boolean; onAnother: () => void }) {
  const retail = isRetailBarcode(code)
  const don = isDonationCode(code)
  const q = encodeURIComponent(code)
  const donation: Choice = {
    to: `/staff/items?add=1&code=${q}`,
    label: 'A donation',
    hint: don ? `Something given to OHRR. It gets this label’s number, ${code}.` : 'Something given to OHRR. It gets the next DON number; sort it later, or say where it’s headed.',
    icon: 'gift',
  }
  const stock: Choice = {
    // A packet barcode goes on as the product's barcode; the product gets its own SKU.
    to: retail ? `/staff/hopshop?add=1&code=${q}` : '/staff/hopshop?add=1',
    label: 'A Hop Shop item',
    hint: retail
      ? 'Something the shop carries, bought from a supplier. Opens Hop Shop inventory with this barcode; it gets a SKU.'
      : 'Something the shop carries, bought from a supplier. Opens Hop Shop inventory; it gets a SKU.',
    icon: 'store',
  }
  const choices = canAddStock ? (retail ? [stock, donation] : [donation, stock]) : [donation]
  return (
    <section aria-labelledby="new-h" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 id="new-h" className="font-display text-2xl font-black text-ink">
        What is it?
      </h2>
      <p className="mt-1 text-base text-slate-700">
        Nothing has the code <span className="font-mono font-bold tracking-widest">{code}</span> yet
        {retail ? ' — it looks like the barcode on a packet' : ''}. Pick what it is.
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {choices.map((c) => (
          <li key={c.to}>
            <Link to={c.to} className="flex h-full min-h-20 items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 transition hover:border-brand-blue focus-visible:border-brand-blue">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue-dark" aria-hidden="true">
                <Icon name={c.icon} size={24} accent="var(--color-brand-orange)" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-extrabold text-ink">{c.label}</span>
                <span className="block text-base text-slate-600">{c.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onAnother} className={`${btn.outline} mt-4 text-base`}>
        <Icon name="scan" size={18} /> Scan another
      </button>
    </section>
  )
}
