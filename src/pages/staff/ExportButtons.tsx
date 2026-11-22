// "Download with photos" for the staff lists (Items, Hop Shop inventory): an
// Excel file with a picture in every row, or a plain CSV. Exports what the
// list is showing, so a filter or a search narrows the file too.
import { useState } from 'react'
import { errMessage } from '../../lib/supabase'
import { Icon } from '../../components/icons'
import { downloadSheetCsv, downloadSheetWithPhotos, type SheetSpec } from '../../lib/inventoryExport'

const pill =
  'inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50'

export default function ExportButtons({
  spec,
  label = 'Download with photos',
  pdf,
}: {
  spec: () => SheetSpec
  label?: string
  /** A PDF report, offered first (the Items spreadsheet's report with photos). */
  pdf?: { label: string; filename: string; build: (progress: (msg: string) => void) => Promise<{ blob: Blob; missing: number }> }
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [running, setRunning] = useState<'excel' | 'pdf'>('excel')
  const [msg, setMsg] = useState<string | null>(null)

  const makePdf = async () => {
    if (!pdf) return
    setMsg(null)
    setRunning('pdf')
    setBusy('Starting…')
    try {
      const { blob, missing } = await pdf.build(setBusy)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pdf.filename}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setMsg(`The PDF is downloaded.${missing ? ` ${missing} photo${missing === 1 ? '' : 's'} didn’t load and show as an empty box.` : ''}`)
    } catch (e) {
      setMsg(`Couldn’t make the PDF: ${errMessage(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const excel = async () => {
    const s = spec()
    if (!s.rows.length) return
    setMsg(null)
    setRunning('excel')
    setBusy('Starting…')
    try {
      const { missing } = await downloadSheetWithPhotos(s, (done, total) => setBusy(total ? `Photos ${done} of ${total}…` : 'Making the file…'))
      const n = s.rows.length
      setMsg(
        `${n} item${n === 1 ? '' : 's'} downloaded.` +
          (missing ? ` ${missing} photo${missing === 1 ? '' : 's'} didn’t load; ${missing === 1 ? 'its' : 'their'} link is in the sheet.` : ''),
      )
    } catch (e) {
      setMsg(`Couldn’t make the spreadsheet: ${errMessage(e)}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pdf && (
        <button type="button" onClick={() => void makePdf()} disabled={!!busy} className={`${pill} !border-brand-blue !text-brand-blue`} title="A report to print or email, with the photos on each line">
          <Icon name="file" size={16} /> {busy && running === 'pdf' ? busy : pdf.label}
        </button>
      )}
      <button type="button" onClick={() => void excel()} disabled={!!busy} className={pill} title="An Excel file with a picture of each item">
        <Icon name="file" size={16} /> {busy && running === 'excel' ? busy : label}
      </button>
      <button type="button" onClick={() => downloadSheetCsv(spec())} disabled={!!busy} className={pill} title="A CSV with links to the photos">
        CSV
      </button>
      {msg && (
        <span role="status" className="text-sm text-slate-600">
          {msg}
        </span>
      )}
    </div>
  )
}
