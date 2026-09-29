// Print labels for cataloged items — the desk copy of the app's page, since
// USB label printers live next to a computer. QR + barcode + code + name +
// donor, at the size of the printer's labels. Tick the items (the unprinted
// ones are ticked by default), then Print — one label per page, margins zero —
// or make a PDF with one label per page to print from wherever the printer is.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { KIND_META, UPDATE_36_NOTE, isMissingFunction, listItems, markLabelsPrinted, type TaggedItem } from '../../lib/items'
import { LABEL_SIZES, customLabelSize, labelDataUrl, labelsPdf, loadLabelSize, saveLabelSize, type LabelItem, type LabelSize } from '../../lib/labels'

type Show = 'unprinted' | 'all'

function toLabel(i: TaggedItem): LabelItem {
  return { code: i.code, title: i.title, donated_by: i.donated_by, photo_url: i.photo_url, kindLabel: i.kind === 'donation' ? null : KIND_META[i.kind].label }
}

const chip = (on: boolean) =>
  `min-h-11 rounded-full px-4 text-sm font-bold transition ${on ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-blue'}`

export default function PrintLabels() {
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [items, setItems] = useState<TaggedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState<Show>('unprinted')
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

  const load = async () => {
    try {
      const rows = await listItems(orgId)
      setItems(rows)
      setPicked((p) => (p.size ? p : new Set(rows.filter((r) => !r.label_printed_at).map((r) => r.code))))
    } catch (e) {
      setError(errMessage(e))
    }
  }
  useEffect(() => {
    if (orgId) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (items ?? []).filter(
      (i) =>
        (show === 'all' || !i.label_printed_at) &&
        (!needle || i.title.toLowerCase().includes(needle) || i.code.toLowerCase().includes(needle) || (i.donated_by ?? '').toLowerCase().includes(needle)),
    )
  }, [items, show, q])
  const selected = useMemo(() => (items ?? []).filter((i) => picked.has(i.code)), [items, picked])

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
  }, [selected, shown, size])

  const chooseSize = (s: LabelSize) => {
    setSize(s)
    saveLabelSize(s)
    setCustomW(String(s.wIn))
    setCustomH(String(s.hIn))
  }
  const applyCustom = () => {
    const w = Number(customW)
    const h = Number(customH)
    if (w >= 0.5 && h >= 0.5 && w <= 8.5 && h <= 11) chooseSize(customLabelSize(w, h))
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
      const imgs: string[] = []
      for (const it of selected) imgs.push(await labelDataUrl(toLabel(it), size))
      setPrintImgs(imgs)
      // Let the print pages render before the dialog opens.
      await new Promise((r) => setTimeout(r, 200))
      window.print()
      const extra = await markPrinted(selected.map((s) => s.code))
      setNote(`${count(selected.length)} sent to print${extra ? '.' + extra : ' and marked as printed.'}`)
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
      const blob = await labelsPdf(selected.map(toLabel), size)
      const name = `ohrr-labels-${new Date().toISOString().slice(0, 10)}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      const extra = await markPrinted(selected.map((s) => s.code))
      setNote(`${count(selected.length)} in the PDF, each on its own ${size.wIn} × ${size.hIn} in page${extra ? '.' + extra : ', marked as printed.'}`)
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

  const unprintedCount = (items ?? []).filter((i) => !i.label_printed_at).length
  const label = (i: TaggedItem) => `${i.title}${i.donated_by ? `, from ${i.donated_by}` : ''}`

  return (
    <>
      <div className="print:hidden">
        <Link to="/staff/items" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
          <Icon name="arrowLeft" size={16} /> Items
        </Link>
        <h1 className="mt-1 font-display text-2xl font-black text-ink">Print labels</h1>
        <p className="mt-1 max-w-2xl text-base text-slate-600">
          One label per item: the QR code opens it, the barcode scans at the till or the desk, and the code can be typed. Any label printer works — tick the
          items, choose the label size, then Print.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          {/* The items to print, ticked */}
          <section aria-label="Items to print">
            <div className="flex flex-wrap items-center gap-2">
              {(['unprinted', 'all'] as Show[]).map((s) => (
                <button key={s} type="button" onClick={() => setShow(s)} aria-pressed={show === s} className={chip(show === s)}>
                  {s === 'unprinted' ? `Not printed yet (${unprintedCount})` : `Everything (${items?.length ?? 0})`}
                </button>
              ))}
              <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
              <button type="button" onClick={() => setPicked(new Set(shown.map((i) => i.code)))} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
                Tick all shown
              </button>
              <button type="button" onClick={() => setPicked(new Set())} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
                None
              </button>
            </div>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, donor or code"
              aria-label="Search items"
              className={`${staffInput} mt-3 max-w-md !py-3 text-base`}
            />

            {error && <p className="mt-4 text-base font-semibold text-red-600">{error}</p>}
            {items === null && !error && <Spinner />}
            {items && shown.length === 0 && (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-500">
                {items.length === 0 ? 'Nothing has a code yet. Add a donation on the Items page, or scan tags in the app.' : show === 'unprinted' ? 'Every label has been printed.' : 'Nothing matches.'}
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {shown.map((i) => {
                const on = picked.has(i.code)
                return (
                  <li key={i.tag_id}>
                    <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${on ? 'border-brand-blue bg-brand-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(i.code)} className="h-6 w-6 shrink-0 accent-brand-blue" aria-label={`Print a label for ${label(i)}`} />
                      {i.photo_url ? (
                        <img src={i.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                      ) : (
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <Icon name={KIND_META[i.kind].icon} size={22} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-base font-extrabold text-ink">{i.title}</span>
                        <span className="block truncate text-sm text-slate-600">
                          {i.donated_by ? `From ${i.donated_by} · ` : ''}
                          {KIND_META[i.kind].label}
                          {i.label_printed_at ? ' · printed' : ''}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-bold tracking-widest text-slate-500">{i.code.replace('OHRR-', '')}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Label size, preview and the print buttons — stay in view while ticking a long list */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="font-display text-lg font-extrabold text-ink">Label size</p>
              <p className="text-sm text-slate-600">The labels in your printer. Remembered on this computer.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {LABEL_SIZES.map((s) => (
                  <button key={s.key} type="button" onClick={() => chooseSize(s)} aria-pressed={size.key === s.key} className={chip(size.key === s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
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
              {preview && (
                <div className="mt-4">
                  <p className="mb-1 text-sm font-semibold text-slate-700">Preview · {size.label}</p>
                  <img src={preview} alt="Label preview" className="w-full max-w-sm rounded-lg border border-slate-200 shadow-sm" style={{ aspectRatio: `${size.wIn} / ${size.hIn}` }} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void print()} disabled={!!busy || selected.length === 0} className={`${btn.orange} disabled:opacity-60`}>
                <Icon name="printer" size={16} /> {busy ?? `Print ${selected.length}`}
              </button>
              <button type="button" onClick={() => void pdf()} disabled={!!busy || selected.length === 0} className={`${btn.outline} disabled:opacity-60`}>
                PDF
              </button>
            </div>
            {note && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {note}{' '}
                {lastMarked.length > 0 && (
                  <button type="button" onClick={() => void undo()} className="font-bold text-brand-blue">
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
