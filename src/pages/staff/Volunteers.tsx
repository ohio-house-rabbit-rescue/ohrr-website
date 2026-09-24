// Staff → Volunteers: the roster, and the hours people log for themselves.
// Desktop mirror of the app's StaffVolunteers — same tables and RPCs, so an
// edit here shows on a phone immediately and vice-versa.
//
// A volunteer is more than an email address on a booking: who they are, what
// they're cleared for, whether they've done their orientation — plus the
// private link (and QR code) each person uses to see and log their own hours.
//
// Update 25: new people apply on the website or in the app and wait here to
// be approved — for everything, or just some kinds of volunteering — before
// they can sign up for shifts that need approval. OHRR's top tier also sees
// the certificates to consider, and sets the hours that earn one.
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage } from '../../lib/supabase'
import { Card, btn } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { copyText } from '../../lib/share/share'
import { bccMailto, exportCsv, toCsv } from '../../lib/exportFile'
import {
  approveVolunteer,
  certificateHours,
  certificateSuggestions,
  CERTIFICATES_CAP,
  columnsReady,
  declineVolunteer,
  deleteHoursEntry,
  deleteVolunteer,
  hoursLabel,
  hoursUrl,
  listVolunteers,
  openCertificateCount,
  pendingApplications,
  saveVolunteer,
  setCertificateHours,
  setHoursStatus,
  setSuggestionStatus,
  siteHoursUrl,
  statusLabel,
  unconfirmedHours,
  volunteerHours,
  volunteerLetters,
  VOLUNTEER_ROLES,
  VOLUNTEER_STATUS,
  type HoursRow,
  type IssuedLetterRow,
  type VolunteerRow,
} from '../../lib/volunteers/api'
import {
  APPROVAL_KINDS,
  EVERYTHING,
  approvedText,
  kindLabel,
  suggestionReason,
  type CertificateSuggestion,
} from '../../lib/volunteers/approval'
import { SITE_ORIGIN } from '../../lib/volunteers/calls'
import { LETTER_KINDS } from '../../lib/volunteers/letters'

// Small local stand-ins for the app's shell pieces (as Bookings.tsx does).
function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'orange' | 'slate' }) {
  const t = { blue: 'bg-brand-blue-50 text-brand-blue', orange: 'bg-brand-orange-50 text-brand-orange-dark', slate: 'bg-slate-100 text-slate-600' }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${t}`}>{children}</span>
}
function FormError({ children }: { children?: ReactNode }) {
  return children ? <p className="text-sm font-semibold text-red-600">{children}</p> : null
}

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
/** A timestamp (applied, letter made) as a date in Ohio. */
const fmtStamp = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there'

type Tab = 'roster' | 'hours' | 'certificates'

export default function Volunteers() {
  const { user, membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  // The same people the app lets in (and the database's own rule for these tables).
  const allowed = can('volunteers.shifts.manage') || can('bookings.manage')
  // Certificates are for OHRR's top tier (owners, admins, or "Make volunteer certificates").
  const canCertificates = can(CERTIFICATES_CAP)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'certificates' ? 'certificates' : 'roster')
  const [rows, setRows] = useState<VolunteerRow[] | null>(null)
  const [pending, setPending] = useState<HoursRow[]>([])
  // Applications and "approved for" need update 25's columns; null = still checking.
  const [approvals, setApprovals] = useState<boolean | null>(null)
  // null = not shown (not allowed, or before update 25).
  const [suggestions, setSuggestions] = useState<CertificateSuggestion[] | null>(null)
  const [marks, setMarks] = useState<number[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId || !allowed) return
    try {
      const [list, unconfirmed, ready, toConsider, hoursMarks] = await Promise.all([
        listVolunteers(orgId),
        unconfirmedHours(orgId),
        columnsReady('volunteers', 'approved_for,review_status,applied_at,application'),
        canCertificates ? certificateSuggestions(orgId) : Promise.resolve(null),
        canCertificates ? certificateHours(orgId) : Promise.resolve(null),
      ])
      setRows(list)
      setPending(unconfirmed)
      setApprovals(ready)
      setSuggestions(toConsider)
      setMarks(hoursMarks)
    } catch (e) {
      setError(errMessage(e))
    }
  }, [orgId, allowed, canCertificates])
  useEffect(() => {
    void load()
  }, [load])

  // ?tab=certificates only means something to someone who can see them.
  const shown: Tab = tab === 'certificates' && !suggestions ? 'roster' : tab
  // Newest application first.
  const waiting = useMemo(
    () => (rows ?? []).filter((r) => r.review_status === 'pending').sort((a, b) => (b.applied_at ?? '').localeCompare(a.applied_at ?? '')),
    [rows],
  )

  if (!allowed) {
    return (
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Volunteers</h1>
        <p className="mt-3 text-sm text-slate-600">
          You don’t have access to the volunteer roster. An owner or admin can grant the “Create/manage volunteer shifts” or
          “Set up bookable shifts &amp; appointments” capability.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Volunteers</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Who volunteers, what they’re cleared for, and the hours they’ve given. Each person gets a private link to log
          their own.
        </p>
        {approvals === false && (
          <p className="mt-1 text-sm text-slate-500">Volunteer applications and “approved for” arrive with database update 25.</p>
        )}
      </div>

      {rows && approvals && <Waiting rows={waiting} reviewer={user?.id ?? null} onChanged={load} />}

      <div className={`flex gap-2 ${suggestions ? 'max-w-xl' : 'max-w-md'}`}>
        {(
          [
            ['roster', `Roster${rows ? ` (${rows.length})` : ''}`],
            ['hours', `To confirm${pending.length ? ` (${pending.length})` : ''}`],
            ...(suggestions ? [['certificates', `Certificates${suggestions.length ? ` (${suggestions.length})` : ''}`]] : []),
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={shown === t}
            className={`min-h-[44px] flex-1 rounded-full px-3 text-sm font-bold ${
              shown === t ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <FormError>{error}</FormError>
      {rows === null && !error && <Spinner />}
      {rows && shown === 'roster' && <Roster orgId={orgId} rows={rows} approvals={approvals === true} onChanged={load} />}
      {rows && shown === 'hours' && <ToConfirm rows={rows} pending={pending} onChanged={load} />}
      {rows && shown === 'certificates' && suggestions && (
        <Certificates orgId={orgId} rows={rows} suggestions={suggestions} marks={marks} by={user?.id ?? null} onChanged={load} />
      )}
    </div>
  )
}

/* ============================================================== waiting */

// New people who applied on the website or in the app. Staff read what they
// said, approve them for everything or for some kinds of volunteering, or
// decline — then send the email the decision calls for.

/** Their answers, in a sensible order; anything the form adds later still shows. */
const ANSWERS: [string, string][] = [
  ['age', 'Age'],
  ['guardian_name', 'Parent or guardian'],
  ['guardian_email', 'Parent or guardian’s email'],
  ['availability', 'When they can help'],
  ['experience', 'Experience'],
  ['other', 'Other ways they’d like to help'],
  ['why', 'Why they’d like to help'],
  ['notes', 'Anything else'],
  ['heard', 'How they heard about OHRR'],
]
const answerLabel = (key: string) => {
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
const answerText = (v: unknown): string =>
  Array.isArray(v) ? v.map(String).join(', ') : v && typeof v === 'object' ? JSON.stringify(v) : v == null ? '' : String(v).trim()

function answersOf(app: Record<string, unknown>): { key: string; label: string; value: string }[] {
  const known = new Map(ANSWERS)
  const keys = [...ANSWERS.map(([k]) => k), ...Object.keys(app).filter((k) => !known.has(k))]
  return keys
    .filter((k) => k !== 'kinds')
    .map((key) => ({ key, label: known.get(key) ?? answerLabel(key), value: answerText(app[key]) }))
    .filter((a) => a.value)
}
/** The kinds of volunteering they asked for. */
const askedFor = (v: VolunteerRow): string[] => {
  const k = v.application?.kinds
  return Array.isArray(k) ? k.map(String).filter(Boolean) : []
}

/** An email to an applicant — with their parent or guardian copied in when they're under 18. */
function applicantMailto(v: VolunteerRow, subject: string, body: string): string {
  const guardian = answerText(v.application?.guardian_email)
  const cc = guardian.includes('@') ? `cc=${encodeURIComponent(guardian)}&` : ''
  return `mailto:${v.email ?? ''}?${cc}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** The approval email: what they're approved for, where to sign up, and their own page. From OHRR; never a phone number. */
function approvalMailto(v: VolunteerRow, kinds: string[]): string {
  const what = kinds.includes(EVERYTHING) ? 'all of our volunteering' : approvedText(kinds)
  const body = [
    `Hi ${firstName(v.name)},`,
    '',
    `Thank you for applying to volunteer with Ohio House Rabbit Rescue — you’re approved for ${what}.`,
    '',
    `To sign up for a shift, go to the Volunteer page on our website and use this email address (${v.email ?? ''}) when you sign up:`,
    `${SITE_ORIGIN}/volunteer`,
    '',
    'Your own volunteer page shows what you’re signed up for and the hours you’ve given. It’s private to you, so please keep the link to yourself:',
    siteHoursUrl(v.access_token),
    '',
    'We’re so glad you’re joining us.',
    '',
    'Ohio House Rabbit Rescue',
  ].join('\n')
  return applicantMailto(v, 'You’re approved to volunteer with OHRR', body)
}

/** A short, kind note when OHRR can't take someone on. */
function declineMailto(v: VolunteerRow): string {
  const body = [
    `Hi ${firstName(v.name)},`,
    '',
    'Thank you for offering to volunteer with Ohio House Rabbit Rescue, and for taking the time to apply.',
    '',
    'We’re not able to offer you a volunteer place right now, but we’re grateful you thought of the rabbits — and you’re always welcome at our events.',
    '',
    'With thanks,',
    'Ohio House Rabbit Rescue',
  ].join('\n')
  return applicantMailto(v, 'Your OHRR volunteer application', body)
}

/** Before deciding: a question for them. */
function questionMailto(v: VolunteerRow): string {
  const body = [`Hi ${firstName(v.name)},`, '', 'Thank you for applying to volunteer with Ohio House Rabbit Rescue.', '', '', 'Ohio House Rabbit Rescue'].join('\n')
  return applicantMailto(v, 'Your OHRR volunteer application', body)
}

/** Everything, some kinds, or nothing yet — what a volunteer may sign up for. */
function ApprovedForPicker({ value, onChange, everything = true }: { value: string[]; onChange: (v: string[]) => void; everything?: boolean }) {
  const all = value.includes(EVERYTHING)
  const chip = (on: boolean) =>
    `min-h-[40px] rounded-full px-3.5 text-sm font-bold ${on ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'}`
  const toggle = (k: string) => onChange(all ? [k] : value.includes(k) ? value.filter((x) => x !== k) : [...value, k])
  // A kind the list here doesn't know (added in the database) still shows, so it can be taken off.
  const other = value.filter((x) => x !== EVERYTHING && !APPROVAL_KINDS.some((k) => k.value === x))
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {everything && (
        <button type="button" aria-pressed={all} onClick={() => onChange([EVERYTHING])} className={chip(all)}>
          Everything
        </button>
      )}
      {APPROVAL_KINDS.map((k) => (
        <button key={k.value} type="button" title={k.hint} aria-pressed={!all && value.includes(k.value)} onClick={() => toggle(k.value)} className={chip(!all && value.includes(k.value))}>
          {k.label}
        </button>
      ))}
      {other.map((k) => (
        <button key={k} type="button" aria-pressed onClick={() => toggle(k)} className={chip(true)}>
          {k}
        </button>
      ))}
      {everything && (
        <button type="button" aria-pressed={value.length === 0} onClick={() => onChange([])} className={chip(value.length === 0)}>
          Nothing yet
        </button>
      )}
    </div>
  )
}

interface Reviewed {
  v: VolunteerRow
  outcome: 'approved' | 'declined'
  kinds: string[]
}

function Waiting({ rows, reviewer, onChanged }: { rows: VolunteerRow[]; reviewer: string | null; onChanged: () => Promise<void> }) {
  // Just decided, so the right email is one click away after the list reloads.
  const [reviewed, setReviewed] = useState<Reviewed[]>([])
  if (rows.length === 0 && reviewed.length === 0) return null
  const dismiss = (id: string) => setReviewed((list) => list.filter((x) => x.v.id !== id))

  return (
    <section aria-labelledby="waiting-heading" className="space-y-3 rounded-2xl border border-brand-orange/40 bg-brand-orange-50/40 p-4">
      <div>
        <h2 id="waiting-heading" className="font-display text-xl font-extrabold text-ink">
          Waiting for approval ({rows.length})
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          {rows.length > 0
            ? 'People who applied to volunteer. Approve them for everything or just some kinds of volunteering — then email them.'
            : 'Nobody else is waiting.'}
        </p>
      </div>
      {reviewed.map((r) => (
        <ReviewedNote key={r.v.id} r={r} onDismiss={() => dismiss(r.v.id)} />
      ))}
      {rows.map((v) => (
        <Applicant
          key={v.id}
          v={v}
          reviewer={reviewer}
          onReviewed={async (r) => {
            setReviewed((list) => [r, ...list.filter((x) => x.v.id !== r.v.id)])
            await onChanged()
          }}
        />
      ))}
    </section>
  )
}

function ReviewedNote({ r, onDismiss }: { r: Reviewed; onDismiss: () => void }) {
  const approved = r.outcome === 'approved'
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${approved ? 'border-green-200 bg-green-50/70' : 'border-slate-200 bg-white'}`}>
      <p className={`min-w-0 flex-1 text-sm font-bold ${approved ? 'text-green-800' : 'text-slate-700'}`}>
        {approved
          ? `${r.v.name} is approved for ${r.kinds.includes(EVERYTHING) ? 'everything' : approvedText(r.kinds)}.`
          : `${r.v.name}’s application is declined.`}
      </p>
      {r.v.email && (
        <a href={approved ? approvalMailto(r.v, r.kinds) : declineMailto(r.v)} className={btn.blue}>
          <Icon name="mail" size={15} /> Email {firstName(r.v.name)}
        </a>
      )}
      <button type="button" onClick={onDismiss} className="text-sm font-bold text-slate-500">
        Done
      </button>
    </div>
  )
}

function Applicant({ v, reviewer, onReviewed }: { v: VolunteerRow; reviewer: string | null; onReviewed: (r: Reviewed) => Promise<void> }) {
  const asked = askedFor(v)
  const answers = answersOf(v.application ?? {})
  const already = (v.approved_for ?? []).filter(Boolean)
  // The form sends "Under 18" / "18 or older"; the app may send a number.
  const ageText = answerText(v.application?.age)
  const ageNumber = Number(ageText.match(/\d+/)?.[0] ?? '')
  const under18 = /under\s*18/i.test(ageText) || (ageNumber > 0 && ageNumber < 18 && !/\+|or older|over/i.test(ageText))
  const first = firstName(v.name)
  const [mode, setMode] = useState<'idle' | 'pick' | 'decline'>('idle')
  // "Approve for…" starts from what they asked for, plus anything they're already approved for.
  const [pick, setPick] = useState<string[]>(() => Array.from(new Set([...already, ...asked])).filter((k) => k !== EVERYTHING))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approve = async (kinds: string[]) => {
    setBusy(true)
    setError(null)
    try {
      await approveVolunteer(v.id, kinds, reviewer)
      await onReviewed({ v: { ...v, status: 'active', approved_for: kinds, review_status: 'approved' }, outcome: 'approved', kinds })
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }
  const decline = async () => {
    setBusy(true)
    setError(null)
    try {
      await declineVolunteer(v.id, reviewer)
      await onReviewed({ v: { ...v, review_status: 'declined' }, outcome: 'declined', kinds: [] })
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <p className="font-display text-lg font-extrabold text-ink">{v.name}</p>
        <p className="text-sm text-slate-600">{[v.email, v.phone].filter(Boolean).join(' · ')}</p>
        <p className="text-sm text-slate-600">
          {v.applied_at ? `Applied ${fmtStamp(v.applied_at)}` : 'Applied'}
          {v.hours_for ? ` · needs hours for ${v.hours_for}` : ''}
        </p>
      </div>
      <p className="text-base text-ink">
        <strong>Would like to help with:</strong> {asked.length > 0 ? asked.map(kindLabel).join(', ') : 'nothing picked in particular'}
      </p>
      {already.length > 0 && <p className="text-sm text-slate-600">Already on the roster — approved for {approvedText(already)}.</p>}
      {under18 && <p className="text-sm font-semibold text-brand-orange-dark">Under 18 — Buncare shifts are for volunteers 18 and over.</p>}
      {answers.length > 0 && (
        <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
          {answers.map((a) => (
            <div key={a.key} className={a.value.length > 60 ? 'sm:col-span-2' : ''}>
              <dt className="text-sm font-bold text-slate-500">{a.label}</dt>
              <dd className="whitespace-pre-wrap break-words text-base text-ink">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <FormError>{error}</FormError>

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void approve([EVERYTHING])} className={`${btn.orange} disabled:opacity-60`}>
            <Icon name="check" size={16} /> {busy ? 'Saving…' : 'Approve for everything'}
          </button>
          <button type="button" onClick={() => setMode('pick')} className={btn.outline}>
            Approve for…
          </button>
          <button
            type="button"
            onClick={() => setMode('decline')}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600"
          >
            Decline
          </button>
          {v.email && (
            <a href={questionMailto(v)} className={btn.outline}>
              <Icon name="mail" size={15} /> Email them
            </a>
          )}
        </div>
      )}

      {mode === 'pick' && (
        <div className="space-y-2 rounded-2xl border border-brand-blue/25 bg-brand-blue-50/40 p-3">
          <p className="text-sm font-semibold text-slate-700">Approve {first} for</p>
          <ApprovedForPicker value={pick} onChange={setPick} everything={false} />
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={busy || pick.length === 0} onClick={() => void approve(pick)} className={`${btn.orange} disabled:opacity-60`}>
              {busy ? 'Saving…' : 'Save the approval'}
            </button>
            <button type="button" onClick={() => setMode('idle')} className={btn.outline}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'decline' && (
        <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50/60 p-3">
          <p className="text-sm text-slate-700">
            Decline {first}’s application? They won’t be able to sign up for shifts that need approval. You can still approve them later from
            their roster entry.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void decline()}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Yes, decline'}
            </button>
            <button type="button" onClick={() => setMode('idle')} className={btn.outline}>
              Keep it waiting
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ===================================================== dashboard notices */

/** Something waiting, on the staff dashboard — shown only when there's at least one (and never before update 25). */
function WaitingNotice({
  orgId,
  count,
  icon,
  title,
  to,
  link,
  className = '',
}: {
  orgId: string
  count: (orgId: string) => Promise<number>
  icon: IconName
  title: (n: number) => string
  to: string
  link: string
  className?: string
}) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!orgId) return
    let alive = true
    count(orgId).then((c) => alive && setN(c))
    return () => {
      alive = false
    }
  }, [orgId, count])

  if (n === 0) return null
  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange-50/50 p-4 ${className}`}>
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange-dark">
        <Icon name={icon} size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-extrabold text-ink">{title(n)}</p>
        <Link to={to} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand-blue">
          {link} <Icon name="chevron" size={15} />
        </Link>
      </div>
    </div>
  )
}

/** "N volunteer applications waiting". */
export function PendingApplicationsNotice({ orgId, className }: { orgId: string; className?: string }) {
  return (
    <WaitingNotice
      orgId={orgId}
      count={pendingApplications}
      icon="users"
      title={(n) => `${n} volunteer application${n === 1 ? '' : 's'} waiting`}
      to="/staff/volunteers"
      link="Review them in Volunteers"
      className={className}
    />
  )
}

/** "Certificates to consider (N)" — for OHRR's top tier. */
export function CertificatesNotice({ orgId, className }: { orgId: string; className?: string }) {
  return (
    <WaitingNotice
      orgId={orgId}
      count={openCertificateCount}
      icon="award"
      title={(n) => `Certificates to consider (${n})`}
      to="/staff/volunteers?tab=certificates"
      link="Open them in Volunteers"
      className={className}
    />
  )
}

/* ================================================================ roster */

function Roster({ orgId, rows, approvals, onChanged }: { orgId: string; rows: VolunteerRow[]; approvals: boolean; onChanged: () => Promise<void> }) {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) => `${r.name} ${r.email ?? ''} ${r.phone ?? ''} ${r.roles.join(' ')}`.toLowerCase().includes(t))
  }, [rows, q])

  const active = rows.filter((r) => r.status === 'active')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find by name, email or role"
          aria-label="Find a volunteer"
          className={`${staffInput} !mt-0 max-w-sm`}
        />
        {editing !== 'new' && (
          <button type="button" onClick={() => setEditing('new')} className={btn.orange}>
            <Icon name="plus" size={16} className="mr-1" /> Add a volunteer
          </button>
        )}
        {active.length > 0 && (
          <a href={bccMailto(active.map((r) => r.email ?? '').filter(Boolean), 'OHRR volunteers')} className={btn.outline}>
            <Icon name="mail" size={15} className="mr-1.5" /> Email all active
          </a>
        )}
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() =>
              exportCsv(
                `ohrr-volunteers-${new Date().toISOString().slice(0, 10)}.csv`,
                toCsv(
                  ['Name', 'Status', 'Email', 'Phone', 'Roles', ...(approvals ? ['Approved for'] : []), 'Started', 'Orientation', 'Notes'],
                  rows.map((r) => [
                    r.name,
                    statusLabel(r.status),
                    r.email ?? '',
                    r.phone ?? '',
                    r.roles.join('; '),
                    ...(approvals ? [(r.approved_for ?? []).map(kindLabel).join('; ')] : []),
                    r.started_on ?? '',
                    r.orientation_on ?? '',
                    r.notes ?? '',
                  ]),
                ),
              )
            }
            className={btn.outline}
          >
            Export the roster (CSV)
          </button>
        )}
      </div>

      {editing === 'new' && (
        <Card>
          <VolunteerForm
            orgId={orgId}
            initial={null}
            approvals={approvals}
            onDone={async () => {
              setEditing(null)
              await onChanged()
            }}
            onCancel={() => setEditing(null)}
          />
        </Card>
      )}

      {rows.length === 0 && (
        <Card className="text-sm text-slate-600">
          Nobody on the roster yet. Add the people who volunteer regularly — the hours they’ve already logged against
          their email address will attach themselves.
        </Card>
      )}
      {rows.length > 0 && shown.length === 0 && <p className="text-sm text-slate-600">Nobody matches that.</p>}

      {shown.map((r) =>
        editing === r.id ? (
          <Card key={r.id}>
            <VolunteerForm
              orgId={orgId}
              initial={r}
              approvals={approvals}
              onDone={async () => {
                setEditing(null)
                await onChanged()
              }}
              onCancel={() => setEditing(null)}
            />
          </Card>
        ) : (
          <Card key={r.id} className="space-y-2">
            <div className="flex flex-wrap items-start gap-3">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-extrabold text-ink">{r.name}</span>
                  {r.status !== 'active' && <Badge tone="slate">{statusLabel(r.status)}</Badge>}
                  {r.orientation_on && <Badge tone="blue">Orientation done</Badge>}
                  {approvals && r.review_status === 'pending' && <Badge tone="orange">Waiting for approval</Badge>}
                  {approvals && r.review_status === 'declined' && (r.approved_for ?? []).length === 0 && <Badge tone="slate">Application declined</Badge>}
                </span>
                {r.roles.length > 0 && <span className="block text-sm text-slate-600">{r.roles.join(' · ')}</span>}
                <span className="block text-sm text-slate-600">{[r.email, r.phone].filter(Boolean).join(' · ') || 'No contact details'}</span>
                {approvals && <span className="block text-sm text-slate-600">Approved for: {approvedText(r.approved_for)}</span>}
              </span>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => setOpenId(openId === r.id ? null : r.id)} className={btn.blue}>
                  {openId === r.id ? 'Hide' : 'Hours & link'}
                </button>
                <button type="button" onClick={() => setEditing(r.id)} className={btn.outline}>
                  Edit
                </button>
              </div>
            </div>
            {openId === r.id && <VolunteerDetail v={r} approvals={approvals} onChanged={onChanged} />}
          </Card>
        ),
      )}
    </div>
  )
}

/** A QR code drawn right here in the browser (no outside image service). */
function QrImage({ value, size, alt }: { value: string; size: number; alt: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: size * 2, color: { dark: '#0669ac', light: '#ffffff' } })
      .then((d) => alive && setSrc(d))
      .catch(() => alive && setSrc(null))
    return () => {
      alive = false
    }
  }, [value, size])
  if (!src) return <span className="block rounded-xl bg-slate-100" style={{ width: size, height: size }} />
  return <img src={src} alt={alt} width={size} height={size} className="rounded-xl bg-white" />
}

/** The private link + QR, and every hour on this person's record. */
function VolunteerDetail({ v, approvals, onChanged }: { v: VolunteerRow; approvals: boolean; onChanged: () => Promise<void> }) {
  const [hours, setHours] = useState<HoursRow[] | null>(null)
  // Letters they made for themselves from their own page (update 25); null = none to show.
  const [letters, setLetters] = useState<IssuedLetterRow[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The link the app hands out (a phone scans the QR and lands in the app);
  // the same token opens the same record on this website.
  const link = hoursUrl(v.access_token)
  const siteLink = siteHoursUrl(v.access_token)

  const load = useCallback(async () => {
    try {
      setHours(await volunteerHours(v.id))
    } catch (e) {
      setError(errMessage(e))
    }
  }, [v.id])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    let alive = true
    volunteerLetters(v.id).then((l) => alive && setLetters(l))
    return () => {
      alive = false
    }
  }, [v.id])

  const total = (hours ?? []).reduce((n, h) => n + Number(h.hours), 0)
  const confirmed = (hours ?? []).filter((h) => h.status === 'confirmed').reduce((n, h) => n + Number(h.hours), 0)
  const first = v.name.split(' ')[0]
  const emailBody = `Hi ${first},\n\nThis link opens your own volunteer-hours record in the OHRR app — you can see your totals and log hours yourself:\n\n${link}\n\nOn a computer, the same record opens on the OHRR website:\n\n${siteLink}\n\nKeep it private to you.\n\nThank you for everything you do,\nOhio House Rabbit Rescue`

  const copy = async (text: string, what: string) => {
    setNote((await copyText(text)) ? `${what} copied.` : 'Couldn’t copy that here — select the link and copy it.')
  }

  return (
    <div className="grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[18rem_1fr]">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-brand-blue-50/50 p-4">
        <p className="text-center text-base font-bold text-ink">Their private hours link</p>
        <QrImage value={link} size={168} alt={`QR code to ${v.name}'s hours`} />
        <p className="break-all text-center text-sm text-slate-600">{link}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => void copy(link, 'App link')} className={btn.outline}>
            Copy link
          </button>
          <button type="button" onClick={() => void copy(siteLink, 'Website link')} className={btn.outline}>
            Copy website link
          </button>
          {v.email && (
            <a href={`mailto:${v.email}?subject=${encodeURIComponent('Your OHRR volunteer hours')}&body=${encodeURIComponent(emailBody)}`} className={btn.blue}>
              Email it to them
            </a>
          )}
          {approvals && v.email && v.review_status === 'approved' && (v.approved_for ?? []).length > 0 && (
            <a href={approvalMailto(v, v.approved_for ?? [])} className={btn.outline}>
              Email their approval
            </a>
          )}
        </div>
        {note && <p className="text-center text-sm font-bold text-green-700">{note}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-base font-bold text-ink">
            {hoursLabel(total)} total{confirmed !== total ? ` · ${hoursLabel(confirmed)} confirmed` : ''}
          </span>
          {v.email && (
            <Link to={`/staff/hours-letter?email=${encodeURIComponent(v.email)}&name=${encodeURIComponent(v.name)}`} className={btn.outline}>
              Hours letter →
            </Link>
          )}
        </div>

        <FormError>{error}</FormError>
        {hours === null && <Spinner />}
        {hours && hours.length === 0 && <p className="text-sm text-slate-600">No hours recorded yet.</p>}
        {hours && hours.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {hours.slice(0, 12).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-ink">
                    {hoursLabel(Number(h.hours))} · {h.activity}
                  </span>
                  <span className="block text-sm text-slate-600">
                    {fmtDate(h.on_date)}
                    {h.source === 'self' ? ' · logged by them' : h.source === 'checkin' ? ' · from a shift' : ' · added by staff'}
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                </span>
                {h.status === 'logged' ? (
                  <button
                    type="button"
                    onClick={() => setHoursStatus(h.id, 'confirmed').then(load).then(onChanged).catch((e) => setError(errMessage(e)))}
                    className="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    Confirm
                  </button>
                ) : (
                  <Badge tone="blue">Confirmed</Badge>
                )}
                <button
                  type="button"
                  onClick={() =>
                    window.confirm(`Delete this ${hoursLabel(Number(h.hours))} entry for ${v.name}?`) &&
                    deleteHoursEntry(h.id).then(load).then(onChanged).catch((e) => setError(errMessage(e)))
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-sm font-bold text-red-600"
                >
                  <Icon name="trash" size={15} /> Delete
                </button>
              </li>
            ))}
            {hours.length > 12 && <li className="py-2 text-sm text-slate-600">Showing the latest 12 of {hours.length}. The hours letter uses every entry.</li>}
          </ul>
        )}

        {letters && letters.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-base font-bold text-ink">Letters they’ve made</p>
            <ul className="divide-y divide-slate-100">
              {letters.map((l) => (
                <li key={l.code} className="py-2 text-sm text-slate-600">
                  <span className="block font-bold text-ink">
                    {LETTER_KINDS.find((k) => k.value === l.kind)?.label ?? l.kind} · {hoursLabel(Number(l.total_hours))}
                  </span>
                  {fmtStamp(l.created_at)} · covers {fmtDate(l.period_from)} – {fmtDate(l.period_to)} · code{' '}
                  <span className="font-mono font-bold text-ink">{l.code}</span>
                  {l.issued_by === 'staff' ? ' · made by staff' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function VolunteerForm({
  orgId,
  initial,
  approvals,
  onDone,
  onCancel,
}: {
  orgId: string
  initial: VolunteerRow | null
  /** Show "Approved for" (update 25 has run). */
  approvals: boolean
  onDone: () => Promise<void>
  onCancel: () => void
}) {
  const [d, setD] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    status: initial?.status ?? ('active' as VolunteerRow['status']),
    roles: initial?.roles ?? [],
    started_on: initial?.started_on ?? '',
    orientation_on: initial?.orientation_on ?? '',
    notes: initial?.notes ?? '',
    // Someone staff add by hand is someone they know: approved for everything unless they change it.
    approved_for: initial ? (initial.approved_for ?? []) : [EVERYTHING],
  })
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const txt = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })
  const toggleRole = (r: string) => setD((x) => ({ ...x, roles: x.roles.includes(r) ? x.roles.filter((y) => y !== r) : [...x.roles, r] }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await saveVolunteer({
        ...(initial ? { id: initial.id } : {}),
        org_id: orgId,
        name: d.name.trim(),
        email: d.email.trim() || null,
        phone: d.phone.trim() || null,
        status: d.status,
        roles: d.roles,
        started_on: d.started_on || null,
        orientation_on: d.orientation_on || null,
        notes: d.notes.trim() || null,
        ...(approvals ? { approved_for: d.approved_for } : {}),
      })
      await onDone()
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="font-display text-lg font-extrabold text-ink">{initial ? `Edit ${initial.name}` : 'New volunteer'}</p>
      <label className="block text-sm font-semibold text-slate-700">
        Name
        <input className={staffInput} required value={d.name} onChange={txt('name')} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className={staffInput} type="email" value={d.email} onChange={txt('email')} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Phone
          <input className={staffInput} type="tel" value={d.phone} onChange={txt('phone')} />
        </label>
      </div>
      <p className="text-sm text-slate-600">The email matters: hours already recorded against it attach to this person automatically.</p>
      <label className="block text-sm font-semibold text-slate-700">
        Where they’re at
        <select className={staffInput} value={d.status} onChange={txt('status')}>
          {VOLUNTEER_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div>
        <p className="text-sm font-semibold text-slate-700">What they do</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {VOLUNTEER_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={d.roles.includes(r)}
              onClick={() => toggleRole(r)}
              className={`min-h-[40px] rounded-full px-3.5 text-sm font-bold ${
                d.roles.includes(r) ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {approvals && (
        <div>
          <p className="text-sm font-semibold text-slate-700">Approved for</p>
          <ApprovedForPicker value={d.approved_for} onChange={(approved_for) => setD({ ...d, approved_for })} />
          <p className="mt-1 text-sm text-slate-600">
            What they can sign up for where a shift or call is for approved volunteers only
            {d.status !== 'active' && d.approved_for.length > 0 ? ' — once they’re Active' : ''}.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold text-slate-700">
          Started
          <input type="date" className={staffInput} value={d.started_on} onChange={txt('started_on')} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Buncare orientation
          <input type="date" className={staffInput} value={d.orientation_on} onChange={txt('orientation_on')} />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Notes <span className="font-normal text-slate-500">(staff only)</span>
        <textarea className={staffInput} rows={2} value={d.notes} onChange={txt('notes')} />
      </label>
      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !d.name.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className={btn.outline}>
          Cancel
        </button>
        {initial &&
          (confirmDelete ? (
            <button
              type="button"
              onClick={() => deleteVolunteer(initial.id).then(onDone).catch((e) => setError(errMessage(e)))}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white"
            >
              Confirm delete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center justify-center rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600"
            >
              Delete
            </button>
          ))}
      </div>
    </form>
  )
}

/* ========================================================== certificates */

// Certificates are OHRR's to give, not self-serve. One is suggested when a
// volunteer makes an hours letter for themselves, and when their confirmed
// hours pass a mark set here; staff make it on the hours-letter page or say
// "not now".

function Certificates({
  orgId,
  rows,
  suggestions,
  marks,
  by,
  onChanged,
}: {
  orgId: string
  rows: VolunteerRow[]
  suggestions: CertificateSuggestion[]
  marks: number[] | null
  by: string | null
  onChanged: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows])

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-extrabold text-ink">Certificates to consider ({suggestions.length})</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-600">
          Someone appears here when they make an hours letter for themselves, or when their confirmed hours pass one of the marks
          below. Volunteers can’t make their own certificates.
        </p>
      </div>
      <FormError>{error}</FormError>
      {suggestions.length === 0 && <Card className="text-sm text-slate-600">Nothing to consider right now.</Card>}
      {suggestions.map((s) => {
        const v = byId.get(s.volunteer_id)
        return (
          <Card key={s.id} className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-extrabold text-ink">{v?.name ?? 'A volunteer'}</span>
              <span className="block text-base text-slate-700">{suggestionReason(s)}</span>
              <span className="block text-sm text-slate-600">
                {fmtStamp(s.created_at)}
                {s.letter_code ? ` · letter ${s.letter_code}` : ''}
              </span>
            </span>
            {v?.email ? (
              <Link
                to={`/staff/hours-letter?email=${encodeURIComponent(v.email)}&name=${encodeURIComponent(v.name)}&kind=certificate&suggestion=${s.id}`}
                className={btn.orange}
              >
                <Icon name="award" size={16} /> Make certificate
              </Link>
            ) : (
              <span className="text-sm text-slate-500">Add their email to make one</span>
            )}
            <button
              type="button"
              onClick={() => {
                setError(null)
                setSuggestionStatus(s.id, 'dismissed', by)
                  .then(onChanged)
                  .catch((e) => setError(errMessage(e)))
              }}
              className={btn.outline}
            >
              Not now
            </button>
          </Card>
        )
      })}
      {marks && <CertificateMarks orgId={orgId} marks={marks} before={suggestions} onChanged={onChanged} />}
    </div>
  )
}

/** The hours that earn a certificate, e.g. 25, 50, 100, 250. */
function CertificateMarks({
  orgId,
  marks,
  before,
  onChanged,
}: {
  orgId: string
  marks: number[]
  /** The open suggestions before saving, to tell who's new. */
  before: CertificateSuggestion[]
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const parsed = Array.from(
    new Set(
      text
        .split(/[^0-9]+/)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 100000),
    ),
  ).sort((a, b) => a - b)

  const save = async () => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const made = await setCertificateHours(orgId, parsed)
      // The database counts suggestions; people can pass two marks at once, so count people.
      const known = new Set(before.map((s) => s.id))
      const fresh = (await certificateSuggestions(orgId)) ?? []
      const people = made === 0 ? 0 : new Set(fresh.filter((s) => !known.has(s.id)).map((s) => s.volunteer_id)).size || made
      setNote(
        people === 0
          ? 'Saved. Nobody has passed a new mark yet.'
          : `Saved. ${people} volunteer${people === 1 ? ' has' : 's have'} already passed one — they’re listed above.`,
      )
      setEditing(false)
      await onChanged()
    } catch (e) {
      setError(errMessage(e))
    }
    setBusy(false)
  }

  return (
    <Card className="space-y-2">
      <p className="font-display text-base font-extrabold text-ink">Hours that earn a certificate</p>
      {!editing ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-base text-ink">
            {marks.length > 0 ? marks.map((m) => `${m} hours`).join(' · ') : 'None set — only letters suggest a certificate.'}
          </span>
          <button
            type="button"
            onClick={() => {
              setText(marks.join(', '))
              setNote(null)
              setEditing(true)
            }}
            className={btn.outline}
          >
            {marks.length > 0 ? 'Change' : 'Set the hours'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block max-w-sm text-sm font-semibold text-slate-700">
            Hours, separated by commas
            <input className={staffInput} inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} placeholder="25, 50, 100, 250" />
          </label>
          <p className="text-sm text-slate-600">
            {parsed.length > 0
              ? `A certificate is suggested when someone’s confirmed hours pass ${parsed.join(', ')}.`
              : 'No marks — only letters will suggest a certificate.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void save()} className={`${btn.orange} disabled:opacity-60`}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btn.outline}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {note && <p className="text-sm font-bold text-green-700">{note}</p>}
      <FormError>{error}</FormError>
    </Card>
  )
}

/* ============================================================ to confirm */

function ToConfirm({ rows, pending, onChanged }: { rows: VolunteerRow[]; pending: HoursRow[]; onChanged: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const nameOf = (id: string | null) => rows.find((r) => r.id === id)?.name ?? 'Someone'

  if (pending.length === 0) {
    return (
      <Card className="space-y-2 text-sm text-slate-600">
        <p className="text-base font-bold text-ink">Nothing waiting.</p>
        <p>Hours a volunteer logs for themselves appear here so you can confirm or correct them before they count on a service letter.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <FormError>{error}</FormError>
      <button
        type="button"
        onClick={async () => {
          try {
            await Promise.all(pending.map((h) => setHoursStatus(h.id, 'confirmed')))
            await onChanged()
          } catch (e) {
            setError(errMessage(e))
          }
        }}
        className={btn.orange}
      >
        <Icon name="check" size={17} className="mr-1" /> Confirm all {pending.length}
      </button>
      {pending.map((h) => (
        <Card key={h.id}>
          <div className="flex flex-wrap items-start gap-3">
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-extrabold text-ink">
                {nameOf(h.volunteer_id)} · {hoursLabel(Number(h.hours))}
              </span>
              <span className="block text-base text-slate-700">{h.activity}</span>
              <span className="block text-sm text-slate-600">
                {fmtDay(h.on_date)}
                {h.note ? ` · ${h.note}` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setHoursStatus(h.id, 'confirmed').then(onChanged).catch((e) => setError(errMessage(e)))}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() =>
                window.confirm(`Delete this entry from ${nameOf(h.volunteer_id)}?`) &&
                deleteHoursEntry(h.id).then(onChanged).catch((e) => setError(errMessage(e)))
              }
              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-sm font-bold text-red-600"
            >
              <Icon name="trash" size={15} /> Delete
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}
