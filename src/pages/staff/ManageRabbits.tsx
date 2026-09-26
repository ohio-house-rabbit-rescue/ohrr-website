import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { isMissingFunction, isMissingTable } from '../../lib/emailList'

interface RabbitRow {
  id: string
  name: string
  status: string
  sex: string | null
  age: string | null
  breed: string | null
  bonded: boolean
  description: string | null
  photos: string[] | null
  is_published: boolean
  /** Update 32: when the daily check stopped finding it on RescueGroups, and whether that hid it. */
  source_missing_since?: string | null
  auto_hidden?: boolean
}

const RABBIT_COLUMNS = 'id,name,status,sex,age,breed,bonded,description,photos,is_published'
const SYNC_COLUMNS = `${RABBIT_COLUMNS},source_missing_since,auto_hidden`

/*
 * Update 32: OHRR's RescueGroups listing is checked every morning (the ohrr-jobs
 * Edge Function). New rabbits are added; one no longer listed is hidden — never
 * marked adopted — until staff decide or it's listed again. Each check leaves a
 * row in job_runs.
 */
interface JobRun {
  id: string
  finished_at: string
  ok: boolean
  detail: { listed?: number; added?: string[]; back?: string[]; hidden?: string[]; error?: string } | null
}

/** "Sep 25". */
const monthDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** "just now", "today 7:15 AM", "yesterday 7:15 AM" or "Sep 23, 7:15 AM". */
function whenChecked(iso: string): string {
  const d = new Date(iso)
  if (Date.now() - d.getTime() < 60_000) return 'just now'
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const day = (x: Date) => x.toDateString()
  if (day(d) === day(new Date())) return `today ${time}`
  if (day(d) === day(new Date(Date.now() - 86_400_000))) return `yesterday ${time}`
  return `${monthDay(iso)}, ${time}`
}

function runLine(r: JobRun): string {
  const d = r.detail ?? {}
  if (!r.ok) return `The RescueGroups check ${whenChecked(r.finished_at)} didn’t work: ${d.error ?? 'no reason given'}`
  const parts = [`${d.listed ?? 0} listed`]
  if (d.added?.length) parts.push(`added ${d.added.join(', ')}`)
  if (d.back?.length) parts.push(`listed again ${d.back.join(', ')}`)
  if (d.hidden?.length) parts.push(`hidden ${d.hidden.join(', ')}`)
  return `Checked RescueGroups ${whenChecked(r.finished_at)}: ${parts.join(' · ')}`
}

/** The line at the top: the last check, and "Check RescueGroups now" for those who edit listings. */
function RescueGroupsCheck({ orgId, canRequest, onChecked }: { orgId: string; canRequest: boolean; onChecked: () => Promise<void> }) {
  const [last, setLast] = useState<JobRun | null | undefined>(undefined)
  const [off, setOff] = useState(false)
  const [waitingFor, setWaitingFor] = useState<string | null | false>(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const loadRun = useCallback(async (): Promise<JobRun | null> => {
    const { data, error } = await supabase
      .from('job_runs')
      .select('id, finished_at, ok, detail')
      .eq('job', 'rabbits')
      .order('finished_at', { ascending: false })
      .limit(1)
    if (error) {
      if (isMissingTable(error)) setOff(true)
      setLast(null)
      return null
    }
    const run = ((data ?? []) as JobRun[])[0] ?? null
    setLast(run)
    return run
  }, [])
  useEffect(() => {
    void loadRun()
    return () => window.clearTimeout(timer.current)
  }, [loadRun])

  // After asking, look again in about 20 seconds (and whenever "Check again" is pressed).
  const lookAgain = useCallback(
    async (before: string | null) => {
      window.clearTimeout(timer.current)
      const run = await loadRun()
      if (run && run.id !== before) {
        setWaitingFor(false)
        await onChecked()
      }
    },
    [loadRun, onChecked],
  )

  const checkNow = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('request_rabbit_refresh', { p_org: orgId })
    setBusy(false)
    if (error) {
      if (isMissingFunction(error)) setOff(true)
      else setError(errMessage(error))
      return
    }
    const before = last?.id ?? null
    setWaitingFor(before)
    timer.current = window.setTimeout(() => void lookAgain(before), 20_000)
  }

  if (off) return <p className="mt-3 text-sm text-slate-500">The daily RescueGroups check switches on with update 32.</p>
  if (last === undefined) return null
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm text-slate-700">
        {last ? runLine(last) : 'RescueGroups hasn’t been checked yet.'} <span className="text-slate-500">It’s checked every morning.</span>
      </p>
      {canRequest && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" disabled={busy || waitingFor !== false} onClick={() => void checkNow()} className={`${btn.outline} disabled:opacity-60`}>
            {busy ? 'Asking…' : 'Check RescueGroups now'}
          </button>
          {waitingFor !== false && (
            <span className="text-sm text-slate-600">
              Checking — this takes about 20 seconds.{' '}
              <button type="button" className="font-bold text-brand-blue" onClick={() => void lookAgain(waitingFor)}>
                Check again
              </button>
            </span>
          )}
          {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
        </div>
      )}
    </div>
  )
}

interface Draft {
  name: string
  status: string
  sex: string
  age: string
  breed: string
  bonded: boolean
  description: string
  photos: string[]
  is_published: boolean
}

const STATUSES = ['Available', 'Pending', 'Adopted']
const AGES = ['', 'Baby', 'Young', 'Adult', 'Senior']
const SEXES = ['', 'Male', 'Female', 'Unknown']
const empty: Draft = { name: '', status: 'Available', sex: '', age: '', breed: '', bonded: false, description: '', photos: [], is_published: true }

function fromRow(r: RabbitRow): Draft {
  return {
    name: r.name,
    status: r.status,
    sex: r.sex ?? '',
    age: r.age ?? '',
    breed: r.breed ?? '',
    bonded: r.bonded,
    description: r.description ?? '',
    photos: r.photos ?? [],
    is_published: r.is_published,
  }
}

async function uploadPhoto(file: File, userId: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('rabbit-photos').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('rabbit-photos').getPublicUrl(path).data.publicUrl
}

function PhotoUploader({ photos, userId, onChange }: { photos: string[]; userId: string; onChange: (p: string[]) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const f of Array.from(files)) urls.push(await uploadPhoto(f, userId))
      onChange([...photos, ...urls])
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <span className="text-sm font-semibold text-slate-700">Photos</span>
      {photos.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p} className="relative">
              <img src={p} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200" />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-brand-blue px-1.5 py-0.5 text-[10px] font-bold text-white">Cover</span>
              ) : (
                <button type="button" onClick={() => onChange([p, ...photos.filter((x) => x !== p)])} className="absolute left-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-brand-blue shadow">
                  Cover
                </button>
              )}
              <button type="button" onClick={() => onChange(photos.filter((x) => x !== p))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className={`mt-2 inline-block cursor-pointer rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-brand-blue hover:bg-slate-50 ${busy ? 'opacity-60' : ''}`}>
        {busy ? 'Uploading…' : photos.length ? 'Add more photos' : 'Upload photos'}
        <input type="file" accept="image/*" multiple disabled={busy} className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function Form({ initial, userId, submitLabel, onSubmit, onCancel }: { initial: Draft; userId: string; submitLabel: string; onSubmit: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(d)
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <label className="block flex-1 text-sm font-semibold text-slate-700">
          Name
          <input className={staffInput} required value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </label>
        <label className="block w-32 text-sm font-semibold text-slate-700">
          Status
          <select className={staffInput} value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="block flex-1 text-sm font-semibold text-slate-700">
          Age
          <select className={staffInput} value={d.age} onChange={(e) => setD({ ...d, age: e.target.value })}>
            {AGES.map((a) => <option key={a} value={a}>{a || '—'}</option>)}
          </select>
        </label>
        <label className="block flex-1 text-sm font-semibold text-slate-700">
          Sex
          <select className={staffInput} value={d.sex} onChange={(e) => setD({ ...d, sex: e.target.value })}>
            {SEXES.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
          </select>
        </label>
        <label className="block flex-1 text-sm font-semibold text-slate-700">
          Breed
          <input className={staffInput} value={d.breed} onChange={(e) => setD({ ...d, breed: e.target.value })} />
        </label>
      </div>
      <PhotoUploader photos={d.photos} userId={userId} onChange={(photos) => setD({ ...d, photos })} />
      <label className="block text-sm font-semibold text-slate-700">
        About this rabbit
        <textarea className={staffInput} rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={d.bonded} onChange={(e) => setD({ ...d, bonded: e.target.checked })} /> Bonded pair
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} /> Show on the site
        </label>
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !d.name.trim()} className={`${btn.orange} disabled:opacity-60`}>{busy ? 'Saving…' : submitLabel}</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
      </div>
    </form>
  )
}

export default function ManageRabbits() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const canCreate = can('adoptions.listings.create')
  const canEdit = can('adoptions.listings.edit')

  const [items, setItems] = useState<RabbitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) return
    setError(null)
    const query = (cols: string) => supabase.from('rabbits').select(cols).eq('org_id', orgId).order('created_at', { ascending: false })
    // Before update 32 there are no RescueGroups columns: ask again without them.
    let res = await query(SYNC_COLUMNS)
    if (res.error) res = await query(RABBIT_COLUMNS)
    if (res.error) setError(errMessage(res.error))
    else setItems((res.data ?? []) as unknown as RabbitRow[])
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    load()
  }, [load])

  const payload = (d: Draft) => ({
    name: d.name.trim(),
    status: d.status,
    sex: d.sex || null,
    age: d.age || null,
    breed: d.breed.trim() || null,
    bonded: d.bonded,
    description: d.description.trim() || null,
    photos: d.photos,
    is_published: d.is_published,
  })

  const create = async (d: Draft) => {
    const { error } = await supabase.from('rabbits').insert({ org_id: orgId, created_by: userId, ...payload(d) })
    if (error) throw error
    setCreating(false)
    await load()
  }
  const saveEdit = (r: RabbitRow) => async (d: Draft) => {
    // Shown again or adopted by hand: no longer "hidden by the RescueGroups check".
    const settled = r.auto_hidden && (d.is_published || d.status === 'Adopted')
    const { error } = await supabase
      .from('rabbits')
      .update({ ...payload(d), ...(settled ? { auto_hidden: false } : {}) })
      .eq('id', r.id)
    if (error) throw error
    setEditingId(null)
    await load()
  }
  // The two quick answers for a rabbit the RescueGroups check hid. Never automatic.
  const quick = async (r: RabbitRow, change: Record<string, unknown>, done: string) => {
    setError(null)
    setMsg(null)
    const { error } = await supabase.from('rabbits').update(change).eq('id', r.id)
    if (error) setError(errMessage(error))
    else {
      await load()
      setMsg(done)
    }
  }
  const markAdopted = (r: RabbitRow) =>
    void quick(r, { status: 'Adopted', auto_hidden: false }, `${r.name} is marked adopted and stays hidden.`)
  const showAgain = (r: RabbitRow) =>
    void quick(r, { is_published: true, auto_hidden: false }, `${r.name} is on the site again until tomorrow’s check.`)
  const remove = async (id: string) => {
    const { error } = await supabase.from('rabbits').delete().eq('id', id)
    if (error) setError(errMessage(error))
    else await load()
  }

  if (!canCreate && !canEdit && !can('adoptions.status.change'))
    return <p className="text-slate-600">You don't have access to manage adoptable rabbits.</p>

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Adoptable rabbits</h1>
        {canCreate && !creating && <button onClick={() => setCreating(true)} className={btn.orange}>Add a rabbit</button>}
      </div>
      <p className="mt-1 text-sm text-slate-600">These show on the website's Adopt page and the app.</p>
      {orgId && <RescueGroupsCheck orgId={orgId} canRequest={canCreate || canEdit} onChecked={load} />}

      {creating && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Form initial={empty} userId={userId} submitLabel="Add rabbit" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {msg && <p className="mt-4 text-sm font-semibold text-green-700">{msg}</p>}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="mt-6 text-slate-600">No rabbits yet. {canCreate ? 'Add the first one above.' : ''}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((r) =>
            editingId === r.id ? (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Form initial={fromRow(r)} userId={userId} submitLabel="Save" onSubmit={saveEdit(r)} onCancel={() => setEditingId(null)} />
              </div>
            ) : (
              <div key={r.id} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {r.photos?.[0] ? <img src={r.photos[0]} alt={r.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-display text-2xl font-black text-slate-300">{r.name[0]}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-extrabold text-ink">{r.name}</h3>
                    {!r.is_published &&
                      (r.auto_hidden ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                          Hidden — no longer on RescueGroups{r.source_missing_since ? ` since ${monthDay(r.source_missing_since)}` : ''}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Hidden</span>
                      ))}
                    <span className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-bold text-brand-blue">{r.status}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{[r.age, r.sex, r.breed].filter(Boolean).join(' · ')}</p>
                  {r.auto_hidden && !r.is_published && (canEdit || can('adoptions.status.change')) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.status !== 'Adopted' && (
                        <button onClick={() => markAdopted(r)} className="rounded-full border border-brand-blue/60 px-3 py-1.5 text-xs font-bold text-brand-blue hover:bg-brand-blue-50">
                          Mark adopted
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => showAgain(r)} className="rounded-full border border-brand-blue/60 px-3 py-1.5 text-xs font-bold text-brand-blue hover:bg-brand-blue-50">
                          Show it again until tomorrow’s check
                        </button>
                      )}
                    </div>
                  )}
                  {canEdit && (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => setEditingId(r.id)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                      <button onClick={() => remove(r.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
