// The form for a volunteer call (website mirror of the app's CallEditor.tsx):
// what it's for, when, how long each shift is and how many people each needs
// — with the shifts it will make shown as you type. Saving makes (or
// remakes) the shifts.
import { useEffect, useState, type FormEvent } from 'react'
import { errMessage } from '../../lib/supabase'
import { useBunFestEvent } from '../../lib/data'
import { Card, btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { staffInput } from '../../lib/staff'
import { fmtClock, lengthText, needText, plannedShifts, type Call } from '../../lib/volunteers/calls'
import { deleteCall, saveCall, type CallRow } from '../../lib/volunteers/callsApi'
import { columnsReady, setCallApproval } from '../../lib/volunteers/api'
import { FormError, WhoCanSignUp } from './callBits'

const LENGTHS = [60, 90, 120, 180, 240]

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

export default function VolunteerCallEditor({
  orgId,
  initial,
  onSaved,
  onCancel,
  onDeleted,
}: {
  orgId: string
  initial: CallRow | null
  /** `note` is something staff should know about what the save did. */
  onSaved: (id: string, note?: string) => void
  onCancel: () => void
  onDeleted?: () => void
}) {
  const { event: bunfest } = useBunFestEvent()
  const [d, setD] = useState({
    title: initial?.title ?? '',
    summary: initial?.summary ?? '',
    details: initial?.details ?? '',
    location: initial?.location ?? '',
    on_date: initial?.on_date ?? '',
    starts_at: (initial?.starts_at ?? '10:00:00').slice(0, 5),
    ends_at: (initial?.ends_at ?? '14:00:00').slice(0, 5),
    shift_minutes: initial?.shift_minutes ?? 120,
    people_per_shift: initial?.people_per_shift ?? 2,
    areas: (initial?.areas ?? []).join('\n'),
    who: initial?.who ?? '',
    perks: (initial?.perks ?? []).join('\n'),
    requirements: initial?.requirements ?? '',
    closes_on: initial?.closes_on ?? '',
    is_published: initial?.is_published ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Who can sign up (update 25): new calls are for approved Events & BunFest
  // volunteers unless staff open them to anyone.
  const [approvals, setApprovals] = useState<boolean | null>(null)
  const [approval, setApproval] = useState<string | null>(
    initial ? ((initial as CallRow & { approval_role?: string | null }).approval_role ?? null) : 'events',
  )
  useEffect(() => {
    let alive = true
    columnsReady('volunteer_calls', 'approval_role').then((ok) => alive && setApprovals(ok))
    return () => {
      alive = false
    }
  }, [])
  const txt = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })

  const preview: Call = {
    id: '',
    slug: '',
    title: d.title,
    summary: d.summary,
    details: d.details,
    location: d.location,
    on_date: d.on_date || '2026-01-01',
    starts_at: `${d.starts_at}:00`,
    ends_at: `${d.ends_at}:00`,
    shift_minutes: d.shift_minutes,
    people_per_shift: d.people_per_shift,
    areas: lines(d.areas),
    who: d.who,
    perks: lines(d.perks),
    requirements: d.requirements,
    closes_on: d.closes_on || null,
  }
  const shifts = plannedShifts(preview)

  // This year's BunFest, from the festival's own record and the volunteer
  // page OHRR publishes: the day, the place, the hours and the four areas.
  const fromBunfest = () => {
    if (!bunfest) return
    const day = new Date(bunfest.startsAt).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const t = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' })
    const place = [bunfest.venue, bunfest.address]
    if (bunfest.city && !(bunfest.address ?? '').includes(bunfest.city)) place.push(bunfest.city)
    setD({
      ...d,
      title: bunfest.title,
      summary: d.summary || 'Help run Midwest BunFest — a day of bunnies, education, vendors and fun, presented by OHRR.',
      location: place.filter(Boolean).join(', '),
      on_date: day,
      starts_at: t(bunfest.startsAt),
      ends_at: bunfest.endsAt ? t(bunfest.endsAt) : d.ends_at,
      areas: d.areas || ['Glamour Shots', 'Hop Shop', 'Registration / Check-in', 'Silent Auction / Raffle'].join('\n'),
      perks: d.perks || ['Free admission', 'A free Midwest BunFest lanyard'].join('\n'),
      who: d.who || 'People who love bunnies — most roles need nothing more than an interest in helping out.',
    })
    setNote('Filled in from this year’s BunFest. Check the shift length and how many people each shift needs.')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await saveCall(orgId, {
        ...(initial ? { id: initial.id, slug: initial.slug } : {}),
        title: d.title.trim(),
        summary: d.summary.trim() || null,
        details: d.details.trim() || null,
        location: d.location.trim() || null,
        on_date: d.on_date,
        starts_at: `${d.starts_at}:00`,
        ends_at: `${d.ends_at}:00`,
        shift_minutes: d.shift_minutes,
        people_per_shift: d.people_per_shift,
        areas: lines(d.areas),
        who: d.who.trim() || null,
        perks: lines(d.perks),
        requirements: d.requirements.trim() || null,
        closes_on: d.closes_on || null,
        is_published: d.is_published,
      })
      // Then who can sign up; the database copies it to the call's shifts.
      let approvalNote: string | null = null
      if (approvals) {
        try {
          await setCallApproval(r.id, approval)
        } catch (err) {
          approvalNote = `Who can sign up wasn’t saved: ${errMessage(err)}`
        }
      }
      const orphanNote =
        r.orphaned > 0
          ? `Saved. ${r.orphaned} ${r.orphaned === 1 ? 'shift has' : 'shifts have'} people on ${r.orphaned === 1 ? 'it' : 'them'} but no longer fit${r.orphaned === 1 ? 's' : ''} the hours — ${r.orphaned === 1 ? 'it’s' : 'they’re'} closed to new sign-ups; check under Sign-ups.`
          : null
      onSaved(r.id, [orphanNote ?? (approvalNote ? 'Saved.' : null), approvalNote].filter(Boolean).join(' ') || undefined)
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!initial && bunfest && (
        <button type="button" onClick={fromBunfest} className={btn.outline}>
          <Icon name="star" size={16} className="mr-1.5" /> Fill in from {bunfest.title}
        </button>
      )}
      {note && <p className="rounded-xl bg-brand-blue-50 px-3 py-2 text-sm text-brand-blue">{note}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            What it’s for
            <input className={staffInput} required value={d.title} onChange={txt('title')} placeholder="Midwest BunFest 2026" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Say the event, not “volunteers” — posts read “Volunteers needed — {d.title || 'this'}”.</span>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            One line about it
            <input className={staffInput} value={d.summary} onChange={txt('summary')} placeholder="Help run the festival — a day of bunnies, education and fun." />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            What volunteers will do (optional)
            <textarea className={staffInput} rows={3} value={d.details} onChange={txt('details')} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Where
            <input className={staffInput} value={d.location} onChange={txt('location')} placeholder="The Makoy, 5462 Center St., Hilliard" />
          </label>
        </Card>

        <Card className="space-y-3">
          <p className="font-display text-base font-extrabold text-ink">When, and how many</p>
          <label className="block text-sm font-semibold text-slate-700">
            The day
            <input type="date" className={staffInput} required value={d.on_date} onChange={txt('on_date')} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-slate-700">
              From
              <input type="time" className={staffInput} required value={d.starts_at} onChange={txt('starts_at')} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              To
              <input type="time" className={staffInput} required value={d.ends_at} onChange={txt('ends_at')} />
            </label>
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-700">Each shift is</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {LENGTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={d.shift_minutes === m}
                  onClick={() => setD({ ...d, shift_minutes: m })}
                  className={`min-h-[40px] rounded-full px-4 text-sm font-bold ${d.shift_minutes === m ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                  {lengthText(m)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-700">People needed on each shift</span>
            <span className="mt-1 flex items-center gap-2">
              <button type="button" aria-label="Fewer" onClick={() => setD({ ...d, people_per_shift: Math.max(1, d.people_per_shift - 1) })} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold">
                −
              </button>
              <input
                aria-label="People needed on each shift"
                className="h-10 w-20 rounded-xl border border-slate-200 bg-white text-center font-display text-lg font-extrabold outline-none"
                inputMode="numeric"
                value={d.people_per_shift}
                onChange={(e) => setD({ ...d, people_per_shift: Math.max(1, Math.min(200, Number(e.target.value.replace(/\D/g, '')) || 1)) })}
              />
              <button type="button" aria-label="More" onClick={() => setD({ ...d, people_per_shift: Math.min(200, d.people_per_shift + 1) })} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold">
                +
              </button>
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            {shifts.length === 0 ? (
              <span className="font-semibold text-red-700">The hours are shorter than one shift — widen them or shorten the shift.</span>
            ) : (
              <>
                <strong className="text-ink">
                  {shifts.length} {shifts.length === 1 ? 'shift' : 'shifts'}:
                </strong>{' '}
                {shifts.map((s) => `${fmtClock(s.from)}–${fmtClock(s.to)}`).join(' · ')}
                <span className="mt-0.5 block text-slate-600">We need {needText(preview)}.</span>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="grid gap-3 lg:grid-cols-2">
        <p className="font-display text-base font-extrabold text-ink lg:col-span-2">For the people signing up</p>
        <label className="block text-sm font-semibold text-slate-700">
          Areas to pick from — one per line (optional)
          <textarea className={staffInput} rows={4} value={d.areas} onChange={txt('areas')} placeholder={'Glamour Shots\nHop Shop'} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          What volunteers get — one per line (optional)
          <textarea className={staffInput} rows={4} value={d.perks} onChange={txt('perks')} placeholder={'Free admission\nA BunFest lanyard'} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Who can help
          <input className={staffInput} value={d.who} onChange={txt('who')} placeholder="Anyone 16 or older — no experience needed." />
        </label>
        {approvals && (
          <div className="lg:col-span-2">
            <WhoCanSignUp label="Who can sign up" value={approval} onChange={setApproval} />
          </div>
        )}
        {approvals === false && (
          <p className="text-xs text-slate-500 lg:col-span-2">Calls for approved volunteers only arrive with database update 25 — until then anyone can sign up.</p>
        )}
        <label className="block text-sm font-semibold text-slate-700">
          Before they sign up — one per line (optional)
          <textarea className={staffInput} rows={3} value={d.requirements} onChange={txt('requirements')} placeholder="Closed-toe shoes" />
          <span className="mt-1 block text-xs font-normal text-slate-500">People tick that they’ve read these.</span>
        </label>
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Stop taking sign-ups after (optional)
            <input type="date" className={staffInput} value={d.closes_on} onChange={txt('closes_on')} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-blue" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} />
            People can see this and sign up
          </label>
        </div>
      </Card>

      <FormError>{error}</FormError>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || shifts.length === 0} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : initial ? 'Save' : 'Save and make the shifts'}
        </button>
        <button type="button" onClick={onCancel} className={btn.outline}>
          Cancel
        </button>
        {initial &&
          onDeleted &&
          (confirmDelete ? (
            <button
              type="button"
              onClick={() => deleteCall(initial.id).then(onDeleted).catch((e) => setError(errMessage(e)))}
              className="ml-auto rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              Delete it — the sign-ups stay in Bookings
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600">
              Delete this call
            </button>
          ))}
      </div>
    </form>
  )
}
