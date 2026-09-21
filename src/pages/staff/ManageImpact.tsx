// Staff → Impact: the yearly numbers (desktop mirror of the app's editor).
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card } from '../../components/ui'
import { IMPACT_FIELDS, type ImpactYear } from '../Impact'

type Draft = { fields: Record<string, string>; highlights: string; note: string; is_published: boolean }
function toDraft(r: ImpactYear | null): Draft {
  const d: Draft = { fields: {}, highlights: r?.highlights.join('\n') ?? '', note: r?.note ?? '', is_published: r?.is_published ?? false }
  for (const f of IMPACT_FIELDS) {
    const v = r?.[f.key]
    d.fields[f.key] = v == null ? '' : f.money ? String(Math.round(Number(v) / 100)) : String(v)
  }
  return d
}

export default function ManageImpact() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<ImpactYear[] | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [d, setD] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('impact_years').select('*').eq('org_id', orgId).order('year', { ascending: false })
    if (error) setError(errMessage(error))
    else setRows((data ?? []) as ImpactYear[])
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
  }, [orgId, load])
  useEffect(() => {
    if (rows) setD(toDraft(rows.find((r) => r.year === year) ?? null))
  }, [rows, year])

  if (!can('announcements.post')) return <p className="text-slate-600">You don’t have access to the impact page.</p>

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!d) return
    setBusy(true)
    setError(null)
    setMsg(null)
    const row: Record<string, unknown> = {
      org_id: orgId,
      year,
      highlights: d.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
      note: d.note.trim() || null,
      is_published: d.is_published,
      updated_by: user?.id ?? null,
    }
    for (const f of IMPACT_FIELDS) {
      const raw = d.fields[f.key].replace(/[^0-9.]/g, '')
      const n = raw === '' ? null : Number(raw)
      row[f.key] = n == null ? null : f.money ? Math.round(n * 100) : n
    }
    const { error } = await supabase.from('impact_years').upsert(row, { onConflict: 'org_id,year' })
    setBusy(false)
    if (error) setError(errMessage(error))
    else {
      await load()
      setMsg(d.is_published ? 'Saved and published — visible at /impact.' : 'Saved as a draft (not public yet).')
    }
  }
  const pullHours = async () => {
    const { data, error } = await supabase.rpc('volunteer_hours_total', { p_org: orgId, p_year: year })
    if (error) return setError(errMessage(error))
    const h = Math.round(Number(data ?? 0))
    setD((x) => (x ? { ...x, fields: { ...x.fields, volunteer_hours: String(h) } } : x))
    setMsg(`Volunteer hours recorded for ${year}: ${h}.`)
  }
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Impact numbers</h1>
      <p className="mt-1 text-sm text-slate-600">The year in numbers, for donors, sponsors and volunteers. Shown at /impact on the website and the app once published.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {years.map((y) => {
          const has = rows?.find((r) => r.year === y)
          return (
            <button key={y} type="button" onClick={() => setYear(y)} className={year === y ? btn.blue : btn.outline}>
              {y}
              {has ? (has.is_published ? ' ●' : ' ○') : ''}
            </button>
          )
        })}
      </div>
      {rows === null && !error && <Spinner />}
      {d && (
        <form onSubmit={save} className="mt-6 max-w-3xl space-y-4">
          <Card className="grid gap-4 sm:grid-cols-2">
            {IMPACT_FIELDS.map((f) => (
              <label key={f.key} className="block text-sm font-semibold text-slate-700">
                {f.label}
                <span className="block text-xs font-normal text-slate-500">{f.hint}</span>
                <div className="flex gap-2">
                  <input className={staffInput} inputMode="decimal" value={d.fields[f.key]} onChange={(e) => setD({ ...d, fields: { ...d.fields, [f.key]: e.target.value } })} />
                  {f.key === 'volunteer_hours' && (
                    <button type="button" onClick={() => void pullHours()} className="mt-1 shrink-0 rounded-xl bg-brand-blue-50 px-3 text-xs font-bold text-brand-blue">
                      Use recorded hours
                    </button>
                  )}
                </div>
              </label>
            ))}
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Highlights — one per line (optional)
              <textarea className={staffInput} rows={4} value={d.highlights} onChange={(e) => setD({ ...d, highlights: e.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              One line under the numbers (optional)
              <input className={staffInput} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} />
              Show this year publicly
            </label>
          </Card>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          {msg && <p className="text-sm font-semibold text-green-700">{msg}</p>}
          <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}
