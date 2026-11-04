// Rename a box in place ("Box 12" → "Storage box 12"). The word is picked from a short list or typed; the number stays
// with it. Naming it "Box 12" again puts it back to the plain number. The website's copy of the app's BoxNameEditor
// (src/features/scan/pages/Boxes.tsx).
import { useState } from 'react'
import { errMessage } from '../lib/supabase'
import { staffInput } from '../lib/staff'
import { NEEDS_50, setBoxDetails, type Box } from '../lib/boxes'
import { boxTitle } from '../lib/codes'
import { btn } from './ui'

const BOX_WORDS = ['Box', 'Storage box', 'Bin', 'Tote', 'Crate']

export default function BoxNameEditor({ orgId, box, onSaved }: { orgId: string; box: Box; onSaved: (b: Box) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const plain = `Box ${box.box_no}`
      const name = text.trim() === plain ? '' : text.trim()
      const next = await setBoxDetails(orgId, box.code, {
        name,
        description: box.description ?? '',
        eventId: box.event_id ?? null,
        partNo: box.part_no ?? null,
        partOf: box.part_of ?? null,
      })
      onSaved(next)
      setOpen(false)
    } catch (e) {
      const m = errMessage(e)
      setError(/set_box_details|function/i.test(m) ? NEEDS_50 : m)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setText(boxTitle(box))
          setOpen(true)
        }}
        className="inline-flex min-h-11 items-center text-[15px] font-bold text-brand-blue"
      >
        Rename this box (now “{boxTitle(box)}”)
      </button>
    )
  }
  return (
    <div className="mt-2 max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-base font-bold text-ink">What is it?</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kind of container">
        {BOX_WORDS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setText(`${w} ${box.box_no}`)}
            className="min-h-11 rounded-full border-2 border-slate-200 bg-white px-4 text-[15px] font-bold text-slate-700 hover:bg-brand-blue-50"
          >
            {w}
          </button>
        ))}
      </div>
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={60} placeholder="Or type a name" aria-label="Box name" className={staffInput} />
      {error && (
        <p role="alert" className="text-base font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void save()} disabled={busy || !text.trim()} className={`${btn.blue} disabled:opacity-60`}>
          {busy ? 'Saving…' : 'Save the name'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className={btn.outline}>
          Cancel
        </button>
      </div>
    </div>
  )
}
