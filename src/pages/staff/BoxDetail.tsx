// One box (/staff/boxes/:code, update 46) — the website's copy of the app's
// scan/pages/BoxDetail.tsx, made for a laptop at the desk: what's in the box,
// adding items with a USB barcode scanner or by typing (the box stays
// focused for the next label), the webcam, or ticking them in a list; where
// it's kept; and the 4 × 6 in box label (Print or PDF) and a letter-size
// packing list. A box code typed into Scan an item lands here. No Bluetooth
// printing here — that's the app's.
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import Scanner from '../../components/Scanner'
import { boxName, isBoxCode, normalizeCode } from '../../lib/codes'
import { KIND_META, listItems, type TaggedItem } from '../../lib/items'
import { LABEL_SIZES, labelDataUrl, labelsPdf, type LabelItem } from '../../lib/labels'
import { PAGE_SIZE, filterRows, groupByDay, type ListRow } from '../../lib/labelList'
import { boxByCode, deleteBox, markBoxesPrinted, packingListPdf, putInBox, saveBox, takeOutOfBox, type Box, type BoxPutResult } from '../../lib/boxes'

/** Box labels are 4 × 6 in (OHRR, 2026-10-27). */
const BOX_SIZE = LABEL_SIZES.find((s) => s.key === '4x6') ?? { key: '4x6', label: '4 × 6 in', wIn: 4, hIn: 6 }

interface LogLine {
  ok: boolean
  text: string
}

interface PickRow extends ListRow {
  photo_url: string | null
  box: TaggedItem['box']
}

const select = `${staffInput} !py-3 text-base`

function boxLabel(box: Box): LabelItem {
  return { code: box.code, title: boxName(box.code), box: { items: box.items.map((i) => ({ code: i.code, title: i.title })), location: box.location } }
}

/** What happened to one scanned or ticked item, in a sentence. */
function resultLines(res: BoxPutResult, codes: string[]): LogLine[] {
  const out: LogLine[] = []
  for (const c of res.not_found) out.push({ ok: false, text: `No item has the code ${c}. Add it first (Add a donation), then scan it again.` })
  for (const m of res.moved) out.push({ ok: true, text: `${m.title} — moved here from ${boxName(m.from)}.` })
  const fresh = res.added - res.moved.length
  if (fresh > 0 && codes.length === 1) {
    const last = [...(res.box?.items ?? [])].sort((a, b) => (b.boxed_at ?? '').localeCompare(a.boxed_at ?? ''))[0]
    out.push({ ok: true, text: `Added: ${last?.title ?? codes[0]}.` })
  } else if (fresh > 0) {
    out.push({ ok: true, text: `${fresh} item${fresh === 1 ? '' : 's'} added.` })
  }
  if (res.added === 0 && res.not_found.length === 0) out.push({ ok: true, text: codes.length === 1 ? 'Already in this box.' : 'They were already in this box.' })
  return out
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function BoxDetail() {
  const { code: rawCode = '' } = useParams()
  const code = normalizeCode(rawCode)
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [box, setBox] = useState<Box | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [camera, setCamera] = useState(false)
  // The webcam reads one code and stops; a new key starts it again for the next label.
  const [cameraKey, setCameraKey] = useState(0)
  const [log, setLog] = useState<LogLine[]>([])
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [place, setPlace] = useState('')
  const [memo, setMemo] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [printImgs, setPrintImgs] = useState<string[]>([])
  const [copies, setCopies] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const fresh = searchParams.get('scan') === '1'

  const backToBox = () => inputRef.current?.focus({ preventScroll: true })

  // Another box (a link, or a box code typed into Scan an item): start fresh.
  useEffect(() => {
    setPicking(false)
    setCamera(false)
    setLog([])
    setNote(null)
    setEditing(false)
  }, [code])

  const load = useCallback(async () => {
    if (!orgId || !code) return
    try {
      const b = await boxByCode(orgId, code)
      setBox(b)
      setError(null)
    } catch (e) {
      setError(errMessage(e))
      setBox((b) => b ?? null)
    }
  }, [orgId, code])

  useEffect(() => {
    void load()
    const again = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', again)
    return () => document.removeEventListener('visibilitychange', again)
  }, [load])

  // The label preview follows what's in the box.
  const labelKey = box ? JSON.stringify([box.code, box.location, box.items.map((i) => [i.code, i.title])]) : ''
  useEffect(() => {
    if (!box) return
    let alive = true
    labelDataUrl(boxLabel(box), BOX_SIZE, 120)
      .then((u) => alive && setPreview(u))
      .catch(() => alive && setPreview(null))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelKey])

  const addCodes = async (codes: string[]) => {
    if (!box) return
    const res = await putInBox(orgId, box.code, codes)
    if (res.box) setBox(res.box)
    return res
  }

  // One scanned (or typed) code: an item goes in; a box label is just pointed out.
  const handleCode = async (raw: string) => {
    if (!box) return
    const c = normalizeCode(raw)
    if (!c) {
      setLog((l) => [{ ok: false, text: 'That didn’t look like a label. Try again, or type the code.' }, ...l])
      return
    }
    if (isBoxCode(c)) {
      setLog((l) => [{ ok: false, text: c === box.code ? 'That’s this box’s own label — scan an item’s label.' : `That’s the label of ${boxName(c)}, not an item.` }, ...l])
      return
    }
    try {
      const res = await addCodes([c])
      if (res) setLog((l) => [...resultLines(res, [c]), ...l].slice(0, 20))
    } catch (e) {
      setLog((l) => [{ ok: false, text: errMessage(e) }, ...l])
    }
  }

  // Enter (a USB scanner presses it after the code): add it, clear the box, stay in it for the next label.
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = typed
    setTyped('')
    if (t.trim()) void handleCode(t)
    requestAnimationFrame(backToBox)
  }

  const fromCamera = async (raw: string) => {
    await handleCode(raw)
    // A moment to move the label away before the camera looks again.
    setTimeout(() => setCameraKey((k) => k + 1), 1200)
  }

  const remove = async (itemCode: string) => {
    setError(null)
    try {
      await takeOutOfBox(orgId, [itemCode])
      await load()
    } catch (e) {
      setError(errMessage(e))
    }
  }

  const saveDetails = async () => {
    if (!box) return
    setBusy('Saving…')
    setError(null)
    try {
      setBox(await saveBox(orgId, box.code, place, memo))
      setEditing(false)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const removeBox = async () => {
    if (!box) return
    if (!window.confirm(`Delete ${boxName(box.code)}? The ${box.items.length} item${box.items.length === 1 ? '' : 's'} in it stay — they just won’t be in a box.`)) return
    setBusy('Deleting…')
    try {
      await deleteBox(orgId, box.code)
      navigate('/staff/boxes', { replace: true })
    } catch (e) {
      setError(errMessage(e))
      setBusy(null)
    }
  }

  const marked = async (msg: string) => {
    if (!box) return
    setNote(msg)
    try {
      await markBoxesPrinted(orgId, [box.code])
      setBox((b) => (b ? { ...b, label_printed_at: new Date().toISOString() } : b))
    } catch {
      /* the note still stands */
    }
  }

  const print = async () => {
    if (!box) return
    setBusy('Making the label…')
    setError(null)
    try {
      const img = await labelDataUrl(boxLabel(box), BOX_SIZE)
      setPrintImgs(Array.from({ length: copies }, () => img))
      // Let the print pages render before the dialog opens.
      await new Promise((r) => setTimeout(r, 200))
      window.print()
      await marked(`${boxName(box.code)} label sent to print and marked as printed.`)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const labelPdf = async () => {
    if (!box) return
    setBusy('Making the PDF…')
    setError(null)
    try {
      const label = boxLabel(box)
      download(await labelsPdf(Array.from({ length: copies }, () => label), BOX_SIZE), `ohrr-${box.code.toLowerCase()}-label.pdf`)
      await marked(`${boxName(box.code)} label: a 4 × 6 in PDF, marked as printed.`)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const listPdf = async () => {
    if (!box) return
    setBusy('Making the packing list…')
    setError(null)
    try {
      download(await packingListPdf(box), `ohrr-${box.code.toLowerCase()}-packing-list.pdf`)
      setNote('Packing list made — print it on letter paper to go inside the box.')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const errorBox = error && (
    <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700" role="alert">
      {error}
    </p>
  )

  if (box === undefined) {
    return (
      <div className="max-w-3xl">
        {errorBox}
        {!error && <Spinner />}
      </div>
    )
  }
  if (box === null) {
    return (
      <div className="max-w-3xl">
        <BackLink />
        <h1 className="mt-1 font-display text-2xl font-black text-ink">{isBoxCode(code) ? boxName(code) : code}</h1>
        {errorBox}
        {!error && <p className="mt-2 text-base text-slate-600">There’s no box with that number.</p>}
      </div>
    )
  }

  const name = boxName(box.code)
  return (
    <>
      <div className="print:hidden">
        <BackLink />
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4">
          <h1 className="font-display text-3xl font-black text-ink">{name}</h1>
          <span className="font-mono text-sm font-bold tracking-widest text-slate-500">{box.code}</span>
        </div>
        {!editing && (
          <p className="mt-1 text-base text-slate-600">
            {box.items.length} item{box.items.length === 1 ? '' : 's'}
            {box.location ? ` · Kept: ${box.location}` : ''}{' '}
            <button
              type="button"
              onClick={() => {
                setPlace(box.location ?? '')
                setMemo(box.note ?? '')
                setEditing(true)
              }}
              className="min-h-11 font-bold text-brand-blue"
            >
              {box.location || box.note ? 'Change' : 'Where is it kept?'}
            </button>
          </p>
        )}
        {!editing && box.note && <p className="text-base text-slate-500">{box.note}</p>}

        {editing && (
          <div className="mt-3 max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block text-base font-bold text-ink">
              Where it’s kept
              <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} placeholder="e.g. Garage shelf B" className={staffInput} />
            </label>
            <label className="block text-base font-bold text-ink">
              Note <span className="font-normal text-slate-500">(optional)</span>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={500} rows={2} className={staffInput} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveDetails()} disabled={!!busy} className={`${btn.blue} disabled:opacity-60`}>
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className={btn.outline}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {errorBox}

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0">
            {picking ? (
              <Picker
                orgId={orgId}
                box={box}
                onCancel={() => setPicking(false)}
                onPut={async (codes) => {
                  const res = await addCodes(codes)
                  if (res) setLog(resultLines(res, codes))
                  setPicking(false)
                }}
              />
            ) : (
              <>
                {/* The box a USB scanner types into */}
                <form onSubmit={submit} className="rounded-2xl border-2 border-brand-orange/60 bg-white p-4 shadow-sm" aria-label={`Put items in ${name}`}>
                  <label htmlFor="box-code" className="block font-display text-lg font-extrabold text-ink">
                    Scan each item’s label
                  </label>
                  <p id="box-code-help" className="text-base text-slate-600">
                    With a barcode scanner, just scan the labels one after another. Or type the number under the barcode and press Enter.
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                    <input
                      id="box-code"
                      ref={inputRef}
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      autoFocus={fresh || !!typed}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      enterKeyHint="go"
                      placeholder="DON-00042"
                      aria-describedby="box-code-help"
                      className="min-h-14 w-full min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 font-mono text-xl font-bold uppercase tracking-widest text-ink outline-none transition placeholder:text-slate-300 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/20"
                    />
                    <button type="submit" disabled={!typed.trim()} className={`${btn.blue} min-h-14 px-8 text-base disabled:opacity-60`}>
                      <Icon name="plus" size={18} /> Put it in
                    </button>
                  </div>
                  {log.length > 0 && (
                    <ul className="mt-3 space-y-1" aria-live="polite">
                      {log.slice(0, 5).map((l, i) => (
                        <li
                          key={i}
                          className={`flex items-start gap-2 rounded-xl px-3 py-2 text-base font-semibold ${l.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'} ${i > 0 ? 'opacity-60' : ''}`}
                        >
                          <Icon name={l.ok ? 'check' : 'x'} size={18} className="mt-0.5 shrink-0" />
                          {l.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCamera((c) => !c)}
                      aria-pressed={camera}
                      className={camera ? `${btn.blue}` : btn.outline}
                    >
                      <Icon name="camera" size={16} /> {camera ? 'Stop the camera' : 'Use the camera'}
                    </button>
                    <button type="button" onClick={() => setPicking(true)} className={btn.outline}>
                      Pick from a list
                    </button>
                  </div>
                  {camera && (
                    <div className="mt-3">
                      <Scanner key={cameraKey} onResult={(raw) => void fromCamera(raw)} />
                    </div>
                  )}
                </form>

                {/* What's in it */}
                <section className="mt-6" aria-label={`In ${name}`}>
                  <h2 className="font-display text-lg font-extrabold text-ink">
                    In this box <span className="font-sans text-sm font-semibold text-slate-500">· {box.items.length}</span>
                  </h2>
                  {box.items.length === 0 ? (
                    <p className="mt-2 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-base text-slate-500">Nothing yet — scan the items’ labels to put them in.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {box.items.map((i) => (
                        <li key={i.code} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                          {i.photo_url ? (
                            <img src={i.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                          ) : (
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                              <Icon name={KIND_META[i.kind]?.icon ?? 'box'} size={22} />
                            </span>
                          )}
                          <Link to={`/staff/scan?code=${encodeURIComponent(i.code)}`} className="min-w-0 flex-1">
                            <span className="block truncate font-display text-base font-extrabold text-ink">{i.title}</span>
                            <span className="block truncate font-mono text-sm font-bold text-slate-500">{i.code}</span>
                          </Link>
                          <button type="button" onClick={() => void remove(i.code)} className="min-h-11 shrink-0 px-2 text-sm font-bold text-red-700" aria-label={`Take ${i.title} out of the box`}>
                            Take out
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>

          {/* The box label and the packing list — stay in view while scanning */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-extrabold text-ink">Box label · 4 × 6 in</h2>
              {preview && (
                <img src={preview} alt={`${name} label preview`} className="mx-auto mt-3 w-full max-w-[16rem] rounded-lg border border-slate-200 shadow-sm" style={{ aspectRatio: '4 / 6' }} />
              )}
              <label className="mt-3 block text-sm font-semibold text-slate-700">
                Copies
                <select value={copies} onChange={(e) => setCopies(Number(e.target.value))} className={select}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? '1 label' : `${n} labels`}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => void print()} disabled={!!busy} className={`${btn.orange} disabled:opacity-60`}>
                  <Icon name="printer" size={16} /> {busy ?? 'Print'}
                </button>
                <button type="button" onClick={() => void labelPdf()} disabled={!!busy} className={`${btn.outline} disabled:opacity-60`}>
                  PDF
                </button>
              </div>
              <button type="button" onClick={() => void listPdf()} disabled={!!busy} className={`${btn.outline} mt-3 w-full disabled:opacity-60`}>
                <Icon name="file" size={16} /> Packing list (letter paper)
              </button>
              {note && (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">
                  {note}
                </p>
              )}
              <p className="mt-3 text-sm text-slate-600">
                {box.label_printed_at ? 'The label has been printed. ' : ''}
                In the print dialog choose the label printer and a 4 × 6 in label; margins are zero. The label lists the names; scanning it opens this page with everything in the box.
              </p>
            </div>
            <button type="button" onClick={() => void removeBox()} disabled={!!busy} className="min-h-11 text-sm font-bold text-red-700">
              Delete this box
            </button>
          </div>
        </div>
      </div>

      {/* print-only: the box label at 4 × 6 in */}
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

function BackLink() {
  return (
    <Link to="/staff/boxes" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
      <Icon name="arrowLeft" size={16} /> Boxes
    </Link>
  )
}

/** Tick items to put in the box: those not in any box yet, newest first, by day. */
function Picker({ orgId, box, onPut, onCancel }: { orgId: string; box: Box; onPut: (codes: string[]) => Promise<void>; onCancel: () => void }) {
  const [rows, setRows] = useState<PickRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [which, setWhich] = useState<'nobox' | 'all'>('nobox')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    listItems(orgId)
      .then((items) => {
        if (!alive) return
        setRows(
          items.map((i) => ({
            code: i.code,
            title: i.title,
            sub: [KIND_META[i.kind].label, i.donated_by ? `Gift of ${i.donated_by}` : null].filter(Boolean).join(' · '),
            label_printed_at: i.label_printed_at ?? null,
            added: i.created_at ?? null,
            kind: i.kind,
            photo_url: i.photo_url,
            box: i.box ?? null,
          })),
        )
      })
      .catch((e) => alive && setError(errMessage(e)))
    return () => {
      alive = false
    }
  }, [orgId])

  const inThis = useMemo(() => new Set(box.items.map((i) => i.code)), [box.items])
  const base = (rows ?? []).filter((r) => !inThis.has(r.code) && (which === 'all' || !r.box))
  const shown = filterRows(base, { show: 'all', when: 'any', kind: 'all', sort: 'newest' }, q, picked)
  const groups = groupByDay(shown.slice(0, limit), 'newest')
  const toggle = (c: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(c)) n.delete(c)
      else n.add(c)
      return n
    })

  const put = async () => {
    setBusy(true)
    setError(null)
    try {
      await onPut([...picked])
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <section aria-label={`Pick items for ${boxName(box.code)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold text-ink">Pick items for {boxName(box.code)}</h2>
        <button type="button" onClick={onCancel} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
          Cancel
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-slate-700">
          Show
          <select value={which} onChange={(e) => setWhich(e.target.value as 'nobox' | 'all')} className={select}>
            <option value="nobox">Not in a box yet</option>
            <option value="all">Everything</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Find
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or code" className={select} />
        </label>
      </div>
      <button type="button" onClick={() => void put()} disabled={busy || picked.size === 0} className={`${btn.orange} mt-3 w-full text-base disabled:opacity-60 sm:w-auto`}>
        <Icon name="box" size={18} /> {busy ? 'Putting them in…' : picked.size === 0 ? 'Tick the items for this box' : `Put ${picked.size} in ${boxName(box.code)}`}
      </button>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
      {rows === null && !error && <Spinner />}
      {rows && shown.length === 0 && (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-base text-slate-500">
          {which === 'nobox' && !q.trim() ? 'Every item is in a box already.' : 'Nothing matches.'}
        </p>
      )}
      {groups.map((g) => (
        <section key={g.heading || 'all'} className="mt-3">
          {g.heading && (
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-extrabold text-ink">
                {g.heading} <span className="font-sans text-sm font-semibold text-slate-500">· {g.rows.length}</span>
              </h3>
              <button type="button" onClick={() => setPicked((p) => new Set([...p, ...g.rows.map((r) => r.code)]))} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
                Tick these {g.rows.length}
              </button>
            </div>
          )}
          <ul className="mt-1 space-y-2">
            {g.rows.map((r) => {
              const on = picked.has(r.code)
              return (
                <li key={r.code} className={`rounded-2xl border transition ${on ? 'border-brand-blue bg-brand-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 p-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(r.code)} className="h-6 w-6 shrink-0 accent-brand-blue" aria-label={`Put ${r.title} in the box`} />
                    {r.photo_url ? (
                      <img src={r.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <Icon name={KIND_META[r.kind as TaggedItem['kind']]?.icon ?? 'box'} size={22} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-base font-extrabold text-ink">{r.title}</span>
                      <span className="block truncate text-sm text-slate-600">
                        {r.sub}
                        {r.box ? ` · now in ${boxName(r.box.code)}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold text-slate-500">{r.code}</span>
                  </label>
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
  )
}
