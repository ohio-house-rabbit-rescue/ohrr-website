// Foster, surrender and found — the requests that need following through to the
// end. They also show in the Inbox; this page keeps just these three kinds, grouped
// by where each one is (new, being worked on, finished).
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { StaffTitle } from '../../components/StaffTitle'
import { PayloadList, Notes, when } from './Inbox'

type Status = 'new' | 'in_progress' | 'done' | 'archived'
interface Row {
  id: string
  kind: string
  name: string | null
  email: string | null
  phone: string | null
  source: string | null
  subject: string | null
  payload: Record<string, unknown>
  status: Status
  staff_notes: string | null
  created_at: string
}

const KINDS = [
  { kind: 'foster-application', label: 'Foster offers' },
  { kind: 'surrender-intake', label: 'Surrenders' },
  { kind: 'found-rabbit', label: 'Found bunnies' },
]
const KIND_NAMES = KINDS.map((k) => k.kind)
const isOpen = (r: Row) => r.status === 'new' || r.status === 'in_progress'

export default function CareRequests() {
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [kind, setKind] = useState<string>('all')
  const [showDone, setShowDone] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('org_id', orgId)
      .in('kind', KIND_NAMES)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) setError(errMessage(error))
    else setRows((data ?? []) as Row[])
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
  }, [orgId, load])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of rows ?? []) if (isOpen(r)) c[r.kind] = (c[r.kind] ?? 0) + 1
    return c
  }, [rows])

  const shown = useMemo(() => (rows ?? []).filter((r) => r.status !== 'archived' && (kind === 'all' || r.kind === kind)), [rows, kind])
  const fresh = shown.filter((r) => r.status === 'new')
  const working = shown.filter((r) => r.status === 'in_progress')
  const finished = shown.filter((r) => r.status === 'done')

  const setStatus = async (r: Row, status: Status, notes?: string, message?: string) => {
    setError(null)
    setNote(null)
    const { error } = await supabase.rpc('set_request_status', { p_id: r.id, p_status: status, p_notes: notes ?? null })
    if (error) {
      setError(errMessage(error))
      return
    }
    setRows((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, status, staff_notes: notes ?? x.staff_notes } : x)))
    if (message) setNote(message)
  }

  const who = (r: Row) => r.name || 'That request'
  const card = (r: Row) => {
    const label = KINDS.find((x) => x.kind === r.kind)?.label ?? r.kind
    return (
      <li key={r.id} className={`space-y-3 rounded-2xl border bg-white p-4 shadow-sm ${r.status === 'new' ? 'border-brand-orange/40' : 'border-black/5'}`}>
        <div>
          <p className="break-words font-display text-base font-extrabold text-ink">
            {r.name || 'No name'}{' '}
            {r.status === 'new' && <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange">New</span>}
          </p>
          <p className="text-sm text-slate-700">
            {label}
            {r.subject ? ` · ${r.subject}` : ''}
          </p>
          <p className="text-xs text-slate-400">{when(r.created_at)}</p>
        </div>
        <PayloadList payload={r.payload} />
        {r.email && (
          <a href={`mailto:${r.email}?subject=${encodeURIComponent(`OHRR — ${label}${r.subject ? `: ${r.subject}` : ''}`)}`} className={btn.blue}>
            <Icon name="mail" size={16} /> Email {r.email}
          </a>
        )}
        <Notes row={r} onSave={(n) => setStatus(r, r.status, n)} />
        <div className="flex flex-wrap gap-2">
          {r.status === 'done' ? (
            <button type="button" onClick={() => void setStatus(r, 'in_progress', undefined, `${who(r)} is back under “Working on it”.`)} className={btn.outline}>
              Open it again
            </button>
          ) : (
            <>
              {r.status === 'new' && (
                <button type="button" onClick={() => void setStatus(r, 'in_progress', undefined, `${who(r)} is now under “Working on it”.`)} className={btn.outline}>
                  I’m on it
                </button>
              )}
              <button type="button" onClick={() => void setStatus(r, 'done', undefined, `${who(r)} is finished. It is under “Show finished”.`)} className={btn.orange}>
                Finished
              </button>
            </>
          )}
        </div>
      </li>
    )
  }

  const group = (title: string, list: Row[]) =>
    list.length > 0 && (
      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-extrabold text-ink">
          {title} ({list.length})
        </h2>
        <ul className="space-y-3">{list.map(card)}</ul>
      </section>
    )

  return (
    <div>
      <StaffTitle title="Foster, surrender and found" label="How this works">
        <p>These requests also show in the Inbox. This page is where you follow each one to the end. The notes are shared with the team.</p>
      </StaffTitle>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setKind(kind === k.kind ? 'all' : k.kind)}
            aria-pressed={kind === k.kind}
            className={`flex min-h-[48px] items-center justify-between gap-3 rounded-2xl px-4 text-left font-display text-base font-extrabold ${kind === k.kind ? 'bg-brand-blue text-white' : 'border-2 border-slate-200 bg-white text-ink'}`}
          >
            <span>{k.label}</span>
            <span className="text-sm font-bold">{counts[k.kind] ?? 0} open</span>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {note && (
        <p role="status" className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-[15px] font-bold text-green-800">
          {note}
        </p>
      )}
      {rows === null && !error && <Spinner />}

      {rows && shown.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Nothing waiting. New requests arrive in the{' '}
          <Link to="/staff/inbox" className="font-bold text-brand-blue underline">
            Inbox
          </Link>{' '}
          and show here too.
        </p>
      )}

      {group('New', fresh)}
      {group('Working on it', working)}
      {finished.length > 0 && (
        <section className="mt-6 space-y-3">
          <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className={btn.outline}>
            {showDone ? 'Hide finished' : `Show finished (${finished.length})`}
          </button>
          {showDone && <ul className="space-y-3">{finished.map(card)}</ul>}
        </section>
      )}

      <p className="mt-8">
        <Link to="/staff/inbox" className="font-bold text-brand-blue underline">
          Back to the Inbox
        </Link>
      </p>
    </div>
  )
}
