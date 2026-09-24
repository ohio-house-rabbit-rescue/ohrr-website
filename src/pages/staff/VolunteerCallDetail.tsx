// Staff → Volunteer calls → one call (website mirror of the app's
// StaffCall.tsx). Four tabs, in the order the work happens:
//
//   Sign-ups         who's down for which shift, and where they came from
//   Spread the word  the call said every way — post, story, text, email to a
//                    company, email to a group, printed letter, flyer,
//                    newsletter — each with its own tracked link, ready to
//                    copy, download, print or send
//   On the day       click "Here" as people arrive; add anyone who walks in.
//                    Not a time clock: being here for a shift counts the shift
//   Thank everyone   everyone who came, with their hours here, this year and
//                    in all — a thank-you by email or text, and their letter
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStaff, Spinner, staffInput } from '../../lib/staff'
import { errMessage } from '../../lib/supabase'
import { Card, btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { renderCard, canvasToBlob } from '../../lib/share/render'
import { copyText, savePng } from '../../lib/share/share'
import { printPng, renderFlyer } from '../../lib/share/flyerCanvas'
import {
  MEDIA,
  SOURCE_LABEL,
  callLink,
  fmtClock,
  fmtDayShort,
  fmtHours,
  fmtShift,
  needShort,
  outreach,
  thankYou,
  whenText,
  type Call,
  type Helper,
  type HoursFor,
  type Medium,
  type OrgBits,
  type Shift,
} from '../../lib/volunteers/calls'
import { addWalkIn, callRoster, callSources, callThanks, hoursForByEmail, loadCall, markThanked, setAttendance, type CallRow, type RosterLine } from '../../lib/volunteers/callsApi'
import { paintLetter } from '../../lib/volunteers/paint'
import { useOrgBits } from '../../lib/volunteers/orgBits'
import VolunteerCallEditor from './VolunteerCallEditor'
import { Badge, FormError } from './callBits'

type Tab = 'signups' | 'share' | 'day' | 'thanks'

const small = '!px-4 !py-2'

/** The call with its shifts, as the messages and lists want it. */
function asCall(row: CallRow, roster: RosterLine[]): Call {
  const bySlot = new Map<string, Shift>()
  for (const r of roster) {
    if (!bySlot.has(r.slot_id))
      bySlot.set(r.slot_id, { slot_id: r.slot_id, starts_at: r.starts_at, ends_at: r.ends_at, capacity: r.capacity, taken: 0, open: new Date(r.starts_at) > new Date() })
    if (r.booking_id && r.status !== 'cancelled') bySlot.get(r.slot_id)!.taken += 1
  }
  return { ...row, shifts: [...bySlot.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }
}

export default function VolunteerCallDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const org = useOrgBits()
  const [row, setRow] = useState<CallRow | null | undefined>(id === 'new' ? null : undefined)
  const [roster, setRoster] = useState<RosterLine[]>([])
  const [tab, setTab] = useState<Tab>('signups')
  const [editing, setEditing] = useState(id === 'new')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (id === 'new') return
    try {
      const [r, ro] = await Promise.all([loadCall(id), callRoster(id)])
      setRow(r)
      setRoster(ro)
    } catch (e) {
      setError(errMessage(e))
    }
  }, [id])
  useEffect(() => {
    void load()
  }, [load])

  if (id === 'new' || editing) {
    return (
      <div className="space-y-5">
        <div>
          <Link to="/staff/calls" className="inline-flex items-center gap-1 text-sm font-bold text-brand-blue">
            <Icon name="arrowLeft" size={15} /> All calls
          </Link>
          <h1 className="mt-1 font-display text-3xl font-black text-ink">{id === 'new' ? 'A new volunteer call' : 'Edit the call'}</h1>
          <p className="mt-1 text-sm text-slate-600">Say what you need once — the shifts, the posts, the emails and the letters all come from it.</p>
        </div>
        <VolunteerCallEditor
          orgId={orgId}
          initial={id === 'new' ? null : (row ?? null)}
          onSaved={(saved, msg) => {
            setEditing(false)
            setNote(msg ?? null)
            if (saved !== id) navigate(`/staff/calls/${saved}`, { replace: true })
            else void load()
          }}
          onCancel={() => (id === 'new' ? navigate('/staff/calls') : setEditing(false))}
          onDeleted={() => navigate('/staff/calls', { replace: true })}
        />
      </div>
    )
  }

  if (row === undefined) return error ? <FormError>{error}</FormError> : <Spinner />
  if (row === null)
    return (
      <div className="py-12 text-center">
        <p className="font-display text-lg font-extrabold text-ink">That call isn’t here</p>
        <Link to="/staff/calls" className={`${btn.blue} mt-3`}>
          All calls
        </Link>
      </div>
    )

  const call = asCall(row, roster)
  const places = (call.shifts ?? []).reduce((n, s) => n + s.capacity, 0)
  const taken = (call.shifts ?? []).reduce((n, s) => n + Math.min(s.capacity, s.taken), 0)

  return (
    <div className="space-y-5">
      <div>
        <Link to="/staff/calls" className="inline-flex items-center gap-1 text-sm font-bold text-brand-blue">
          <Icon name="arrowLeft" size={15} /> All calls
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black text-ink">{call.title}</h1>
            <p className="text-sm text-slate-600">{whenText(call, true)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={taken >= places ? 'blue' : 'orange'}>
              {taken} of {places} places filled
            </Badge>
            {!row.is_published && <Badge tone="slate">Hidden</Badge>}
            <button type="button" onClick={() => setEditing(true)} className={`${btn.outline} ${small}`}>
              Edit
            </button>
          </div>
        </div>
      </div>

      {note && <p className="rounded-xl bg-brand-blue-50 px-3 py-2 text-sm text-brand-blue">{note}</p>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(
          [
            ['signups', 'Sign-ups'],
            ['share', 'Spread the word'],
            ['day', 'On the day'],
            ['thanks', 'Thank everyone'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${tab === t ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <FormError>{error}</FormError>
      {tab === 'signups' && <SignupsTab call={call} roster={roster} />}
      {tab === 'share' && <ShareTab call={call} org={org} />}
      {tab === 'day' && <DayTab call={call} roster={roster} reload={load} />}
      {tab === 'thanks' && <ThanksTab call={call} org={org} orgId={orgId} />}
    </div>
  )
}

/* ================================================================ sign-ups */

function SignupsTab({ call, roster }: { call: Call; roster: RosterLine[] }) {
  const [sources, setSources] = useState<{ source: string; people: number }[] | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    callSources(call.id)
      .then(setSources)
      .catch(() => setSources([]))
  }, [call.id])
  const link = callLink(call.slug, 'direct')

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-3">
        {(call.shifts ?? []).map((s) => {
          const people = roster.filter((r) => r.slot_id === s.slot_id && r.booking_id)
          return (
            <Card key={s.slot_id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-lg font-extrabold text-ink">{fmtShift(s)}</p>
                <span className={`text-sm font-bold ${s.taken >= s.capacity ? 'text-green-700' : 'text-brand-orange-dark'}`}>
                  {s.taken} of {s.capacity}
                </span>
              </div>
              {people.length === 0 ? (
                <p className="text-sm text-slate-500">Nobody yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {people.map((p) => (
                      <tr key={p.booking_id}>
                        <td className="py-1.5 pr-3 font-bold text-ink">{p.name}</td>
                        <td className="py-1.5 pr-3 text-slate-600">{p.area}</td>
                        <td className="hidden py-1.5 pr-3 text-slate-500 sm:table-cell">{SOURCE_LABEL[p.source ?? 'direct'] ?? p.source}</td>
                        <td className="py-1.5 text-right">
                          {p.status === 'checked_in' && <Badge tone="blue">Came</Badge>}
                          {p.status === 'no_show' && <Badge tone="slate">Didn’t come</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )
        })}
      </div>

      <div className="space-y-3">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">The sign-up page</p>
          <p className="break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{link}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                setCopied(await copyText(link))
                setTimeout(() => setCopied(false), 1500)
              }}
              className={`${btn.outline} ${small}`}
            >
              {copied ? 'Copied' : 'Copy the link'}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className={`${btn.outline} ${small}`}>
              Open it
            </a>
          </div>
        </Card>
        <Card className="space-y-2">
          <p className="font-display text-base font-extrabold text-ink">Where sign-ups came from</p>
          {sources === null ? (
            <Spinner />
          ) : sources.length === 0 ? (
            <p className="text-sm text-slate-500">No sign-ups yet — share it from “Spread the word”.</p>
          ) : (
            <ul className="space-y-1">
              {sources.map((s) => (
                <li key={s.source} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{SOURCE_LABEL[s.source] ?? s.source}</span>
                  <strong className="text-ink">{s.people}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ================================================================ spread the word */

/** Put the group's name where the message says {{org}}. */
function fillOrg(body: string, to: string): string {
  const name = to.trim()
  if (name) return body.replaceAll('{{org}}', name)
  return body.replace('Hello {{org}},', 'Hello,').replace('Dear friends at {{org}},', 'Dear friends,').replaceAll('{{org}}', 'your organization')
}

function ShareTab({ call, org }: { call: Call; org: OrgBits }) {
  const [open, setOpen] = useState<Medium | null>('email-groups')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const say = (m: string) => {
    setNote(m)
    setTimeout(() => setNote(null), 2600)
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errMessage(e))
    }
    setBusy(null)
  }

  const picture = (format: 'square' | 'story', medium: Medium) =>
    run(`${medium}-pic`, async () => {
      const msg = outreach(call, medium, org)
      const canvas = document.createElement('canvas')
      await renderCard(
        canvas,
        {
          kind: 'volunteer',
          kicker: 'VOLUNTEERS NEEDED',
          headline: call.title,
          subline: `${fmtDayShort(call.on_date)} · ${fmtClock(call.starts_at)}–${fmtClock(call.ends_at)}`,
          footer: msg.link.replace(/^https:\/\//, '').replace(/\?.*$/, ''),
          url: msg.link,
          accent: 'orange',
        },
        format,
        { logoUrl: '/img/ohrr-mark.png' },
      )
      savePng(await canvasToBlob(canvas), `ohrr-volunteers-${call.slug}-${format}.png`)
      await copyText(msg.body)
      say('Picture downloaded — the words are copied too, ready to paste.')
    })

  const flyerCanvas = async () => {
    const canvas = document.createElement('canvas')
    await renderFlyer(canvas, {
      kicker: 'VOLUNTEERS NEEDED',
      headline: call.title,
      lines: [whenText(call), call.location, `We need ${needShort(call)}`, call.who, call.perks.length ? call.perks.join(' · ') : null]
        .filter((x): x is string => !!x)
        .slice(0, 4),
      cta: 'Scan to sign up',
      path: `/volunteer/call/${call.slug}?src=flyer`,
      campaign: `call-${call.slug}`,
      accent: 'orange',
    })
    return canvasToBlob(canvas)
  }

  const letterCanvas = async () => {
    const msg = outreach(call, 'letter', org)
    const body = fillOrg(msg.body, to).split('\n\n')
    const canvas = document.createElement('canvas')
    await paintLetter(canvas, {
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      recipient: to.trim() ? [to.trim()] : undefined,
      salutation: body[0],
      paragraphs: body.slice(1).map((p) => p.replace(/\n/g, ' ')),
      closing: 'With thanks,',
      signer: { name: org.signerName, title: org.signerTitle },
      qr: { url: msg.link, caption: msg.link.replace(/^https:\/\//, '') },
      // A call letter gets pinned up, so no street address (OHRR keeps it off public things).
      footer: [org.name, org.email].filter(Boolean).join(' · '),
      org: { ...org, address: '' },
    })
    return canvasToBlob(canvas)
  }

  return (
    <div className="space-y-3">
      <Card className="grid gap-3 sm:grid-cols-[1.4fr_1fr] sm:items-end">
        <p className="text-sm leading-relaxed text-slate-600">
          Each one has its own link, so “Sign-ups” shows which worked. Posts and texts open the app; emails, letters and flyers open the website.
        </p>
        <label className="block text-sm font-semibold text-slate-700">
          Sending an email or letter? Who to (optional)
          <input className={staffInput} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Upper Arlington Scout Troop 12" />
        </label>
      </Card>
      {note && <p className="text-sm font-bold text-green-700">{note}</p>}
      <FormError>{error}</FormError>

      {MEDIA.map((m) => {
        const msg = outreach(call, m.id, org)
        const text = fillOrg(msg.subject ? `${msg.subject}\n\n${msg.body}` : msg.body, to)
        const isOpen = open === m.id
        return (
          <div key={m.id} className={`rounded-2xl border bg-white ${isOpen ? 'border-brand-blue/40 shadow-sm' : 'border-slate-200'}`}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)} className="flex min-h-[52px] w-full items-center justify-between gap-2 px-4 text-left">
              <span className="min-w-0">
                <span className="font-display text-base font-extrabold text-ink">{m.label}</span>
                <span className="ml-2 text-xs text-slate-500">{m.audience}</span>
              </span>
              <Icon name="chevron" size={18} className={`shrink-0 text-slate-400 transition ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
              <div className="space-y-2 border-t border-slate-100 p-4">
                {m.id !== 'flyer' && <textarea readOnly className={`${staffInput} !mt-0 min-h-[200px] text-sm`} value={text} />}
                <div className="flex flex-wrap gap-2">
                  {(m.id === 'facebook' || m.id === 'instagram') && (
                    <button type="button" disabled={!!busy} onClick={() => void picture('square', m.id)} className={`${btn.orange} ${small}`}>
                      {busy === `${m.id}-pic` ? 'Making it…' : 'Download the picture'}
                    </button>
                  )}
                  {m.id === 'story' && (
                    <button type="button" disabled={!!busy} onClick={() => void picture('story', 'story')} className={`${btn.orange} ${small}`}>
                      {busy === 'story-pic' ? 'Making it…' : 'Download the story picture'}
                    </button>
                  )}
                  {(m.id === 'email-business' || m.id === 'email-groups') && (
                    <a
                      href={`mailto:?subject=${encodeURIComponent(fillOrg(msg.subject ?? '', to))}&body=${encodeURIComponent(fillOrg(msg.body, to))}`}
                      className={`${btn.orange} ${small}`}
                    >
                      Open an email
                    </a>
                  )}
                  {(m.id === 'letter' || m.id === 'flyer') && (
                    <>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void run(`${m.id}-print`, async () => printPng(await (m.id === 'letter' ? letterCanvas() : flyerCanvas())))}
                        className={`${btn.orange} ${small}`}
                      >
                        <Icon name="printer" size={15} className="mr-1.5" />
                        {busy === `${m.id}-print` ? 'Making it…' : `Print the ${m.id}`}
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() =>
                          void run(`${m.id}-save`, async () => savePng(await (m.id === 'letter' ? letterCanvas() : flyerCanvas()), `ohrr-volunteers-${call.slug}-${m.id}.png`))
                        }
                        className={`${btn.outline} ${small}`}
                      >
                        {busy === `${m.id}-save` ? 'Making it…' : 'Download it'}
                      </button>
                    </>
                  )}
                  {m.id !== 'flyer' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (await copyText(m.id === 'text' || m.id === 'story' ? msg.body : text)) say('Copied.')
                      }}
                      className={`${btn.outline} ${small}`}
                    >
                      Copy the words
                    </button>
                  )}
                </div>
                <p className="break-all text-xs text-slate-500">Link: {msg.link}</p>
              </div>
            )}
          </div>
        )
      })}
      {!org.signerName && <p className="text-xs leading-relaxed text-slate-500">The printed letter has a blank signature line until someone is set to sign — in the app, Staff → OHRR details.</p>}
    </div>
  )
}

/* ================================================================ on the day */

function DayTab({ call, roster, reload }: { call: Call; roster: RosterLine[]; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [walkIn, setWalkIn] = useState<string | null>(null)
  const [w, setW] = useState({ name: '', email: '', phone: '', area: '' })

  const mark = async (bookingId: string, status: 'checked_in' | 'no_show' | 'confirmed') => {
    setBusy(bookingId)
    setError(null)
    try {
      await setAttendance(bookingId, status)
      await reload()
    } catch (e) {
      setError(errMessage(e))
    }
    setBusy(null)
  }

  const addOne = async (slotId: string) => {
    setBusy(`walk-${slotId}`)
    setError(null)
    try {
      await addWalkIn(slotId, w.name, w.email, w.phone, w.area)
      setW({ name: '', email: '', phone: '', area: '' })
      setWalkIn(null)
      await reload()
    } catch (e) {
      setError(errMessage(e))
    }
    setBusy(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-slate-600">
        Click <strong>Here</strong> as people arrive. Being here for a shift counts the whole shift — no clocking in or out. Anyone who turns up without signing up can be added to their shift.
      </p>
      <FormError>{error}</FormError>
      <div className="grid gap-3 lg:grid-cols-2">
        {(call.shifts ?? []).map((s) => {
          const people = roster.filter((r) => r.slot_id === s.slot_id && r.booking_id)
          const here = people.filter((p) => p.status === 'checked_in').length
          return (
            <Card key={s.slot_id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-lg font-extrabold text-ink">{fmtShift(s)}</p>
                <span className="text-sm font-bold text-slate-600">
                  {here} of {people.length} here
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {people.map((p) => {
                  const isHere = p.status === 'checked_in'
                  const away = p.status === 'no_show'
                  return (
                    <li key={p.booking_id} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-base font-bold ${away ? 'text-slate-400 line-through' : 'text-ink'}`}>{p.name}</span>
                        {p.area && <span className="block truncate text-xs text-slate-500">{p.area}</span>}
                      </span>
                      <button
                        type="button"
                        disabled={busy === p.booking_id}
                        aria-pressed={isHere}
                        onClick={() => void mark(p.booking_id!, isHere ? 'confirmed' : 'checked_in')}
                        className={`inline-flex min-h-[40px] min-w-[5.5rem] items-center justify-center gap-1 rounded-full px-4 text-sm font-bold ${
                          isHere ? 'bg-green-600 text-white' : 'border-2 border-green-600 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {isHere && <Icon name="check" size={16} />} Here
                      </button>
                      {!isHere && (
                        <button
                          type="button"
                          disabled={busy === p.booking_id}
                          onClick={() => void mark(p.booking_id!, away ? 'confirmed' : 'no_show')}
                          className={`min-h-[40px] rounded-full px-3 text-xs font-bold ${away ? 'bg-slate-200 text-slate-700' : 'border border-slate-200 text-slate-500'}`}
                        >
                          {away ? 'Undo' : 'Didn’t come'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
              {walkIn === s.slot_id ? (
                <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                  <input className={`${staffInput} !mt-0`} aria-label="Their name" placeholder="Their name" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} />
                  <input className={`${staffInput} !mt-0`} aria-label="Their email" type="email" placeholder="Their email — it’s how their hours count" value={w.email} onChange={(e) => setW({ ...w, email: e.target.value })} />
                  <input className={`${staffInput} !mt-0`} aria-label="Phone" type="tel" placeholder="Phone (optional)" value={w.phone} onChange={(e) => setW({ ...w, phone: e.target.value })} />
                  {call.areas.length > 0 && (
                    <select className={`${staffInput} !mt-0`} aria-label="Area" value={w.area} onChange={(e) => setW({ ...w, area: e.target.value })}>
                      <option value="">Area (optional)</option>
                      {call.areas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="button" disabled={busy === `walk-${s.slot_id}`} onClick={() => void addOne(s.slot_id)} className={`${btn.orange} ${small}`}>
                      Add and mark here
                    </button>
                    <button type="button" onClick={() => setWalkIn(null)} className={`${btn.outline} ${small}`}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setWalkIn(s.slot_id)} className="text-sm font-bold text-brand-blue">
                  + Someone walked in to help
                </button>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ thank everyone */

const LETTER_FOR: Record<HoursFor, string> = { school: 'school', military: 'military', workplace: 'workplace', community: 'general', other: 'general' }

function ThanksTab({ call, org, orgId }: { call: Call; org: OrgBits; orgId: string }) {
  const [people, setPeople] = useState<Helper[] | null>(null)
  const [purpose, setPurpose] = useState<Record<string, HoursFor | null>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const p = await callThanks(call.id)
      setPeople(p)
      setPurpose(await hoursForByEmail(orgId, p.map((x) => x.email)))
    } catch (e) {
      setError(errMessage(e))
    }
  }, [call.id, orgId])
  useEffect(() => {
    void load()
  }, [load])

  const thanked = useMemo(() => (people ?? []).filter((p) => p.thanked_at).length, [people])

  const done = async (email: string) => {
    try {
      await markThanked(call.id, email)
      await load()
    } catch (e) {
      setError(errMessage(e))
    }
  }

  if (!people) return error ? <FormError>{error}</FormError> : <Spinner />
  if (people.length === 0)
    return (
      <Card className="text-center text-sm leading-relaxed text-slate-600">
        Nobody is marked as here yet. On the day, click <strong>Here</strong> for each person under “On the day” — then everyone who came appears here to be thanked, with their hours.
      </Card>
    )

  return (
    <div className="space-y-3">
      <div>
        <p className="font-display text-lg font-extrabold text-ink">
          {thanked} of {people.length} thanked
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          Each thank-you gives their hours here, this year and in all, and links to their own hours page. Send it by email or text, then tick it off.
        </p>
      </div>
      <FormError>{error}</FormError>
      <div className="grid gap-3 lg:grid-cols-2">
        {people.map((p) => {
          const t = thankYou(call, p, org, purpose[p.email.toLowerCase()] ?? null)
          const kind = LETTER_FOR[purpose[p.email.toLowerCase()] ?? 'other']
          return (
            <Card key={p.email} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-extrabold text-ink">{p.name}</p>
                  <p className="text-sm text-slate-600">
                    {fmtHours(p.hours_here)} h here · {fmtHours(p.hours_year)} h this year · {fmtHours(p.hours_all)} h in all
                  </p>
                </div>
                {p.thanked_at && <Badge tone="blue">Thanked</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={`mailto:${p.email}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`} className={`${btn.orange} ${small}`}>
                  <Icon name="mail" size={15} className="mr-1.5" /> Email thank-you
                </a>
                {!p.thanked_at && (
                  <button type="button" onClick={() => void done(p.email)} className={`${btn.outline} ${small}`}>
                    <Icon name="check" size={15} className="mr-1" /> Mark thanked
                  </button>
                )}
                <Link
                  to={`/staff/hours-letter?email=${encodeURIComponent(p.email)}&name=${encodeURIComponent(p.name)}&kind=${kind}`}
                  className="px-2 text-sm font-bold text-brand-blue underline underline-offset-2"
                >
                  Hours letter
                </Link>
              </div>
              {p.phone && (
                <p className="text-xs text-slate-500">
                  Or text {p.phone}:{' '}
                  <button type="button" onClick={() => void copyText(t.sms)} className="font-bold text-brand-blue">
                    copy the text
                  </button>
                </p>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
