// Tag sheets for "Scan an item" — the desktop copy of the app's printer, since
// the printer is usually next to a computer. Same layout as the app: Avery
// 5163 / 8163 labels (2" × 4", 10 per US-Letter sheet), each with a QR that
// opens <app>/t/CODE and the five-character code printed large. Codes become
// real items the first time someone scans one and fills it in.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { APP_URL } from '../../lib/constants'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'

const PER_SHEET = 10
// Same alphabet as the app (no 0/O, 1/I) — a code can be read aloud or typed.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function newCode(): string {
  for (;;) {
    const buf = new Uint32Array(5)
    crypto.getRandomValues(buf)
    const body = Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('')
    if (/[A-Z]/.test(body)) return body
  }
}
function makeCodes(n: number): string[] {
  const seen = new Set<string>()
  while (seen.size < n) seen.add(newCode())
  return [...seen]
}

export default function PrintTags() {
  const [sheets, setSheets] = useState(1)
  const [codes, setCodes] = useState<string[]>(() => makeCodes(PER_SHEET))
  const [qrs, setQrs] = useState<Record<string, string>>({})

  useEffect(() => {
    setCodes((c) => (c.length === sheets * PER_SHEET ? c : makeCodes(sheets * PER_SHEET)))
  }, [sheets])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const out: Record<string, string> = {}
      for (const c of codes) out[c] = await QRCode.toDataURL(`${APP_URL}/t/${c}`, { errorCorrectionLevel: 'M', margin: 1, width: 320 })
      if (alive) setQrs(out)
    })()
    return () => {
      alive = false
    }
  }, [codes])

  const ready = useMemo(() => codes.every((c) => qrs[c]), [codes, qrs])

  return (
    <>
      <div className="print:hidden">
        <Link to="/staff/items" className="inline-flex items-center gap-1 text-sm font-bold text-brand-blue">
          <Icon name="arrowLeft" size={16} /> Scanned items
        </Link>
        <h1 className="mt-2 font-display text-2xl font-black text-ink">Print tag sheets</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Load Avery 5163 / 8163 labels (2″ × 4″, 10 per sheet) — or plain paper and cut along the dashed lines. Stick one tag on each donated item; scanning it in the app asks what the item is and takes it from there.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Sheets
            <select value={sheets} onChange={(e) => setSheets(Number(e.target.value))} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} ({n * PER_SHEET} tags)
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => window.print()} disabled={!ready} className={`${btn.orange} disabled:opacity-60`}>
            <Icon name="printer" size={16} /> Print
          </button>
          <button type="button" onClick={() => setCodes(makeCodes(sheets * PER_SHEET))} className={btn.outline}>
            New codes
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Every print makes a fresh set of codes, so sheets never repeat. Use “Save as PDF” in the print dialog to email a sheet.</p>

        <div className="mt-6 grid max-w-3xl grid-cols-2 gap-3">
          {codes.slice(0, 4).map((c) => (
            <Tag key={c} code={c} qr={qrs[c]} />
          ))}
        </div>
      </div>

      <div className="hidden print:block">
        {Array.from({ length: sheets }, (_, s) => (
          <div key={s} className="tag-sheet">
            {codes.slice(s * PER_SHEET, (s + 1) * PER_SHEET).map((c) => (
              <Tag key={c} code={c} qr={qrs[c]} print />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in 0.15625in; }
          body { background: white !important; }
          header, nav, footer { display: none !important; }
          main, [class*="max-w-"] { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          .tag-sheet { display: grid; grid-template-columns: 4in 4in; grid-auto-rows: 2in; column-gap: 0.1875in; page-break-after: always; }
          .tag { width: 4in; height: 2in; box-sizing: border-box; display: flex; align-items: center; gap: 0.2in; padding: 0.15in 0.25in; border: 1px dashed #cbd5e1; border-radius: 0; }
          .tag img { width: 1.55in; height: 1.55in; }
          .tag .code { font-size: 30pt; letter-spacing: 0.12em; }
          .tag .brand { font-size: 10pt; }
          .tag .hint { font-size: 8pt; }
        }
      `}</style>
    </>
  )
}

function Tag({ code, qr, print = false }: { code: string; qr?: string; print?: boolean }) {
  return (
    <div className={`tag ${print ? '' : 'flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3'}`}>
      {qr ? <img src={qr} alt="" className={print ? '' : 'h-24 w-24'} /> : <span className={print ? '' : 'h-24 w-24 rounded bg-slate-100'} />}
      <div className="min-w-0 flex-1">
        <p className="brand font-display text-[11px] font-extrabold uppercase tracking-wider text-brand-blue">Ohio House Rabbit Rescue</p>
        <p className="code font-mono text-2xl font-black tracking-[0.12em] text-ink">{code}</p>
        <p className="hint text-xs leading-tight text-slate-500">Scan with the OHRR app, or type the code.</p>
      </div>
    </div>
  )
}
