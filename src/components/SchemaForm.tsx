// A whole schema-driven form on one page (desktop): sections with headings,
// the same question types as the app's SchemaField, an agreement block with
// a typed signature, and a send button. Used by the adoption application and
// the surrender intake forms; answers go to the staff Inbox via submitRequest.
import { useState, type FormEvent, type ReactNode } from 'react'
import type { FormField, FormSection } from '../data/surrenderForm'
import { btn, Card } from './ui'
import { submitRequest, type RequestKind } from '../lib/requests'

export type Values = Record<string, string | string[]>

export const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'

const pill = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-bold transition ${active ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`

export function Field({ f, values, setVal, toggle }: { f: FormField; values: Values; setVal: (n: string, v: string | string[]) => void; toggle: (n: string, o: string) => void }) {
  const val = values[f.name]
  const label = (
    <>
      {f.label}
      {f.required && <span className="text-brand-orange"> *</span>}
    </>
  )
  if (f.type === 'radio' || f.type === 'checkboxes') {
    const arr = Array.isArray(val) ? val : []
    return (
      <div>
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {f.options!.map((o) => {
            const active = f.type === 'radio' ? val === o : arr.includes(o)
            return (
              <button key={o} type="button" onClick={() => (f.type === 'radio' ? setVal(f.name, active ? '' : o) : toggle(f.name, o))} className={pill(active)}>
                {o}
              </button>
            )
          })}
        </div>
        {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
      </div>
    )
  }
  if (f.type === 'textarea') {
    return (
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        <textarea rows={3} required={f.required} value={(val as string) ?? ''} onChange={(e) => setVal(f.name, e.target.value)} className={inputClass} placeholder={f.placeholder} />
        {f.help && <span className="mt-1 block text-xs font-normal text-slate-500">{f.help}</span>}
      </label>
    )
  }
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input type={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text'} required={f.required} value={(val as string) ?? ''} onChange={(e) => setVal(f.name, e.target.value)} className={inputClass} placeholder={f.placeholder} />
      {f.help && <span className="mt-1 block text-xs font-normal text-slate-500">{f.help}</span>}
    </label>
  )
}

export default function SchemaForm({
  kind,
  sections,
  initial = {},
  extra = {},
  agreement,
  submitLabel = 'Send',
  onDone,
  children,
}: {
  kind: RequestKind
  sections: FormSection[]
  initial?: Values
  /** Fixed fields added to every submission (e.g. the intake type). */
  extra?: Record<string, string>
  /** Statements the person must tick, plus a typed signature and date. */
  agreement?: { statements: string[]; footnote?: string }
  submitLabel?: string
  onDone: (values: Values) => void
  children?: ReactNode
}) {
  const [values, setValues] = useState<Values>(initial)
  const [ticked, setTicked] = useState<boolean[]>(() => (agreement?.statements ?? []).map(() => false))
  const [signature, setSignature] = useState('')
  const [signDate, setSignDate] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setVal = (n: string, v: string | string[]) => setValues((s) => ({ ...s, [n]: v }))
  const toggle = (n: string, o: string) =>
    setValues((s) => {
      const cur = Array.isArray(s[n]) ? (s[n] as string[]) : []
      return { ...s, [n]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] }
    })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    // required pills (radio/checkboxes) aren't native inputs — check them here
    const missing = sections.flatMap((s) => s.fields).filter((f) => f.required && (f.type === 'radio' || f.type === 'checkboxes') && (Array.isArray(values[f.name]) ? (values[f.name] as string[]).length === 0 : !values[f.name]))
    if (missing.length) {
      setError(`Please answer: ${missing.map((f) => f.label.slice(0, 50)).join(' · ')}`)
      return
    }
    if (agreement && (ticked.some((t) => !t) || !signature.trim())) {
      setError('Please tick each statement and type your name as a signature.')
      return
    }
    setBusy(true)
    const flat: Record<string, string> = { ...extra }
    for (const s of sections) for (const f of s.fields) {
      const v = values[f.name]
      const str = Array.isArray(v) ? v.join(', ') : (v ?? '')
      if (String(str).trim()) flat[f.name] = String(str)
    }
    if (agreement) {
      agreement.statements.forEach((st, i) => (flat[`agreed${i + 1}`] = st))
      flat.signature = signature.trim()
      flat.signatureDate = signDate
    }
    try {
      await submitRequest(kind, flat)
      onDone(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that right now.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {children}
      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="font-display text-xl font-extrabold text-ink">{s.title}</h2>
          {s.intro && <p className="mt-1 text-sm text-slate-500">{s.intro}</p>}
          <Card className="mt-3 grid gap-4 sm:grid-cols-2">
            {s.fields.map((f) => (
              <div key={f.name} className={f.type === 'textarea' || f.label.length > 70 ? 'sm:col-span-2' : ''}>
                <Field f={f} values={values} setVal={setVal} toggle={toggle} />
              </div>
            ))}
          </Card>
        </section>
      ))}
      {agreement && (
        <section>
          <h2 className="font-display text-xl font-extrabold text-ink">Agreement</h2>
          <Card className="mt-3 space-y-3">
            {agreement.statements.map((st, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-brand-blue-50/60 p-3">
                <input type="checkbox" checked={ticked[i]} onChange={(e) => setTicked((t) => t.map((x, k) => (k === i ? e.target.checked : x)))} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-blue" />
                <span className="text-sm text-ink">{st}</span>
              </label>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Signature — type your full name
                <input className={inputClass} required value={signature} onChange={(e) => setSignature(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Date
                <input type="date" className={inputClass} required value={signDate} onChange={(e) => setSignDate(e.target.value)} />
              </label>
            </div>
            {agreement.footnote && <p className="text-xs leading-relaxed text-slate-500">{agreement.footnote}</p>}
          </Card>
        </section>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
        {busy ? 'Sending…' : submitLabel}
      </button>
    </form>
  )
}
