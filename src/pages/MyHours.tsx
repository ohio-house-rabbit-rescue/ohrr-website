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
            <p className="font-display text-lg font-extrabold text-ink">This link isn’t working.</p>
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

function Record({ rec, token, onChanged }: { rec: MyRecord; token: string; onChanged: () => Promise<void> }) {
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
      <PageHero title="My volunteer hours" subtitle={`${rec.name} · ${hoursLabel(rec.totals.all)} for the bunnies`} />
      <Section className="max-w-3xl space-y-8">
        {/* The headline numbers */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Total label="This week" value={rec.totals.this_week} />
          <Total label="This month" value={rec.totals.this_month} />
          <Total label="This year" value={rec.totals.this_year} />
          <Total label="All time" value={rec.totals.all} tone="orange" />
        </div>

        {pending > 0 && (
          <p className="rounded-2xl bg-brand-orange-50 px-4 py-3 text-base font-semibold text-brand-orange-dark">
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
              Need it on letterhead? Ask OHRR for a signed service-hours letter — they print it from the same record.
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
                        <span className="rounded-full bg-brand-orange-50 px-2.5 py-0.5 text-sm font-bold text-brand-orange-dark">Waiting</span>
                      )}
                    </span>
                    <span className="block text-sm text-slate-600">
                      {fmtDay(e.on_date)}
                      {e.note ? ` · ${e.note}` : ''}
                      {e.source === 'checkin' ? ' · from a booked shift' : e.source === 'staff' ? ' · added by OHRR' : ''}
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
      <p className={`mt-0.5 font-display text-3xl font-black ${tone === 'orange' ? 'text-brand-orange-dark' : 'text-brand-blue'}`}>
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
