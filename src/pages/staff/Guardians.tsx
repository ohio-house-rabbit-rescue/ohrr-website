// Staff → Rescue Rabbit Guardians: the Legacy Fund thank-you list, a year at a
// time (update 29). Shown on /info/legacy-fund. The list holds only what is
// shown in public — the name the way the family wants it — never what anyone
// gave. Desktop mirror of the app's editor.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card } from '../../components/ui'
import { guessSortName, sortGuardians, type Guardian } from '../../lib/guardians'

export default function Guardians() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<Guardian[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [name, setName] = useState('')
  const [sortUnder, setSortUnder] = useState('')
  const [sortTouched, setSortTouched] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; sort: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('guardians')
      .select('id, year, display_name, sort_name, is_published')
      .eq('org_id', orgId)
    if (error) {
      // Only a missing table means update 29 hasn't run; a permission error is shown as it is.
      if (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message)) setMissing(true)
      else setError(errMessage(error))
      setRows([])
      return
    }
    const list = (data ?? []) as Guardian[]
    setRows(list)
    // Open on the newest year that has names.
    setYear((y) => (list.some((g) => g.year === y) ? y : list.reduce((m, g) => Math.max(m, g.year), y)))
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
  }, [orgId, load])

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    const set = new Set<number>([now, now + 1, ...(rows ?? []).map((g) => g.year)])
    return [...set].sort((a, b) => b - a)
  }, [rows])
  const list = useMemo(() => sortGuardians((rows ?? []).filter((g) => g.year === year)), [rows, year])
  const previous = useMemo(() => {
    const older = (rows ?? []).filter((g) => g.year < year).map((g) => g.year)
    return older.length ? Math.max(...older) : null
  }, [rows, year])

  if (!can('giving.guardians')) return <p className="text-slate-600">You don’t have access to the Guardians list.</p>

  const done = async (text: string) => {
    await load()
    setBusy(false)
    setMsg(text)
  }
  const fail = (e: unknown) => {
    setBusy(false)
    setError(errMessage(e))
  }
  const start = () => {
    setBusy(true)
    setError(null)
    setMsg(null)
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim().replace(/\s+/g, ' ')
    if (!n) return
    start()
    const { error } = await supabase.from('guardians').insert({
      org_id: orgId,
      year,
      display_name: n,
      sort_name: (sortUnder.trim() || guessSortName(n)).slice(0, 120),
      created_by: user?.id ?? null,
    })
    if (error) return fail(/duplicate|unique/i.test(error.message) ? new Error(`${n} is already on the ${year} list.`) : error)
    setName('')
    setSortUnder('')
    setSortTouched(false)
    await done(`Added ${n} to ${year}.`)
  }
  const saveEdit = async () => {
    if (!editing) return
    const n = editing.name.trim().replace(/\s+/g, ' ')
    if (!n) return
    start()
    const { error } = await supabase
      .from('guardians')
      .update({ display_name: n, sort_name: editing.sort.trim() || guessSortName(n) })
      .eq('id', editing.id)
    if (error) return fail(error)
    setEditing(null)
    await done('Saved.')
  }
  const toggle = async (g: Guardian) => {
    start()
    const { error } = await supabase.from('guardians').update({ is_published: !g.is_published }).eq('id', g.id)
    if (error) return fail(error)
    await done(g.is_published ? `${g.display_name} is hidden from the website.` : `${g.display_name} is shown again.`)
  }
  const remove = async (g: Guardian) => {
    if (!window.confirm(`Take ${g.display_name} off the ${g.year} list?`)) return
    start()
    const { error } = await supabase.from('guardians').delete().eq('id', g.id)
    if (error) return fail(error)
    await done(`Removed ${g.display_name} from ${g.year}.`)
  }
  const copyFrom = async (from: number) => {
    const names = (rows ?? []).filter((g) => g.year === from)
    if (!window.confirm(`Copy all ${names.length} names from ${from} into ${year}? You can then add, hide or remove names for ${year}.`)) return
    start()
    const { error } = await supabase.from('guardians').upsert(
      names.map((g) => ({
        org_id: orgId,
        year,
        display_name: g.display_name,
        sort_name: g.sort_name,
        is_published: g.is_published,
        created_by: user?.id ?? null,
      })),
      { onConflict: 'org_id,year,display_name', ignoreDuplicates: true },
    )
    if (error) return fail(error)
    await done(`Copied ${names.length} names from ${from} into ${year}.`)
  }

  const shown = list.filter((g) => g.is_published).length

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Rescue Rabbit Guardians</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        The Legacy Fund thank-you list: people who have made a planned gift or given $1,000 or more in a calendar year. The
        newest year is shown by name on{' '}
        <Link to="/info/legacy-fund#guardians" className="font-semibold text-brand-blue underline underline-offset-2">
          the Legacy Fund page
        </Link>
        , earlier years underneath. Write each name the way the family wants it. Leave off anyone who asked not to be listed.
      </p>

      {missing && (
        <Card className="mt-5 border-amber-200 bg-amber-50">
          <p className="text-sm text-slate-700">
            This list switches on with <strong>update 29</strong> (RUN-THIS-IN-SUPABASE.sql in the Drive). Until then the
            website shows the 2026 names from the old site’s graphic.
          </p>
        </Card>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {years.map((y) => {
          const n = (rows ?? []).filter((g) => g.year === y).length
          return (
            <button key={y} type="button" onClick={() => setYear(y)} className={year === y ? btn.blue : btn.outline}>
              {y}
              {n ? ` · ${n}` : ''}
            </button>
          )
        })}
      </div>

      {rows === null && !error && <Spinner />}
      {rows && !missing && (
        <div className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="!p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <p className="font-display text-lg font-extrabold text-ink">
                {year} · {list.length} {list.length === 1 ? 'name' : 'names'}
                {list.length > shown && <span className="ml-2 text-sm font-semibold text-slate-500">({list.length - shown} hidden)</span>}
              </p>
              {list.length === 0 && previous != null && (
                <button type="button" disabled={busy} onClick={() => void copyFrom(previous)} className={`${btn.outline} disabled:opacity-60`}>
                  Start {year} from {previous}’s list
                </button>
              )}
            </div>
            {list.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600">No names for {year} yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {list.map((g) =>
                  editing?.id === g.id ? (
                    <li key={g.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                      <label className="block text-xs font-semibold text-slate-600">
                        Name as shown
                        <input className={staffInput} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                      </label>
                      <label className="block text-xs font-semibold text-slate-600">
                        Sort under
                        <input className={staffInput} value={editing.sort} onChange={(e) => setEditing({ ...editing, sort: e.target.value })} />
                      </label>
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => void saveEdit()} className={`${btn.blue} disabled:opacity-60`}>
                          Save
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className={btn.outline}>
                          Cancel
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
                      <span className={`min-w-0 flex-1 font-semibold ${g.is_published ? 'text-ink' : 'text-slate-400 line-through'}`}>
                        {g.display_name}
                      </span>
                      {!g.is_published && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Hidden</span>}
                      <span className="flex gap-3 text-sm font-bold">
                        <button type="button" className="text-brand-blue" onClick={() => setEditing({ id: g.id, name: g.display_name, sort: g.sort_name })}>
                          Edit
                        </button>
                        <button type="button" className="text-brand-blue" disabled={busy} onClick={() => void toggle(g)}>
                          {g.is_published ? 'Hide' : 'Show'}
                        </button>
                        <button type="button" className="text-red-600" disabled={busy} onClick={() => void remove(g)}>
                          Remove
                        </button>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </Card>

          <form onSubmit={add} className="self-start">
            <Card className="space-y-3">
              <p className="font-display text-lg font-extrabold text-ink">Add a name to {year}</p>
              <label className="block text-sm font-semibold text-slate-700">
                Name as shown
                <input
                  className={staffInput}
                  value={name}
                  placeholder="e.g. Bob & Inger Barron, or the Hayes Family"
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!sortTouched) setSortUnder(e.target.value.trim() ? guessSortName(e.target.value) : '')
                  }}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Sort under
                <span className="block text-xs font-normal text-slate-500">Usually the surname; fix it if the guess is wrong.</span>
                <input
                  className={staffInput}
                  value={sortUnder}
                  onChange={(e) => {
                    setSortUnder(e.target.value)
                    setSortTouched(true)
                  }}
                />
              </label>
              <button type="submit" disabled={busy || !name.trim()} className={`${btn.orange} w-full disabled:opacity-60`}>
                {busy ? 'Saving…' : 'Add'}
              </button>
            </Card>
          </form>
        </div>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {msg && <p className="mt-4 text-sm font-semibold text-green-700">{msg}</p>}
    </div>
  )
}
