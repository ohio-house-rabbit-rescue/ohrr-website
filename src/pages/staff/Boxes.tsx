// Boxes (/staff/boxes) — the numbered boxes items are packed in (update 46),
// the website's copy of the app's scan/pages/Boxes.tsx. Start a box, or find
// one by its number, where it's kept, or an item inside. Box labels not
// printed yet wait at the top, to print all at once when the 4 × 6 roll is in
// (Receive into boxes leaves them for the end of the sort).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { labelDataUrl, labelsPdf } from '../../lib/labels'
import { BOX_SIZE, boxLabel, listBoxes, markBoxesPrinted, newBox, type Box } from '../../lib/boxes'

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
  const [reload, setReload] = useState(0)
  const [printImgs, setPrintImgs] = useState<string[]>([])

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
  }, [orgId, reload])

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

  // Filled boxes whose label hasn't been printed, lowest number first (the order they were written on).
  const waiting = (boxes ?? []).filter((b) => !b.label_printed_at && b.items.length > 0).sort((a, b) => a.box_no - b.box_no)

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
    <>
      <div className="max-w-3xl print:hidden">
        <Link to="/staff/items" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
          <Icon name="arrowLeft" size={16} /> Items
        </Link>
        <h1 className="mt-1 font-display text-2xl font-black text-ink">Boxes</h1>
        <p className="mt-1 text-base text-slate-600">
          Numbered boxes and what’s in them. Receive into boxes adds new items straight into a box; an empty box is for items that already have labels — scan
          them in. Scanning a box label opens the full list.
        </p>

        {waiting.length > 0 && <WaitingLabels orgId={orgId} boxes={waiting} setPrintImgs={setPrintImgs} onPrinted={() => setReload((n) => n + 1)} />}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link to="/staff/items?add=1&box=1" className={`${btn.orange} min-h-12 text-base`}>
            <Icon name="camera" size={18} /> Receive into boxes
          </Link>
          <button type="button" onClick={() => void start()} disabled={busy || !orgId} className={`${btn.outline} min-h-12 text-base disabled:opacity-60`}>
            <Icon name="plus" size={18} /> {busy ? 'Starting…' : 'Empty box'}
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
      {/* print-only: the waiting box labels at 4 × 6 in */}
      <div className="hidden print:block">
        {printImgs.map((src, i) => (
          <div key={i} className="label-page">
            <img src={src} alt="" />
          </div>
        ))}
      </div>
      <style>{`
        @media print {
          @page { size: ${BOX_SIZE.wIn}in ${BOX_SIZE.hIn}in; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          header, aside, nav, footer, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          [class*="max-w-7xl"] { max-width: none !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; }
          [class*="bg-canvas"] { background: white !important; }
          .label-page { width: ${BOX_SIZE.wIn}in; height: ${BOX_SIZE.hIn}in; overflow: hidden; page-break-after: always; break-after: page; }
          .label-page:last-child { page-break-after: auto; break-after: auto; }
          .label-page img { display: block; width: ${BOX_SIZE.wIn}in; height: ${BOX_SIZE.hIn}in; }
        }
      `}</style>
    </>
  )
}

/** Every waiting box label at once: the 4 × 6 roll in, then Print or a PDF. */
function WaitingLabels({
  orgId,
  boxes,
  setPrintImgs,
  onPrinted,
}: {
  orgId: string
  boxes: Box[]
  /** The labels for the print dialog, shown by the page outside its own column. */
  setPrintImgs: (imgs: string[]) => void
  onPrinted: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const n = boxes.length
  const plural = `${n} box label${n === 1 ? '' : 's'}`

  const marked = async () => {
    try {
      await markBoxesPrinted(orgId, boxes.map((b) => b.code))
    } catch {
      /* they printed; the box pages can still say so */
    }
    onPrinted()
  }

  const print = async () => {
    setBusy('Making the labels…')
    setError(null)
    try {
      const imgs: string[] = []
      for (const b of boxes) imgs.push(await labelDataUrl(boxLabel(b), BOX_SIZE))
      setPrintImgs(imgs)
      await new Promise((r) => setTimeout(r, 150))
      window.print()
      await marked()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const pdf = async () => {
    setBusy('Making the PDF…')
    setError(null)
    try {
      const blob = await labelsPdf(boxes.map(boxLabel), BOX_SIZE)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ohrr-box-labels.pdf'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      await marked()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-orange-50 p-4" aria-labelledby="waiting-box-labels">
      <h2 id="waiting-box-labels" className="font-display text-lg font-extrabold text-ink">
        {plural} to print
      </h2>
      <p className="mt-1 text-base text-slate-700">
        Box {boxes.map((b) => b.box_no).join(', ')}. Put the 4 × 6 roll in the printer, print them, and stick each one over the number written on its box.
      </p>
      {error && <p className="mt-2 text-base font-semibold text-red-600" role="alert">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void print()} disabled={!!busy} className={`${btn.blue} disabled:opacity-60`}>
          <Icon name="printer" size={16} /> {busy ?? 'Print'}
        </button>
        <button type="button" onClick={() => void pdf()} disabled={!!busy} className={`${btn.outline} disabled:opacity-60`}>
          PDF
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">Printing or saving the PDF marks them printed. A box page can print its own label again.</p>
    </section>
  )
}
