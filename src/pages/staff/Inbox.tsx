// The Inbox — desktop mirror of the app's. Everything sent through the app's
// and the website's forms: appointments, bonding/clinic sign-ups, surrender
// intakes, volunteer sign-ups, Happy Tails, mailing-list joins, messages.
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { publishHappyTail, TAIL_STATUS_LABEL, type TailStatus } from '../../lib/tails'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { kindLabel } from '../../lib/volunteers/approval'

type Status = 'new' | 'in_progress' | 'done' | 'archived'
interface Row {
  id: string
  kind: string
  name: string | null
  email: string | null
  phone: string | null
  subject: string | null
  /** Mostly text; a volunteer application's `kinds` is a list. */
  payload: Record<string, unknown>
  status: Status
  staff_notes: string | null
  source: string | null
  created_at: string
}

const KIND: Record<string, { label: string; icon: IconName }> = {
  'appointment-request': { label: 'Appointment', icon: 'calendar' },
  'service-signup': { label: 'Bonding / clinic', icon: 'heart' },
  'surrender-intake': { label: 'Surrender', icon: 'mappin' },
  'volunteer-signup': { label: 'Volunteer', icon: 'users' },
  'volunteer-application': { label: 'Volunteer application', icon: 'users' },
  'happy-tail': { label: 'Happy Tail', icon: 'sparkles' },
  'raffle-request': { label: 'Raffle tickets', icon: 'ticket' },
  'reserve-session': { label: 'BunFest session', icon: 'clock' },
  'mailing-list': { label: 'Mailing list', icon: 'mail' },
  supporter: { label: 'New supporter', icon: 'heart' },
  'foster-application': { label: 'Foster interest', icon: 'home' },
  'found-rabbit': { label: 'Found rabbit', icon: 'mappin' },
  'notify-me': { label: 'Tell me when', icon: 'clock' },
  'legacy-info': { label: 'Legacy Fund', icon: 'gift' },
  contact: { label: 'Message', icon: 'mail' },
  'adoption-application': { label: 'Adoption application', icon: 'heart' },
  booking: { label: 'Booking', icon: 'calendar' },
}
const kindMeta = (k: string) => KIND[k] ?? { label: k.replace(/-/g, ' '), icon: 'mail' as IconName }
const labelOf = (key: string) => {
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
/** A payload value as text: a list becomes "a, b" (an application's kinds by their names). */
const asText = (key: string, v: unknown): string => {
  if (Array.isArray(v)) return v.map((x) => (key === 'kinds' ? kindLabel(String(x)) : String(x))).join(', ')
  if (v && typeof v === 'object') return JSON.stringify(v)
  return v == null ? '' : String(v)
}
const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function Inbox() {
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | Status>('open')
  const [kind, setKind] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('requests').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(1000)
    if (error) setError(errMessage(error))
    else setRows((data ?? []) as Row[])
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
  }, [orgId, load])

  const kinds = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.kind))).sort(), [rows])
  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => (filter === 'open' ? r.status === 'new' || r.status === 'in_progress' : r.status === filter) && (kind === 'all' || r.kind === kind),
      ),
    [rows, filter, kind],
  )
  const count = (f: 'open' | Status) => (rows ?? []).filter((r) => (f === 'open' ? r.status === 'new' || r.status === 'in_progress' : r.status === f)).length

  const setStatus = async (r: Row, status: Status, notes?: string) => {
    setError(null)
    const { error } = await supabase.rpc('set_request_status', { p_id: r.id, p_status: status, p_notes: notes ?? null })
    if (error) setError(errMessage(error))
    else setRows((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, status, staff_notes: notes ?? x.staff_notes } : x)))
  }

  const exportCsv = () => {
    const list = shown
    const keys = Array.from(new Set(list.flatMap((r) => Object.keys(r.payload ?? {}))))
    const head = ['When', 'Type', 'Status', 'Name', 'Email', 'Phone', 'Summary', ...keys, 'Notes']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [head.map(esc).join(',')]
    for (const r of list) {
      lines.push(
        [r.created_at, kindMeta(r.kind).label, r.status, r.name, r.email, r.phone, r.subject, ...keys.map((k) => asText(k, r.payload?.[k])), r.staff_notes]
          .map(esc)
          .join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ohrr-inbox-${kind}-${filter}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Inbox</h1>
          <p className="mt-1 text-sm text-slate-600">Requests and sign-ups from the website and the app. Mailing-list joins can be exported as a CSV for your email service.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={shown.length === 0} className={`${btn.outline} disabled:opacity-50`}>
          Export what’s shown (CSV)
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(
          [
            ['open', 'To do'],
            ['done', 'Done'],
            ['archived', 'Archived'],
          ] as ['open' | Status, string][]
        ).map(([f, label]) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${filter === f ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
            {label} ({count(f)})
          </button>
        ))}
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600">
          <option value="all">All types</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {kindMeta(k).label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {rows === null && !error && <Spinner />}
      {rows && shown.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">Nothing here.</p>
      )}

      <ul className="mt-4 space-y-3">
        {shown.map((r) => {
          const k = kindMeta(r.kind)
          const open = openId === r.id
          return (
            <li key={r.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${r.status === 'new' ? 'border-brand-orange/40' : 'border-black/5'}`}>
              <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-start gap-3 text-left">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue">
                  <Icon name={k.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-extrabold text-ink">{r.name || 'No name'}</span>
                    {r.status === 'new' && <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange">New</span>}
                    {r.status === 'in_progress' && <span className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-bold text-brand-blue">In progress</span>}
                    <span className="text-xs text-slate-400">{r.source} · {when(r.created_at)}</span>
                  </span>
                  <span className="block text-sm text-slate-700">
                    {k.label}
                    {r.subject ? ` · ${r.subject}` : ''}
                    {r.email ? ` · ${r.email}` : ''}
                    {r.phone ? ` · ${r.phone}` : ''}
                  </span>
                </span>
                <Icon name="chevron" size={18} className={`mt-1 shrink-0 text-slate-300 transition ${open ? 'rotate-90' : ''}`} />
              </button>
              {open && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {r.email && (
                      <a href={`mailto:${r.email}?subject=${encodeURIComponent(`OHRR — ${k.label}${r.subject ? `: ${r.subject}` : ''}`)}`} className={btn.blue}>
                        Email {r.email}
                      </a>
                    )}
                    {r.phone && (
                      <a href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`} className={btn.outline}>
                        Call {r.phone}
                      </a>
                    )}
                  </div>
                  <dl className="grid gap-x-6 gap-y-1 rounded-2xl border border-slate-200 p-3 sm:grid-cols-2">
                    {Object.entries(r.payload ?? {}).map(([key, raw]) => {
                      const value = asText(key, raw)
                      return (
                        <div key={key} className={isPhoto(value) || value.length > 80 ? 'sm:col-span-2' : ''}>
                          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{labelOf(key)}</dt>
                          <dd className="whitespace-pre-wrap break-words text-sm text-ink">
                            {isPhoto(value) ? (
                              <a href={value} target="_blank" rel="noopener noreferrer">
                                <img src={value} alt={labelOf(key)} loading="lazy" className="mt-1 max-h-72 rounded-xl object-cover" />
                              </a>
                            ) : (
                              value
                            )}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                  {r.kind === 'happy-tail' && <PublishTail row={r} onPublished={() => void setStatus(r, 'done')} />}
                  {r.kind === 'volunteer-application' && (
                    <Link to="/staff/volunteers" className={btn.outline}>
                      Review in Volunteers <Icon name="chevron" size={15} />
                    </Link>
                  )}
                  <Notes row={r} onSave={(n) => setStatus(r, r.status, n)} />
                  <div className="flex flex-wrap gap-2">
                    {r.status !== 'done' && (
                      <button type="button" onClick={() => void setStatus(r, 'done')} className={btn.orange}>
                        Mark done
                      </button>
                    )}
                    {r.status === 'new' && (
                      <button type="button" onClick={() => void setStatus(r, 'in_progress')} className={btn.outline}>
                        I’m on it
                      </button>
                    )}
                    {r.status === 'done' && (
                      <button type="button" onClick={() => void setStatus(r, 'new')} className={btn.outline}>
                        Reopen
                      </button>
                    )}
                    {r.status !== 'archived' ? (
                      <button type="button" onClick={() => void setStatus(r, 'archived')} className="text-sm font-bold text-slate-500">
                        Archive
                      </button>
                    ) : (
                      <button type="button" onClick={() => void setStatus(r, 'done')} className="text-sm font-bold text-slate-500">
                        Unarchive
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function isPhoto(value: string): boolean {
  return /^https?:\/\/\S+\.(jpe?g|png|webp|heic)(\?|$)/i.test(value.trim())
}

/**
 * Inbox → Happy Tails, pre-filled from what the adopter sent. Before this, a
 * story could arrive and never reach the page: there was nowhere to put it.
 */
function PublishTail({ row, onPublished }: { row: Row; onPublished: () => void }) {
  const payload = Object.fromEntries(Object.entries(row.payload ?? {}).map(([k, v]) => [k, asText(k, v)])) as Record<string, string>
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [d, setD] = useState({
    bunny: payload.bunny ?? '',
    family: row.name ? `${row.name.split(' ').slice(-1)[0]} family` : '',
    status: 'going-strong' as TailStatus,
    since: payload.since ?? '',
    summary: (payload.story ?? '').slice(0, 140),
    story: payload.story ?? '',
    photoUrl: payload.photo ?? payload.photoUrl ?? '',
  })
  const txt = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })

  if (done)
    return (
      <p className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-2.5 text-sm font-bold text-green-800">
        Published to Happy Tails.{' '}
        <Link to="/staff/tails" className="underline">
          Edit it
        </Link>
      </p>
    )

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={btn.outline}>
        Publish as a Happy Tail
      </button>
    )

  const publish = async () => {
    setBusy(true)
    setError(null)
    try {
      await publishHappyTail({
        requestId: row.id,
        bunny: d.bunny.trim(),
        summary: d.summary.trim() || d.story.slice(0, 140),
        family: d.family.trim() || undefined,
        status: d.status,
        since: d.since.trim() || undefined,
        story: d.story.trim() || undefined,
        photoUrl: d.photoUrl.trim() || undefined,
      })
      setDone(true)
      onPublished()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-brand-blue/25 bg-brand-blue-50/40 p-4">
      <p className="font-display text-base font-extrabold text-ink">Publish as a Happy Tail</p>
      {d.photoUrl && <img src={d.photoUrl} alt="" className="max-h-56 rounded-xl object-cover" />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Bunny
          <input className={staffInput} value={d.bunny} onChange={txt('bunny')} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Family
          <input className={staffInput} value={d.family} onChange={txt('family')} placeholder="Patel family" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          How they’re doing
          <select className={staffInput} value={d.status} onChange={txt('status')}>
            {Object.entries(TAIL_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Since
          <input className={staffInput} value={d.since} onChange={txt('since')} placeholder="Adopted Mar 2025" />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        One-line summary (on the card)
        <input className={staffInput} value={d.summary} onChange={txt('summary')} maxLength={160} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        The story
        <textarea className={staffInput} rows={4} value={d.story} onChange={txt('story')} />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={publish} disabled={busy || !d.bunny.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Publishing…' : 'Publish'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn.outline}>
          Not yet
        </button>
      </div>
    </div>
  )
}

function Notes({ row, onSave }: { row: Row; onSave: (notes: string) => Promise<void> }) {
  const [notes, setNotes] = useState(row.staff_notes ?? '')
  const dirty = notes !== (row.staff_notes ?? '')
  return (
    <label className="block text-sm font-semibold text-slate-700">
      Notes for the team
      <textarea className={staffInput} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {dirty && (
        <button type="button" onClick={() => void onSave(notes)} className={`${btn.outline} mt-2`}>
          Save note
        </button>
      )}
    </label>
  )
}
