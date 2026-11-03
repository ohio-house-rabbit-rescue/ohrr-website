import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStaff, Spinner, staffInput } from '../../lib/staff'
import { btn, Card } from '../../components/ui'
import { StaffTitle } from '../../components/StaffTitle'
import {
  activityLabel,
  deleteRegistration,
  listRegistrations,
  NEEDS_52,
  setProofChecked,
  sexLabel,
  type RegisteredBunny,
  type RegistrationRow,
} from '../../lib/bunfestRegistration'

// Bunny registrations (the website's copy of the app's page) — /staff/bunfest/bunnies, gated on events.bunfest.manage (update 52).
//
// Owners register the rabbits they are bringing to BunFest (the form is on the Bunny Spa page). At the
// door a helper types an owner's or a bunny's name, looks at the vaccine date and the photo of the proof,
// and taps "Proof checked". Registrations are tied to that year's BunFest event, so next year starts clean.

const FILTERS = ['All', 'Still to check', 'Checked'] as const
type Filter = (typeof FILTERS)[number]

const ALL_EVENTS = 'all'

function fmtDay(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Whole months since the vaccine; the common advice is about once a year, so a clear note helps the door. */
function monthsSince(iso: string | null): number | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  let n = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) n -= 1
  return n
}

function BunnyLine({ b, busy, onToggle }: { b: RegisteredBunny; busy: boolean; onToggle: () => void }) {
  const checked = !!b.proof_checked_at
  const months = monthsSince(b.rhdv2_date)
  const details = [b.age, b.sex ? sexLabel(b.sex) : null, b.breed_color].filter(Boolean).join(' · ')
  return (
    <div className={`rounded-2xl border-2 p-3 ${checked ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-extrabold text-ink">{b.name}</p>
          {details && <p className="text-[15px] text-slate-600">{details}</p>}
        </div>
        {checked && <span className="inline-flex items-center rounded-full bg-brand-blue-50 px-2.5 py-0.5 text-sm font-bold text-brand-blue">Proof checked</span>}
      </div>
      <p className="mt-1 text-[15px] text-ink">
        RHDV2 vaccine: <strong>{fmtDay(b.rhdv2_date)}</strong>
        {months != null && months >= 0 && <span className="text-slate-600"> ({months} {months === 1 ? 'month' : 'months'} ago)</span>}
      </p>
      {b.proof_url ? (
        <a href={b.proof_url} target="_blank" rel="noreferrer" className="mt-2 block" aria-label={`Open the proof photo for ${b.name}`}>
          <img src={b.proof_url} alt={`Vaccine proof for ${b.name}`} loading="lazy" className="max-h-56 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />
          <span className="mt-1 inline-block min-h-[44px] py-2 text-[15px] font-bold text-brand-blue">Open the photo full size</span>
        </a>
      ) : (
        <p className="mt-2 text-[15px] font-semibold text-brand-orange">No proof photo was added.</p>
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={`mt-2 min-h-[52px] w-full ${checked ? 'inline-flex items-center justify-center rounded-full border-2 border-slate-300 bg-white px-5 text-base font-bold text-slate-700' : btn.blue + ' !py-3.5 !text-base'} disabled:opacity-50`}
      >
        {busy ? 'Saving…' : checked ? `Undo — checked ${fmtWhen(b.proof_checked_at!)}` : 'Proof checked at the door'}
      </button>
    </div>
  )
}

export default function StaffBunnyRegistrations() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const allowed = can('events.bunfest.manage')

  const [rows, setRows] = useState<RegistrationRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [eventId, setEventId] = useState<string>(ALL_EVENTS)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  // A bunny just checked (or un-checked) stays in the list it was in, with its Undo button, until the list is changed;
  // otherwise the next row would slide up under the finger.
  const [kept, setKept] = useState<Set<string>>(new Set())
  useEffect(() => setKept(new Set()), [filter, eventId, query])

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      setRows(await listRegistrations(orgId))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load the registrations.')
      setRows((r) => r ?? [])
    }
  }, [orgId])

  useEffect(() => {
    if (allowed) void load()
  }, [allowed, load])

  const events = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of rows ?? []) if (r.event_id) seen.set(r.event_id, r.event_title ?? 'BunFest')
    return [...seen.entries()]
  }, [rows])

  // Default to the newest BunFest once the list is in, so a new year starts on its own list.
  useEffect(() => {
    if (!rows || eventId !== ALL_EVENTS || events.length < 2) return
    const latest = [...rows].filter((r) => r.event_id).sort((a, b) => (b.event_starts_at ?? '').localeCompare(a.event_starts_at ?? ''))[0]
    if (latest?.event_id) setEventId(latest.event_id)
  }, [rows, events.length, eventId])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rows ?? [])
      .filter((r) => eventId === ALL_EVENTS || r.event_id === eventId)
      .map((r) => {
        const ownerHit = !q || r.owner_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000')
        const bunnies = r.bunnies.filter((b) => {
          if (!kept.has(b.id)) {
            if (filter === 'Still to check' && b.proof_checked_at) return false
            if (filter === 'Checked' && !b.proof_checked_at) return false
          }
          return ownerHit || b.name.toLowerCase().includes(q)
        })
        return { ...r, bunnies }
      })
      .filter((r) => r.bunnies.length > 0)
  }, [rows, query, filter, eventId, kept])

  const totals = useMemo(() => {
    const inEvent = (rows ?? []).filter((r) => eventId === ALL_EVENTS || r.event_id === eventId)
    const all = inEvent.flatMap((r) => r.bunnies)
    return { owners: inEvent.length, bunnies: all.length, checked: all.filter((b) => b.proof_checked_at).length }
  }, [rows, eventId])

  if (!allowed) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-black text-ink">Bunny registrations</h1>
        <p className="max-w-2xl text-base text-slate-700">
          You don’t have access to BunFest. An owner or admin can grant the “Manage Midwest BunFest info” task.
        </p>
      </div>
    )
  }

  async function toggle(b: RegisteredBunny) {
    setBusy(b.id)
    try {
      await setProofChecked(b.id, !b.proof_checked_at)
      setKept((k) => new Set(k).add(b.id))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t save.')
    } finally {
      setBusy(null)
    }
  }

  async function remove(id: string) {
    setBusy(id)
    try {
      await deleteRegistration(id)
      setConfirmRemove(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t go through.')
    } finally {
      setBusy(null)
    }
  }

  const notOn = error === NEEDS_52

  return (
    <div className="space-y-5">
      <StaffTitle title="Bunny registrations">
        <p>
          Owners register the rabbits they are bringing on the Bunny Spa page. At the door, type an owner’s or a bunny’s name, look at
          the vaccine date and the photo of the proof, then tap “Proof checked at the door”. Each year’s BunFest has its own list.
        </p>
      </StaffTitle>

      {notOn ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-base font-semibold text-amber-900">{NEEDS_52}</p>
      ) : (
        <>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700">
              {error}
            </p>
          )}
          {rows === null ? (
            <Spinner label="Loading registrations…" />
          ) : (
            <>
              <div>
                <label className="text-[15px] font-bold text-ink" htmlFor="bunny-search">
                  Find an owner or a bunny
                </label>
                <input
                  id="bunny-search"
                  type="search"
                  inputMode="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, email or phone"
                  autoComplete="off"
                  className={staffInput}
                />
              </div>

              {events.length > 1 && (
                <select aria-label="Which BunFest" value={eventId} onChange={(e) => setEventId(e.target.value)} className={staffInput}>
                  <option value={ALL_EVENTS}>All years</option>
                  {events.map(([id, title]) => (
                    <option key={id} value={id}>
                      {title}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={`min-h-11 rounded-full px-4 text-base font-bold ${filter === f ? 'bg-brand-blue text-white' : 'border-2 border-slate-200 bg-white text-slate-700'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <p className="text-[15px] font-semibold text-slate-600">
                {totals.bunnies === 0
                  ? 'No bunnies registered yet.'
                  : `${totals.bunnies} ${totals.bunnies === 1 ? 'bunny' : 'bunnies'} from ${totals.owners} ${totals.owners === 1 ? 'owner' : 'owners'} · ${totals.checked} checked`}
              </p>

              {shown.length === 0 && totals.bunnies > 0 && (
                <Card className="border-slate-200 bg-slate-50/80 text-center">
                  <p className="text-base text-slate-600">No one matches. Try fewer letters, or choose All.</p>
                </Card>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {shown.map((r) => (
                  <Card key={r.id} className="space-y-3">
                    <div>
                      <p className="text-xl font-extrabold text-ink">{r.owner_name}</p>
                      <p className="text-[15px]">
                        <a className="font-semibold text-brand-blue underline" href={`mailto:${r.email}`}>
                          {r.email}
                        </a>
                        {r.phone && (
                          <>
                            {' · '}
                            <a className="font-semibold text-brand-blue underline" href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>
                              {r.phone}
                            </a>
                          </>
                        )}
                      </p>
                      {r.activities.length > 0 && (
                        <p className="text-[15px] text-slate-600">Would like: {r.activities.map(activityLabel).join(', ')}</p>
                      )}
                      {r.note && <p className="mt-1 text-[15px] text-ink">“{r.note}”</p>}
                      <p className="mt-1 text-sm text-slate-600">
                        Agreed to the attendance agreement {fmtWhen(r.agreed_at)}
                        {r.event_title ? ` · ${r.event_title}` : ''}
                      </p>
                    </div>
                    {r.bunnies.map((b) => (
                      <BunnyLine key={b.id} b={b} busy={busy === b.id} onToggle={() => void toggle(b)} />
                    ))}
                    {confirmRemove === r.id ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="min-w-0 flex-1 text-[15px] font-bold text-ink">Remove {r.owner_name} and all their bunnies?</span>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="min-h-[44px] px-3 text-[15px] font-bold text-brand-blue">
                          Keep
                        </button>
                        <button type="button" onClick={() => void remove(r.id)} disabled={busy === r.id} className="min-h-[44px] px-3 text-[15px] font-bold text-red-700 disabled:opacity-50">
                          {busy === r.id ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmRemove(r.id)} className="min-h-[44px] text-[15px] font-semibold text-slate-600 underline">
                        Remove this registration
                      </button>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
