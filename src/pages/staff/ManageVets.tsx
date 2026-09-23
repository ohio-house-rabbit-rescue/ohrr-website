// Staff → Vets: the rabbit-savvy vet directory shown on /learn/vets, in the
// app's Find a vet, and — for practices ticked "gives the RHDV2 vaccine" — on
// the BunFest rabbit rules. Desktop mirror of the app's StaffVets.tsx; same
// `vets` table, same permission (Edit education / care content).
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card } from '../../components/ui'
import { VET_REGIONS } from '../../data/vets'

interface VetRow {
  id: string
  name: string
  doctors: string | null
  address: string | null
  city: string | null
  region: string
  phone: string | null
  phone2: string | null
  email: string | null
  website: string | null
  notes: string | null
  is_emergency: boolean
  is_low_cost_spay: boolean
  gives_rhdv2: boolean
  rhdv2_note: string | null
  is_published: boolean
  sort_order: number
}

type Draft = {
  name: string
  doctors: string
  address: string
  city: string
  region: string
  phone: string
  phone2: string
  email: string
  website: string
  notes: string
  is_emergency: boolean
  is_low_cost_spay: boolean
  gives_rhdv2: boolean
  rhdv2_note: string
  is_published: boolean
}

const EMPTY: Draft = {
  name: '',
  doctors: '',
  address: '',
  city: '',
  region: 'Central Ohio',
  phone: '',
  phone2: '',
  email: '',
  website: '',
  notes: '',
  is_emergency: false,
  is_low_cost_spay: false,
  gives_rhdv2: false,
  rhdv2_note: '',
  is_published: true,
}

function draftFrom(v: VetRow): Draft {
  return {
    name: v.name,
    doctors: v.doctors ?? '',
    address: v.address ?? '',
    city: v.city ?? '',
    region: v.region,
    phone: v.phone ?? '',
    phone2: v.phone2 ?? '',
    email: v.email ?? '',
    website: v.website ?? '',
    notes: v.notes ?? '',
    is_emergency: v.is_emergency,
    is_low_cost_spay: v.is_low_cost_spay,
    gives_rhdv2: v.gives_rhdv2,
    rhdv2_note: v.rhdv2_note ?? '',
    is_published: v.is_published,
  }
}

function toRow(d: Draft) {
  const t = (s: string) => s.trim() || null
  return {
    name: d.name.trim(),
    doctors: t(d.doctors),
    address: t(d.address),
    city: t(d.city),
    region: d.region.trim() || 'Central Ohio',
    phone: t(d.phone),
    phone2: t(d.phone2),
    email: t(d.email),
    website: t(d.website),
    notes: t(d.notes),
    is_emergency: d.is_emergency,
    is_low_cost_spay: d.is_low_cost_spay,
    gives_rhdv2: d.gives_rhdv2,
    rhdv2_note: d.gives_rhdv2 ? t(d.rhdv2_note) : null,
    is_published: d.is_published,
  }
}

const label = 'block text-sm font-semibold text-slate-700'
const tick = 'flex items-start gap-2.5 text-sm font-semibold text-slate-700'

function VetForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  submitLabel: string
  onSubmit: (d: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }))
  const check = (k: 'is_emergency' | 'is_low_cost_spay' | 'gives_rhdv2' | 'is_published') => (e: { target: { checked: boolean } }) =>
    setD((x) => ({ ...x, [k]: e.target.checked }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit(d)
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={label}>
        Practice name
        <input className={staffInput} required value={d.name} onChange={set('name')} />
      </label>
      <label className={label}>
        Doctors
        <input className={staffInput} value={d.doctors} onChange={set('doctors')} placeholder="Dr. …, Dr. …" />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>
          Street address
          <input className={staffInput} value={d.address} onChange={set('address')} />
        </label>
        <label className={label}>
          City, State ZIP
          <input className={staffInput} value={d.city} onChange={set('city')} placeholder="Columbus, OH 43214" />
        </label>
      </div>
      <label className={label}>
        Region
        <input className={staffInput} list="vet-regions" value={d.region} onChange={set('region')} />
        <datalist id="vet-regions">
          {VET_REGIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Phone
          <input className={staffInput} value={d.phone} onChange={set('phone')} placeholder="614-…" />
        </label>
        <label className={label}>
          Second phone / text
          <input className={staffInput} value={d.phone2} onChange={set('phone2')} placeholder="Text 614-…" />
        </label>
        <label className={label}>
          Email
          <input className={staffInput} type="email" value={d.email} onChange={set('email')} />
        </label>
        <label className={label}>
          Website
          <input className={staffInput} value={d.website} onChange={set('website')} placeholder="https://…" />
        </label>
      </div>
      <label className={label}>
        Notes
        <input className={staffInput} value={d.notes} onChange={set('notes')} placeholder="e.g. Open 24/7 for exotics emergencies" />
      </label>
      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        <label className={tick}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={d.is_emergency} onChange={check('is_emergency')} />
          24/7 / after-hours emergencies (shows a “24/7 emergencies” badge)
        </label>
        <label className={tick}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={d.is_low_cost_spay} onChange={check('is_low_cost_spay')} />
          Low-cost spay/neuter
        </label>
        <label className={tick}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={d.gives_rhdv2} onChange={check('gives_rhdv2')} />
          Gives the RHDV2 vaccine (BunFest’s rabbit rule points people here)
        </label>
        {d.gives_rhdv2 && (
          <label className={label}>
            How to get it there
            <input className={staffInput} value={d.rhdv2_note} onChange={set('rhdv2_note')} placeholder="By appointment — call 614-…" />
          </label>
        )}
        <label className={tick}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={d.is_published} onChange={check('is_published')} />
          Show on the website and in the app (untick for a draft)
        </label>
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !d.name.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={btn.outline}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function VetCard({ v, onChanged }: { v: VetRow; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (d: Draft) => {
    const { error } = await supabase.from('vets').update(toRow(d)).eq('id', v.id)
    if (error) throw error
    setEditing(false)
    onChanged()
  }
  const run = async (fn: () => PromiseLike<{ error: unknown }>) => {
    setBusy(true)
    setError(null)
    const { error } = await fn()
    setBusy(false)
    setConfirm(false)
    if (error) setError(errMessage(error))
    else onChanged()
  }

  if (editing) {
    return (
      <Card>
        <VetForm initial={draftFrom(v)} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(false)} />
      </Card>
    )
  }

  const small = 'rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60'
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-extrabold text-ink">{v.name}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${v.is_published ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-500'}`}>
          {v.is_published ? 'Live' : 'Draft'}
        </span>
      </div>
      {v.doctors && <p className="mt-0.5 text-sm text-slate-500">{v.doctors}</p>}
      <p className="mt-1 text-sm text-slate-600">{[v.address, v.city].filter(Boolean).join(', ')}</p>
      <p className="text-sm text-slate-600">{[v.phone, v.phone2].filter(Boolean).join(' · ')}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{v.region}</span>
        {v.is_emergency && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">24/7 emergencies</span>}
        {v.is_low_cost_spay && <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-brand-orange-dark">Low-cost spay/neuter</span>}
        {v.gives_rhdv2 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">RHDV2 vaccine</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing(true)} className={small}>
          Edit
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => supabase.from('vets').update({ is_published: !v.is_published }).eq('id', v.id))} className={small}>
          {v.is_published ? 'Hide' : 'Show'}
        </button>
        {confirm ? (
          <>
            <button type="button" disabled={busy} onClick={() => run(() => supabase.from('vets').delete().eq('id', v.id))} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
              {busy ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className={small}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
            Delete
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </Card>
  )
}

export default function ManageVets() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const allowed = can('content.education.edit')
  const [rows, setRows] = useState<VetRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [region, setRegion] = useState('All')
  const [onlyRhdv2, setOnlyRhdv2] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('vets').select('*').eq('org_id', orgId).order('sort_order').order('created_at')
    if (error) setError(errMessage(error))
    else setRows((data ?? []) as VetRow[])
  }, [orgId])
  useEffect(() => {
    if (orgId && allowed) void load()
  }, [orgId, allowed, load])

  const regions = useMemo(() => ['All', ...new Set((rows ?? []).map((r) => r.region))], [rows])

  if (!allowed) {
    return (
      <p className="text-slate-600">
        You don’t have access to the vet directory. An owner or admin can grant “Edit education / care content”.
      </p>
    )
  }

  const create = async (d: Draft) => {
    const { error } = await supabase
      .from('vets')
      .insert({ org_id: orgId, ...toRow(d), sort_order: rows?.length ?? 0, created_by: user?.id ?? null })
    if (error) throw error
    setAdding(false)
    await load()
  }

  const list = (rows ?? []).filter((r) => (region === 'All' || r.region === region) && (!onlyRhdv2 || r.gives_rhdv2))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Vets</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            The rabbit-savvy vets on the website’s vet list and in the app’s Find a vet. Tick “Gives the RHDV2 vaccine” and
            the practice also appears on the BunFest rabbit rules.
          </p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={btn.orange}>
            Add a vet
          </button>
        )}
      </div>

      {adding && (
        <Card>
          <h2 className="mb-3 font-display text-base font-extrabold text-ink">New vet</h2>
          <VetForm initial={EMPTY} submitLabel="Add vet" onSubmit={create} onCancel={() => setAdding(false)} />
        </Card>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {rows === null ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {regions.length > 2 &&
              regions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${region === r ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {r}
                </button>
              ))}
            <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={onlyRhdv2} onChange={(e) => setOnlyRhdv2(e.target.checked)} />
              Only RHDV2 vaccine ({(rows ?? []).filter((r) => r.gives_rhdv2).length})
            </label>
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">No vets here yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {list.map((v) => (
                <VetCard key={v.id} v={v} onChanged={load} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
