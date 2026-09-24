// /volunteer/hours and /volunteer/hours/:token — a volunteer's own record of
// what they've given. The website's copy of the app's MyHours page.
//
// No account: the private link (handed over by staff as a link or a QR code) is
// the key, the same way a booking's cancel link works. This browser remembers
// it under the same key the app uses, so afterwards it's just "My hours" —
// and a link opened on a laptop works exactly like one opened on a phone.
//
// Totals for this week, this month, this year and every year — and a tidy
// summary they can save or print, which is what a school, an employer or a
// scholarship actually asks for.
//
// 2026-09-24 (OHRR: "i need also the ability to see what i am scheduled for
// along with the hours and … a generated PDF with Bev's name signed on it …
// so the rescue does not have to perform this task"): what they're signed up
// for, what they're approved for, and their own hours letter as a PDF. The
// database counts the confirmed hours and records the letter under a code a
// school or employer can check at /verify. Certificates are OHRR's to give.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHero, Section, Card, btn, PrintButton } from '../components/ui'
import { Icon } from '../components/icons'
import { Spinner } from '../lib/staff'
import { errMessage, isConfigured } from '../lib/supabase'
import { useOrgProfile } from '../lib/orgProfile'
import { sharePng } from '../lib/share/share'
import { shareText } from '../lib/share/text'
import { useFeatureFlag, VOLUNTEER_HOURS_FLAG } from '../lib/settings'
import { renderHoursCard } from '../lib/volunteers/hoursCard'
import { savePng } from '../lib/share/share'
import { canvasToPdf } from '../lib/pdf'
import { paintLetter } from '../lib/volunteers/paint'
import { useOrgBits } from '../lib/volunteers/orgBits'
import { LETTER_KINDS, buildLetter, longDate, type LetterInput, type LetterKind } from '../lib/volunteers/letters'
import {
  SELF_SERVE_KINDS,
  VERIFY_BASE,
  approvedText,
  issueMyLetter,
  verifyLine,
  type UpcomingItem,
} from '../lib/volunteers/approval'
import { downloadBookingIcs, fmtDay as bookingDay, fmtRange } from '../lib/bookings'
import {
  deleteMyHours,
  forgetToken,
  hoursLabel,
  HOURS_ACTIVITIES,
  logMyHours,
  myRecord,
  rememberToken,
  savedToken,
  type MyRecord,
} from '../lib/volunteers/api'

const input =
  'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'

const todayISO = () => new Date().toISOString().slice(0, 10)

function fmtDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyHours() {
  const { token: param } = useParams()
  const navigate = useNavigate()
  // The link in the address wins; otherwise the one this browser remembered.
  const [saved, setSaved] = useState<string | null>(() => savedToken())
  const token = param || saved || ''
  const [rec, setRec] = useState<MyRecord | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const org = useOrgProfile()

  const load = useCallback(async () => {
    if (!token || !isConfigured) {
      setRec(null)
      return
    }
    try {
      const r = await myRecord(token)
      setRec(r)
      if (r && rememberToken(token)) setSaved(token)
    } catch (e) {
      setError(errMessage(e))
      setRec(null)
    }
  }, [token])
  useEffect(() => {
    void load()
  }, [load])

  // Opened from a link and remembered: keep the address clean afterwards.
  useEffect(() => {
    if (param && rec && saved === param) navigate('/volunteer/hours', { replace: true })
  }, [param, rec, saved, navigate])

  if (rec === undefined)
    return (
      <Section>
        <Spinner label="Opening your record…" />
      </Section>
    )

  if (!rec) {
    return (
      <>
        <PageHero title="My volunteer hours" subtitle="Your own record of the time you’ve given OHRR." />
        <Section>
          <Card className="max-w-xl space-y-3">
            <p className="font-display text-lg font-extrabold text-ink">You need your private link.</p>
            <p className="text-base leading-relaxed text-slate-700">
              Your hours open from a private link OHRR gives you — ask any staff member for it, or for the QR code to
              scan. It keeps your record to you.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={`mailto:${org.email}?subject=${encodeURIComponent('My volunteer hours link')}`} className={btn.orange}>
                <Icon name="mail" size={16} className="mr-1.5" /> Ask OHRR for my link
              </a>
              <Link to="/volunteer" className={btn.outline}>
                Back to Volunteer
              </Link>
            </div>
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </Card>
        </Section>
      </>
    )
  }

  return <Record rec={rec} token={token} onChanged={load} />
}

/** What update 25 adds to the record (the shared MyRecord type predates it). */
type MyRecordPlus = MyRecord & {
  approved_for?: string[]
  review_status?: 'pending' | 'approved' | 'declined' | null
  hours_for?: string | null
  letter_details?: Record<string, string>
  upcoming?: UpcomingItem[]
}

function Record({ rec: base, token, onChanged }: { rec: MyRecord; token: string; onChanged: () => Promise<void> }) {
  const rec = base as MyRecordPlus
  const org = useOrgProfile()
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selfLogging = useFeatureFlag(VOLUNTEER_HOURS_FLAG, true)
  const pending = rec.entries.filter((e) => e.status === 'logged').length
  const years = rec.by_year

  const share = async () => {
    setNote(null)
    setError(null)
    try {
      const canvas = document.createElement('canvas')
      await renderHoursCard(canvas, rec)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
      if (!blob) throw new Error('Could not make the summary.')
      const r = await sharePng(
        blob,
        `ohrr-volunteer-hours-${rec.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        `${rec.name} — ${hoursLabel(rec.totals.confirmed || rec.totals.all)} volunteering with Ohio House Rabbit Rescue`,
      )
      setNote(r === 'saved' ? 'Saved to your downloads.' : r === 'shared' ? null : 'Couldn’t share that here.')
    } catch (e) {
      setError(errMessage(e))
    }
  }

  const shareWords = async () => {
    setNote(null)
    const lines = [
      `${rec.name} — volunteer hours with Ohio House Rabbit Rescue`,
      `Total: ${hoursLabel(rec.totals.confirmed)} confirmed${rec.totals.all > rec.totals.confirmed ? ` (${hoursLabel(rec.totals.all)} logged)` : ''}`,
      ...years.map((y) => `${y.year}: ${hoursLabel(y.hours)}`),
      '',
      'ohiohouserabbitrescue.org',
    ]
    const r = await shareText(lines.join('\n'), 'My volunteer hours')
    setNote(r === 'copied' ? 'Copied — paste it into an email or a message.' : r === 'failed' ? 'Couldn’t copy that here.' : null)
  }

  return (
    <>
      <PageHero title="My volunteer page" subtitle={`${rec.name} · ${hoursLabel(rec.totals.all)} for the bunnies`} />
      <Section className="max-w-3xl space-y-8">
        <ApprovalLine rec={rec} />
        <ComingUp items={rec.upcoming ?? []} approved={(rec.approved_for ?? []).length > 0} />

        {/* The headline numbers */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Total label="This week" value={rec.totals.this_week} />
          <Total label="This month" value={rec.totals.this_month} />
          <Total label="This year" value={rec.totals.this_year} />
          <Total label="All time" value={rec.totals.all} tone="orange" />
        </div>

        {pending > 0 && (
          <p className="rounded-2xl bg-brand-orange-50 px-4 py-3 text-base font-semibold text-brand-orange-ink">
            {pending} {pending === 1 ? 'entry is' : 'entries are'} waiting for OHRR to confirm. They still count in your
            totals; a service letter uses the confirmed ones.
          </p>
        )}

        {/* Log some — unless OHRR has turned self-logging off. */}
        {!selfLogging.loading && !selfLogging.value ? (
          <Card className="text-base text-slate-700">
            OHRR records hours for volunteers at the moment — ask a staff member to add any that are missing.
          </Card>
        ) : adding ? (
          <Card>
            <LogForm
              token={token}
              busy={busy}
              setBusy={setBusy}
              onDone={async () => {
                setAdding(false)
                await onChanged()
              }}
              onCancel={() => setAdding(false)}
            />
          </Card>
        ) : (
          <div>
            <button type="button" onClick={() => setAdding(true)} className={`${btn.orange} !px-7 !py-3 !text-base`}>
              <Icon name="plus" size={18} className="mr-1.5" /> Log hours
            </button>
          </div>
        )}

        {/* Only once update 25 is in: the record then says what they are approved for. */}
        {rec.approved_for !== undefined && <LetterMaker rec={rec} token={token} />}

        {/* By year */}
        {years.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-black text-ink">Year by year</h2>
            <Card className="divide-y divide-slate-100 !py-2">
              {years.map((y) => (
                <div key={y.year} className="flex items-center justify-between py-2.5 text-base">
                  <span className="font-bold text-ink">{y.year}</span>
                  <span className="font-display text-lg font-black text-brand-blue">{hoursLabel(y.hours)}</span>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* Share / keep */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-black text-ink">Show what you’ve given</h2>
          <Card className="space-y-3">
            <p className="text-base leading-relaxed text-slate-700">
              A tidy summary with OHRR’s name on it — for a school, an employer, or your own satisfaction.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void share()} className={btn.blue}>
                <Icon name="award" size={17} className="mr-1.5" /> Save the card
              </button>
              <button type="button" onClick={() => void shareWords()} className={btn.outline}>
                <Icon name="mail" size={16} className="mr-1.5" /> Send the numbers
              </button>
              <PrintButton />
            </div>
            <p className="text-sm text-slate-600">
              Need it on letterhead? Make your signed hours letter above.
            </p>
            {note && <p className="text-base font-bold text-green-700">{note}</p>}
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </Card>
        </section>

        {/* Every entry */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-black text-ink">Every entry</h2>
          {rec.entries.length === 0 && (
            <Card className="text-base text-slate-700">Nothing yet — log your first hours above.</Card>
          )}
          {rec.entries.length > 0 && (
            <Card className="divide-y divide-slate-100 !py-2">
              {rec.entries.map((e) => (
                <div key={e.id} className="flex items-start gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-extrabold text-ink">{hoursLabel(e.hours)}</span>
                      <span className="text-base text-slate-700">{e.activity}</span>
                      {e.status === 'logged' && (
                        <span className="rounded-full bg-brand-orange-50 px-2.5 py-0.5 text-sm font-bold text-brand-orange-ink">Waiting</span>
                      )}
                    </span>
                    <span className="block text-sm text-slate-600">
                      {fmtDay(e.on_date)}
                      {e.note ? ` · ${e.note}` : ''}
                      {e.source === 'checkin' || (e.source as string) === 'shift'
                        ? ' · from a booked shift'
                        : e.source === 'staff'
                          ? ' · added by OHRR'
                          : ''}
                    </span>
                  </span>
                  {e.source === 'self' && e.status === 'logged' && (
                    <button
                      type="button"
                      onClick={() =>
                        deleteMyHours(token, e.id)
                          .then(onChanged)
                          .catch((err) => setError(errMessage(err)))
                      }
                      className="inline-flex shrink-0 items-center gap-1 self-center rounded-full border border-red-200 px-3 py-1.5 text-sm font-bold text-red-600"
                    >
                      <Icon name="trash" size={15} /> Remove
                    </button>
                  )}
                </div>
              ))}
            </Card>
          )}
        </section>

        <Card className="space-y-2 text-sm text-slate-600">
          <p>
            This record lives with OHRR and opens from a private link on this device. Not you?{' '}
            <button
              type="button"
              onClick={() => {
                forgetToken()
                window.location.assign('/volunteer/hours')
              }}
              className="font-bold text-brand-blue underline decoration-brand-blue/30 underline-offset-2"
            >
              Forget it on this device
            </button>
            .
          </p>
          <p>
            Questions about your hours:{' '}
            <a href={`mailto:${org.email}`} className="font-semibold text-brand-blue">
              {org.email}
            </a>
          </p>
        </Card>
      </Section>
    </>
  )
}

function Total({ label, value, tone = 'blue' }: { label: string; value: number; tone?: 'blue' | 'orange' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'orange' ? 'border-brand-orange/30 bg-brand-orange-50/60' : 'border-slate-200 bg-white'}`}>
      <p className="text-sm font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className={`mt-0.5 font-display text-3xl font-black ${tone === 'orange' ? 'text-brand-orange-ink' : 'text-brand-blue'}`}>
        {value % 1 === 0 ? value : value.toFixed(1)}
        <span className="ml-1.5 text-sm font-bold text-slate-600">{value === 1 ? 'hour' : 'hours'}</span>
      </p>
    </div>
  )
}

function LogForm({
  token,
  busy,
  setBusy,
  onDone,
  onCancel,
}: {
  token: string
  busy: boolean
  setBusy: (b: boolean) => void
  onDone: () => Promise<void>
  onCancel: () => void
}) {
  const [d, setD] = useState({ onDate: todayISO(), hours: '', activity: HOURS_ACTIVITIES[0], note: '' })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })
  const quick = ['1', '1.5', '2', '3', '4']

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await logMyHours(token, {
        onDate: d.onDate,
        hours: Number(d.hours),
        activity: d.activity,
        note: d.note.trim() || undefined,
      })
      await onDone()
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="font-display text-lg font-extrabold text-ink">Log hours</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-base font-semibold text-slate-700">
          Which day
          <input type="date" className={input} required max={todayISO()} value={d.onDate} onChange={set('onDate')} />
        </label>
        <label className="block text-base font-semibold text-slate-700">
          How many hours
          <input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            inputMode="decimal"
            className={input}
            required
            value={d.hours}
            onChange={set('hours')}
            placeholder="2"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {quick.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={d.hours === h}
            onClick={() => setD({ ...d, hours: h })}
            className={`min-h-[44px] rounded-full px-4 text-base font-bold ${
              d.hours === h ? 'bg-brand-blue text-white' : 'border-2 border-slate-200 bg-white text-slate-700'
            }`}
          >
            {h} h
          </button>
        ))}
      </div>
      <label className="block text-base font-semibold text-slate-700">
        What did you do?
        <input className={input} required list="ohrr-activities" value={d.activity} onChange={set('activity')} />
        <datalist id="ohrr-activities">
          {HOURS_ACTIVITIES.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </label>
      <label className="block text-base font-semibold text-slate-700">
        Anything to remember? <span className="font-normal text-slate-500">(optional)</span>
        <input className={input} value={d.note} onChange={set('note')} placeholder="Covered for Bev" />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !d.hours} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : 'Log it'}
        </button>
        <button type="button" onClick={onCancel} className={btn.outline}>
          Cancel
        </button>
      </div>
      <p className="text-sm text-slate-600">OHRR sees what you log and confirms it — they can fix anything that’s off.</p>
    </form>
  )
}

/* ---- approved for, and what they're signed up for ---- */

function ApprovalLine({ rec }: { rec: MyRecordPlus }) {
  const approved = rec.approved_for ?? []
  if (rec.review_status === 'pending') {
    return (
      <p className="rounded-2xl bg-brand-orange-50 px-4 py-3 text-base text-slate-700">
        <strong className="text-ink">Your application is with OHRR.</strong>{' '}
        {approved.length > 0
          ? `You can keep signing up for ${approvedText(approved).toLowerCase() === 'everything' ? 'everything' : approvedText(approved)} meanwhile.`
          : 'You’ll get an email once someone has looked it over.'}
      </p>
    )
  }
  if (approved.length === 0) return null
  return (
    <p className="rounded-2xl bg-brand-blue-50 px-4 py-3 text-base text-slate-700">
      <strong className="text-ink">Approved for:</strong> {approvedText(approved)}.{' '}
      <Link to="/volunteer#shifts" className="font-semibold text-brand-blue">
        Pick a shift
      </Link>
    </p>
  )
}

function ComingUp({ items, approved }: { items: UpcomingItem[]; approved: boolean }) {
  if (items.length === 0) {
    if (!approved) return null
    return (
      <section className="space-y-3">
        <h2 className="font-display text-xl font-black text-ink">Coming up</h2>
        <Card className="text-base text-slate-700">
          Nothing booked right now.{' '}
          <Link to="/volunteer#shifts" className="font-semibold text-brand-blue">
            Pick a shift
          </Link>
        </Card>
      </section>
    )
  }
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-black text-ink">Coming up</h2>
      <Card className="divide-y divide-slate-100 !py-2">
        {items.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base font-extrabold text-ink">{bookingDay(b.starts_at)}</span>
              <span className="block text-base text-slate-700">
                {fmtRange(b.starts_at, b.ends_at)} · {b.what}
                {b.area ? ` · ${b.area}` : ''}
              </span>
              {b.status === 'requested' && <span className="block text-sm text-brand-orange-ink">Waiting for OHRR to confirm</span>}
            </span>
            <button
              type="button"
              onClick={() =>
                downloadBookingIcs({
                  booking_id: b.id,
                  status: b.status,
                  cancel_token: b.cancel_token,
                  type_name: b.what,
                  kind: b.kind,
                  location: b.location,
                  starts_at: b.starts_at,
                  ends_at: b.ends_at,
                  party_size: 1,
                })
              }
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-brand-blue"
            >
              <Icon name="calendar" size={16} /> Add to calendar
            </button>
            <Link to={`/book/cancel/${b.cancel_token}`} className="inline-flex min-h-11 items-center text-sm font-bold text-slate-600">
              Can’t make it?
            </Link>
          </div>
        ))}
      </Card>
    </section>
  )
}

/* ---- their own hours letter, as a PDF signed with the director's name ---- */

const PERIODS = [
  { value: 'year', label: 'This year' },
  { value: '12', label: 'The last 12 months' },
  { value: 'last-year', label: 'Last year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Pick the dates' },
]
const isoDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
function periodFor(p: string): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  if (p === 'last-year') return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }
  if (p === '12') {
    const a = new Date(now)
    a.setFullYear(y - 1)
    a.setDate(a.getDate() + 1)
    return { from: isoDay(a), to: isoDay(now) }
  }
  if (p === 'all') return { from: '2009-01-01', to: isoDay(now) }
  return { from: `${y}-01-01`, to: isoDay(now) }
}
const FROM_SIGNUP: Record<string, LetterKind> = { school: 'school', military: 'military', workplace: 'workplace', community: 'general', other: 'general' }

function LetterMaker({ rec, token }: { rec: MyRecordPlus; token: string }) {
  const org = useOrgBits()
  const kinds = LETTER_KINDS.filter((k) => (SELF_SERVE_KINDS as readonly string[]).includes(k.value))
  const [kind, setKind] = useState<LetterKind>(FROM_SIGNUP[rec.hours_for ?? ''] ?? 'general')
  const [period, setPeriod] = useState('year')
  const [range, setRange] = useState(periodFor('year'))
  const [details, setDetails] = useState<Record<string, string>>(() => ({ ...(rec.letter_details ?? {}) }))
  const [busy, setBusy] = useState(false)
  const [made, setMade] = useState<{ code: string; pending: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const meta = kinds.find((k) => k.value === kind) ?? kinds[0]

  const make = async () => {
    setBusy(true)
    setError(null)
    setMade(null)
    try {
      const { from, to } = period === 'custom' ? range : periodFor(period)
      const asked: Record<string, string> = {}
      for (const a of meta.ask) if ((details[a.key] ?? '').trim()) asked[a.key] = details[a.key].trim()
      // The database counts the confirmed hours and records the letter; the page only draws it.
      const issued = await issueMyLetter(token, kind, from, to, asked)
      const today = longDate(issued.issuedOn)
      const input: LetterInput = { kind, name: issued.name, details: asked, from: issued.from, to: issued.to, lines: issued.lines, org, today }
      const letter = buildLetter(input)
      const canvas = document.createElement('canvas')
      await paintLetter(canvas, {
        date: today,
        recipient: letter.recipient,
        title: letter.title,
        salutation: letter.salutation,
        paragraphs: letter.paragraphs,
        table: letter.table ? { lines: issued.lines, total: issued.total } : undefined,
        closing: letter.closing,
        signer: letter.signer,
        signed: true,
        verify: verifyLine(issued.code),
        footer: letter.footer,
        org,
      })
      const pdf = await canvasToPdf(canvas, `${letter.title} - ${issued.name}`)
      savePng(pdf, `ohrr-hours-letter-${issued.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${issued.code}.pdf`)
      setMade({ code: issued.code, pending: issued.pending, total: issued.total })
    } catch (e) {
      setError(errMessage(e))
    }
    setBusy(false)
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-black text-ink">Your hours letter</h2>
      <Card className="space-y-4">
        <p className="text-base leading-relaxed text-slate-700">
          A letter on OHRR’s letterhead, signed by {org.signerName || 'OHRR'}, with your confirmed hours — for a school,
          your unit or your employer. Make one whenever you need it.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Who it’s for
            <select className={input} value={kind} onChange={(e) => setKind(e.target.value as LetterKind)}>
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            The hours from
            <select
              className={input}
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value)
                if (e.target.value !== 'custom') setRange(periodFor(e.target.value))
              }}
            >
              {PERIODS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          {period === 'custom' && (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                From
                <input className={input} type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                To
                <input className={input} type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
              </label>
            </>
          )}
          {meta.ask.map((a) => (
            <label key={a.key} className="block text-sm font-semibold text-slate-700">
              {a.label}
              <input
                className={input}
                value={details[a.key] ?? ''}
                placeholder={a.placeholder}
                onChange={(e) => setDetails((d) => ({ ...d, [a.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <p className="text-sm text-slate-600">{meta.hint}</p>
        <button type="button" onClick={() => void make()} disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
          <Icon name="printer" size={18} /> {busy ? 'Making your letter…' : 'Make my letter (PDF)'}
        </button>
        {error && <p className="text-base font-semibold text-red-600">{error}</p>}
        {made && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-base text-slate-700">
            <p className="font-bold text-ink">Your letter is ready — it’s in your downloads.</p>
            <p className="mt-1">
              It shows {hoursLabel(made.total)} of confirmed hours. A school or employer can check it at{' '}
              <a href={`${VERIFY_BASE}/${made.code}`} className="font-semibold text-brand-blue">
                {VERIFY_BASE.replace(/^https:\/\//, '')}
              </a>{' '}
              with the code <strong className="font-mono">{made.code}</strong>.
            </p>
            {made.pending > 0 && (
              <p className="mt-1 text-sm">
                {hoursLabel(made.pending)} you logged in those dates are waiting for OHRR to confirm; they’ll be on your
                letter once confirmed.
              </p>
            )}
          </div>
        )}
      </Card>
    </section>
  )
}
