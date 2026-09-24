// Staff → Volunteers: the roster, and the hours people log for themselves.
// Desktop mirror of the app's StaffVolunteers — same tables and RPCs, so an
// edit here shows on a phone immediately and vice-versa.
//
// A volunteer is more than an email address on a booking: who they are, what
// they're cleared for, whether they've done their orientation — plus the
// private link (and QR code) each person uses to see and log their own hours.
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage } from '../../lib/supabase'
import { Card, btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { copyText } from '../../lib/share/share'
import { bccMailto, exportCsv, toCsv } from '../../lib/exportFile'
import {
  deleteHoursEntry,
  deleteVolunteer,
  hoursLabel,
  hoursUrl,
  listVolunteers,
  saveVolunteer,
  setHoursStatus,
  siteHoursUrl,
  statusLabel,
  unconfirmedHours,
  volunteerHours,
  VOLUNTEER_ROLES,
  VOLUNTEER_STATUS,
  type HoursRow,
  type VolunteerRow,
} from '../../lib/volunteers/api'

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

type Tab = 'roster' | 'hours'

export default function Volunteers() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  // The same people the app lets in (and the database's own rule for these tables).
  const allowed = can('volunteers.shifts.manage') || can('bookings.manage')
  const [tab, setTab] = useState<Tab>('roster')
  const [rows, setRows] = useState<VolunteerRow[] | null>(null)
  const [pending, setPending] = useState<HoursRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId || !allowed) return
    try {
      const [list, unconfirmed] = await Promise.all([listVolunteers(orgId), unconfirmedHours(orgId)])
      setRows(list)
      setPending(unconfirmed)
    } catch (e) {
      setError(errMessage(e))
    }
  }, [orgId, allowed])
  useEffect(() => {
    void load()
  }, [load])

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
      </div>

      <div className="flex max-w-md gap-2">
        {(
          [
            ['roster', `Roster${rows ? ` (${rows.length})` : ''}`],
            ['hours', `To confirm${pending.length ? ` (${pending.length})` : ''}`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`min-h-[44px] flex-1 rounded-full px-3 text-sm font-bold ${
              tab === t ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <FormError>{error}</FormError>
      {rows === null && !error && <Spinner />}
      {rows && tab === 'roster' && <Roster orgId={orgId} rows={rows} onChanged={load} />}
      {rows && tab === 'hours' && <ToConfirm rows={rows} pending={pending} onChanged={load} />}
    </div>
  )
}

/* ================================================================ roster */

function Roster({ orgId, rows, onChanged }: { orgId: string; rows: VolunteerRow[]; onChanged: () => Promise<void> }) {
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
                  ['Name', 'Status', 'Email', 'Phone', 'Roles', 'Started', 'Orientation', 'Notes'],
                  rows.map((r) => [
                    r.name,
                    statusLabel(r.status),
                    r.email ?? '',
                    r.phone ?? '',
                    r.roles.join('; '),
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
                </span>
                {r.roles.length > 0 && <span className="block text-sm text-slate-600">{r.roles.join(' · ')}</span>}
                <span className="block text-sm text-slate-600">{[r.email, r.phone].filter(Boolean).join(' · ') || 'No contact details'}</span>
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
            {openId === r.id && <VolunteerDetail v={r} onChanged={onChanged} />}
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
function VolunteerDetail({ v, onChanged }: { v: VolunteerRow; onChanged: () => Promise<void> }) {
  const [hours, setHours] = useState<HoursRow[] | null>(null)
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
      </div>
    </div>
  )
}

function VolunteerForm({
  orgId,
  initial,
  onDone,
  onCancel,
}: {
  orgId: string
  initial: VolunteerRow | null
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
