// /book/:slug — pick a time, leave your name, done. Same rules and data as
// the app's booking page (the database enforces capacity, lead time and the
// per-month limit). /book/cancel/:token is the private cancel link.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHero, Section, Card, btn, ext } from '../components/ui'
import { Icon } from '../components/icons'
import { Spinner } from '../lib/staff'
import { errMessage, isSupabaseConfigured } from '../lib/supabase'
import { OHRR } from '../lib/constants'
import {
  bookSlot,
  bookingByToken,
  cancelBooking,
  dayKey,
  downloadBookingIcs,
  durationLabel,
  fmtDay,
  fmtRange,
  fmtTime,
  getBookingType,
  googleCalendarUrl,
  openSlots,
  fmtWeekly,
  statusLabel,
  type BookingReceipt,
  type BookingType,
  type OpenSlot,
} from '../lib/bookings'

const input =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'

export default function Book() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const [type, setType] = useState<BookingType | null | undefined>(undefined)
  const [slots, setSlots] = useState<OpenSlot[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<OpenSlot | null>(null)
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setType(null)
      return
    }
    let alive = true
    getBookingType(slug)
      .then((t) => {
        if (!alive) return
        setType(t)
        if (t) openSlots(slug).then((s) => alive && setSlots(s)).catch((e) => alive && setError(errMessage(e)))
      })
      .catch((e) => {
        if (!alive) return
        setError(errMessage(e))
        setType(null)
      })
    return () => {
      alive = false
    }
  }, [slug])

  const byDay = useMemo(() => {
    const m = new Map<string, OpenSlot[]>()
    for (const s of slots ?? []) {
      if (s.taken >= s.capacity) continue
      m.set(dayKey(s.starts_at), [...(m.get(dayKey(s.starts_at)) ?? []), s])
    }
    return [...m.entries()]
  }, [slots])

  if (type === undefined)
    return (
      <Section>
        <Spinner />
      </Section>
    )
  if (type === null)
    return (
      <>
        <PageHero title="Booking" />
        <Section>
          <Card className="max-w-xl">
            <p className="font-bold text-ink">This isn’t open for booking right now.</p>
            <p className="mt-1 text-sm text-slate-600">
              Email{' '}
              <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
                {OHRR.email}
              </a>{' '}
              and OHRR will help.
            </p>
          </Card>
        </Section>
      </>
    )
  if (receipt) return <Confirmation receipt={receipt} type={type} />

  const reqs = (type.requirements ?? '').split('\n').map((s) => s.trim()).filter(Boolean)

  return (
    <>
      <PageHero title={type.name} subtitle={type.description ?? undefined} />
      <Section className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Card>
            <p className="text-sm text-slate-700">
              <span className="font-bold text-ink">{durationLabel(type.duration_min)}</span>
              {type.location ? ` · ${type.location}` : ''}
            </p>
            {type.weekly.length > 0 && (
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-bold text-ink">Usual times:</span> {fmtWeekly(type.weekly).join(' · ')}
              </p>
            )}
            {type.max_per_month && (
              <p className="mt-2 text-sm text-slate-700">
                Up to <strong>{type.max_per_month}</strong> per month per person.
              </p>
            )}
            {type.confirm_mode === 'staff' && <p className="mt-2 text-sm text-slate-700">You pick a time; OHRR confirms it with you by phone or email.</p>}
            {reqs.length > 0 && (
              <>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-400">Requirements</p>
                <ul className="mt-1.5 space-y-1.5">
                  {reqs.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-brand-orange">●</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <p className="mt-4 text-xs text-slate-500">
            Prefer the phone? The OHRR app books the same times and can remind you on your phone.
          </p>
        </div>

        <div>
          {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
          {!picked ? (
            <>
              <h2 className="font-display text-xl font-black text-ink">Pick a time</h2>
              {slots === null && !error && <Spinner label="Finding open times…" />}
              {slots && byDay.length === 0 && (
                <Card className="mt-3">
                  <p className="font-bold text-ink">No open times in the next two months.</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Check back soon, or email{' '}
                    <a href={`mailto:${OHRR.email}?subject=${encodeURIComponent(type.name)}`} className="font-semibold text-brand-blue">
                      {OHRR.email}
                    </a>
                    .
                  </p>
                </Card>
              )}
              <div className="mt-3 space-y-3">
                {byDay.map(([day, list]) => (
                  <Card key={day}>
                    <p className="font-display text-base font-extrabold text-ink">{fmtDay(list[0].starts_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {list.map((s) => {
                        const left = s.capacity - s.taken
                        return (
                          <button
                            key={s.slot_id}
                            type="button"
                            onClick={() => setPicked(s)}
                            className="rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-brand-blue"
                          >
                            <span className="block text-sm font-extrabold text-ink">{fmtRange(s.starts_at, s.ends_at)}</span>
                            <span className="block text-xs text-slate-500">
                              {type.kind === 'shift' ? `${left} spot${left === 1 ? '' : 's'} left` : 'Open'}
                              {s.note ? ` · ${s.note}` : ''}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <BookForm
              type={type}
              slot={picked}
              initialAnswer={params.get('rabbit') ?? ''}
              onBack={() => setPicked(null)}
              onBooked={(r) => {
                setReceipt(r)
                window.scrollTo({ top: 0 })
              }}
              onRefresh={() => openSlots(slug).then(setSlots).catch(() => undefined)}
            />
          )}
        </div>
      </Section>
    </>
  )
}

function BookForm({ type, slot, initialAnswer, onBack, onBooked, onRefresh }: { type: BookingType; slot: OpenSlot; initialAnswer: string; onBack: () => void; onBooked: (r: BookingReceipt) => void; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', answer: initialAnswer, notes: '' })
  const [party, setParty] = useState(1)
  const [attested, setAttested] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const left = slot.capacity - slot.taken
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onBooked(await bookSlot({ slotId: slot.slot_id, name: form.name, email: form.email, phone: form.phone, party, answer: form.answer, notes: form.notes, attested }))
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
      onRefresh()
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange-50 text-brand-orange">
          <Icon name="clock" size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-extrabold text-ink">{fmtDay(slot.starts_at)}</span>
          <span className="block text-sm text-slate-600">{fmtRange(slot.starts_at, slot.ends_at)}</span>
        </span>
        <button type="button" onClick={onBack} className="text-sm font-bold text-brand-blue">
          Change
        </button>
      </Card>
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Your name
            <input className={input} required value={form.name} onChange={set('name')} autoComplete="name" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input className={input} type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Phone
            <input className={input} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </label>
          {type.max_party > 1 && (
            <label className="block text-sm font-semibold text-slate-700">
              How many people are coming?
              <select className={input} value={party} onChange={(e) => setParty(Number(e.target.value))}>
                {Array.from({ length: Math.min(type.max_party, Math.max(1, left)) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {type.ask_reason && (
          <label className="block text-sm font-semibold text-slate-700">
            {type.ask_reason}
            <input className={input} value={form.answer} onChange={set('answer')} />
          </label>
        )}
        <label className="block text-sm font-semibold text-slate-700">
          Anything OHRR should know? (optional)
          <textarea className={input} rows={2} value={form.notes} onChange={set('notes')} />
        </label>
        {type.attest_text && (
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue" required />
            <span>{type.attest_text}</span>
          </label>
        )}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Booking…' : type.confirm_mode === 'staff' ? 'Request this time' : 'Book it'}
        </button>
        <p className="text-xs leading-relaxed text-slate-500">No account needed. Your details go only to OHRR, so they can reach you about this booking.</p>
      </Card>
    </form>
  )
}

function Confirmation({ receipt, type }: { receipt: BookingReceipt; type: BookingType }) {
  const confirmed = receipt.status === 'confirmed'
  return (
    <>
      <PageHero title={confirmed ? 'You’re booked!' : 'Request sent'} />
      <Section className="max-w-2xl">
        <Card className="space-y-3">
          <p className="font-display text-xl font-black text-ink">{receipt.type_name}</p>
          <p className="text-base text-slate-700">
            {fmtDay(receipt.starts_at)} · {fmtTime(receipt.starts_at)} – {fmtTime(receipt.ends_at)}
          </p>
          {receipt.location && <p className="text-sm text-slate-500">{receipt.location}</p>}
          {!confirmed && <p className="rounded-xl bg-brand-orange-50 px-3 py-2 text-sm font-semibold text-brand-orange">OHRR will confirm this with you by phone or email.</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => downloadBookingIcs(receipt)} className={btn.blue}>
              Add to calendar
            </button>
            <a href={googleCalendarUrl(receipt)} {...ext} className={btn.outline}>
              Google Calendar
            </a>
          </div>
          <p className="text-sm text-slate-600">
            Can’t make it?{' '}
            <Link to={`/book/cancel/${receipt.cancel_token}`} className="font-bold text-brand-blue">
              Cancel this booking
            </Link>{' '}
            — this link is private to you, so bookmark it.
          </p>
          {type.kind === 'shift' && <p className="text-sm text-slate-600">Please book at least {type.min_lead_hours} hours ahead so someone is there to let you in.</p>}
        </Card>
      </Section>
    </>
  )
}

/** /book/cancel/:token */
export function BookCancel() {
  const { token = '' } = useParams()
  const [b, setB] = useState<BookingReceipt | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    bookingByToken(token)
      .then(setB)
      .catch((e) => {
        setError(errMessage(e))
        setB(null)
      })
  }, [token])
  const cancel = async () => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      setB(await cancelBooking(token))
    } catch (e) {
      setError(errMessage(e))
    }
  }
  return (
    <>
      <PageHero title="Your booking" />
      <Section className="max-w-2xl">
        {b === undefined && <Spinner />}
        {b === null && (
          <Card>
            <p className="font-bold text-ink">We couldn’t find that booking.</p>
            {error && <p className="mt-1 text-sm text-slate-600">{error}</p>}
          </Card>
        )}
        {b && (
          <Card className="space-y-3">
            <p className="font-display text-xl font-black text-ink">{b.type_name}</p>
            <p className="text-base text-slate-700">
              {fmtDay(b.starts_at)} · {fmtRange(b.starts_at, b.ends_at)}
            </p>
            <p className={`text-sm font-bold ${b.status === 'cancelled' ? 'text-red-600' : 'text-brand-blue'}`}>{statusLabel(b.status)}</p>
            {(b.status === 'confirmed' || b.status === 'requested') && (
              <button type="button" onClick={() => void cancel()} className={`${btn.outline} border-red-300 text-red-700 hover:bg-red-50`}>
                Cancel this booking
              </button>
            )}
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </Card>
        )}
      </Section>
    </>
  )
}
