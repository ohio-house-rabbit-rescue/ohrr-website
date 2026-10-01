// Drop-offs (update 40): who gave what, and when — one row per drop-off, with
// whether they've been thanked. A drop-off's own page edits who and when,
// lists what they brought and where each thing is now, and writes the
// thank-you letter (print it, email it, copy it, then mark them thanked).
// Started from Add a donation on the Items page; the app's Catalog mode uses
// the same tables.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { copyText } from '../../lib/share/share'
import { NEEDS_40, dropoffDetail, isNeeds40, listDropoffs, money, setDropoffThanked, updateDropoff, usDate, type DonationLine, type Dropoff } from '../../lib/items'
import { LETTER_SUBJECT, letterMailto, letterText, lineCode, whereNow } from '../../lib/donations'

const chip = (on: boolean) =>
  `min-h-11 rounded-full px-4 text-sm font-bold transition ${on ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-blue'}`

const fieldLabel = 'block text-sm font-semibold text-slate-700'

/** "3 items · 52 pieces · $540". */
function sums(d: Pick<Dropoff, 'items' | 'pieces' | 'value_total_cents'>): string {
  const parts = [`${d.items} item${d.items === 1 ? '' : 's'}`]
  if (d.pieces !== d.items) parts.push(`${d.pieces} pieces`)
  if (d.value_total_cents != null) parts.push(money(d.value_total_cents))
  return parts.join(' · ')
}

/** The Ohio calendar day of a moment (thanked_at is a time, not a date). */
const ohioDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

function ThankedBadge({ thanked }: { thanked: boolean }) {
  return thanked ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
      <Icon name="check" size={14} /> Thanked
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900">Thank-you to send</span>
  )
}

/** Shown in place of a drop-off screen before update 40. */
function Needs40() {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base text-amber-900">
      <p className="font-bold">{NEEDS_40}</p>
      <p className="mt-1">
        Drop-offs and thank-you letters arrive with it. Donations can still be added on the{' '}
        <Link to="/staff/items?add=1" className="font-bold text-brand-blue underline">
          Items page
        </Link>
        .
      </p>
    </div>
  )
}

type Show = 'all' | 'to-thank' | 'thanked'

export default function Dropoffs() {
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<Dropoff[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [show, setShow] = useState<Show>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!orgId) return
    let alive = true
    listDropoffs(orgId, 200)
      .then((r) => alive && setRows(r))
      .catch((e) => {
        if (!alive) return
        if (isNeeds40(e)) setMissing(true)
        else setError(errMessage(e))
      })
    return () => {
      alive = false
    }
  }, [orgId])

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (rows ?? []).filter(
      (r) =>
        (show === 'all' || (show === 'thanked' ? Boolean(r.thanked_at) : !r.thanked_at)) &&
        (!n || (r.donor_name ?? '').toLowerCase().includes(n) || (r.donor_email ?? '').toLowerCase().includes(n)),
    )
  }, [rows, show, q])
  const toThank = (rows ?? []).filter((r) => !r.thanked_at).length

  return (
    <div>
      <Link to="/staff/items" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
        <Icon name="arrowLeft" size={16} /> Items
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Drop-offs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Who gave what, and when. Open one to change the details, see where each thing is now, and send the thank-you letter.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/staff/items?add=1" className={btn.orange}>
            <Icon name="plus" size={16} /> Add a donation
          </Link>
          <Link to="/staff/donations/report" className={btn.outline}>
            <Icon name="book" size={16} /> Donations report
          </Link>
        </div>
      </div>

      {missing ? (
        <Needs40 />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(
              [
                ['all', `All (${rows?.length ?? 0})`],
                ['to-thank', `Thank-you to send (${toThank})`],
                ['thanked', `Thanked (${(rows?.length ?? 0) - toThank})`],
              ] as [Show, string][]
            ).map(([s, label]) => (
              <button key={s} type="button" onClick={() => setShow(s)} aria-pressed={show === s} className={chip(show === s)}>
                {label}
              </button>
            ))}
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a donor" className={`${staffInput} !mt-0 max-w-xs`} aria-label="Search drop-offs" />
          </div>
          {error && <p className="mt-4 text-base font-semibold text-red-600">{error}</p>}
          {rows === null && !error && <Spinner />}
          {rows && shown.length === 0 && (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-500">
              {rows.length === 0 ? 'No drop-offs yet. Start one in Add a donation.' : 'Nothing matches.'}
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {shown.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/staff/dropoffs/${r.id}`}
                  className="flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-brand-blue"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-extrabold text-brand-blue">{r.donor_name || 'Not named'}</span>
                    <span className="block text-sm text-slate-600">
                      {usDate(r.received_on)} · {sums(r)}
                    </span>
                  </span>
                  <ThankedBadge thanked={Boolean(r.thanked_at)} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------- one drop-off */

type Detail = Dropoff & { lines: DonationLine[] }

export function DropoffDetail() {
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const { id = '' } = useParams()
  const [d, setD] = useState<Detail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'gone' | 'missing'>('loading')
  const [error, setError] = useState<string | null>(null)
  // The details form
  const [form, setForm] = useState({ donor: '', email: '', day: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  // The letter
  const [showValues, setShowValues] = useState(false)
  const [letter, setLetter] = useState('')
  const [edited, setEdited] = useState(false)
  const [letterNote, setLetterNote] = useState<string | null>(null)
  const [thankBusy, setThankBusy] = useState(false)

  const fill = (x: Detail) => {
    setD(x)
    setForm({ donor: x.donor_name ?? '', email: x.donor_email ?? '', day: x.received_on, note: x.note ?? '' })
  }

  useEffect(() => {
    if (!orgId || !id) return
    let alive = true
    dropoffDetail(orgId, id)
      .then((x) => {
        if (!alive) return
        if (!x) setState('gone')
        else {
          fill(x)
          setLetter(letterText(x, x.lines, false))
          setState('ready')
        }
      })
      .catch((e) => {
        if (!alive) return
        if (isNeeds40(e)) setState('missing')
        else {
          setError(errMessage(e))
          setState('ready')
        }
      })
    return () => {
      alive = false
    }
  }, [orgId, id])

  // The letter follows the details until someone types in it.
  const rebuild = (x: Detail, values: boolean) => setLetter(letterText(x, x.lines, values))

  const toggleValues = (on: boolean) => {
    if (!d) return
    if (edited && !window.confirm('Write the letter again with this change? What you typed in it will be replaced.')) return
    setShowValues(on)
    setEdited(false)
    rebuild(d, on)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!d || saving) return
    setSaving(true)
    setSaved(null)
    setFormError(null)
    try {
      const o = await updateDropoff(orgId, d.id, { donorName: form.donor, donorEmail: form.email, receivedOn: form.day || null, note: form.note })
      // Names and dates on the lines follow the drop-off: read it all again.
      const fresh = (await dropoffDetail(orgId, d.id)) ?? { ...d, ...o }
      fill(fresh)
      if (!edited) rebuild(fresh, showValues)
      setSaved(edited ? 'Saved. The letter keeps what you typed; “Write it again” puts the new details in.' : 'Saved.')
    } catch (err) {
      setFormError(errMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const thanked = async (yes: boolean) => {
    if (!d || thankBusy) return
    setThankBusy(true)
    setLetterNote(null)
    try {
      const o = await setDropoffThanked(orgId, d.id, yes)
      setD({ ...d, ...o, lines: d.lines })
    } catch (err) {
      setLetterNote(errMessage(err))
    } finally {
      setThankBusy(false)
    }
  }

  const copy = async () => {
    setLetterNote((await copyText(letter)) ? 'Copied. Paste it into an email or a card.' : 'Couldn’t copy here. Select the letter and copy it.')
  }

  if (state === 'loading') return <Spinner />

  return (
    <div>
      <div className="no-print">
        <Link to="/staff/dropoffs" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
          <Icon name="arrowLeft" size={16} /> Drop-offs
        </Link>
        {state === 'missing' ? (
          <>
            <h1 className="mt-1 font-display text-2xl font-black text-ink">Drop-off</h1>
            <Needs40 />
          </>
        ) : state === 'gone' || !d ? (
          <>
            <h1 className="mt-1 font-display text-2xl font-black text-ink">Drop-off</h1>
            {error ? (
              <p className="mt-4 text-base font-semibold text-red-600">{error}</p>
            ) : (
              <p className="mt-4 text-base text-slate-600">That drop-off isn’t here. It may have been removed.</p>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-black text-ink">{d.donor_name ? `${d.donor_name}’s drop-off` : 'A drop-off'}</h1>
              <ThankedBadge thanked={Boolean(d.thanked_at)} />
            </div>
            <p className="mt-1 text-base text-slate-600">
              {usDate(d.received_on)} · {sums(d)}
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <div className="space-y-6">
                {/* Who and when */}
                <form onSubmit={save} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" aria-label="Who and when">
                  <h2 className="font-display text-lg font-extrabold text-ink">Who and when</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabel}>
                      Donor’s name
                      <input className={staffInput} value={form.donor} onChange={(e) => setForm({ ...form, donor: e.target.value })} />
                    </label>
                    <label className={fieldLabel}>
                      Email <span className="font-normal text-slate-600">(for the thank-you letter)</span>
                      <input className={staffInput} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </label>
                    <label className={fieldLabel}>
                      Date received
                      <input className={staffInput} type="date" required value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
                    </label>
                    <label className={`${fieldLabel} sm:col-span-2`}>
                      Note <span className="font-normal text-slate-600">(only staff see it)</span>
                      <textarea className={staffInput} rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                    </label>
                  </div>
                  {formError && <p className="mt-2 text-base font-semibold text-red-600">{formError}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={saving} className={`${btn.orange} disabled:opacity-60`}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    {saved && (
                      <span className="text-sm font-semibold text-slate-700" role="status">
                        {saved}
                      </span>
                    )}
                  </div>
                </form>

                {/* What they brought */}
                <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" aria-labelledby="dropoff-lines">
                  <h2 id="dropoff-lines" className="font-display text-lg font-extrabold text-ink">
                    What they brought
                  </h2>
                  {d.lines.length === 0 ? (
                    <p className="mt-2 text-base text-slate-600">
                      Nothing on it yet.{' '}
                      <Link to="/staff/items?add=1" className="font-bold text-brand-blue underline">
                        Add a donation
                      </Link>
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-100">
                      {d.lines.map((l) => (
                        <li key={l.id} className="py-3">
                          <p className="font-bold text-ink">
                            {l.quantity} × {l.title}
                            {l.size ? ` (${l.size})` : ''}
                          </p>
                          <p className="text-sm text-slate-600">
                            {whereNow(l)}
                            {l.went_to?.title && l.went_to.title !== l.title ? ` · “${l.went_to.title}”` : ''}
                            {l.value_total_cents != null ? ` · ${l.quantity > 1 && l.value_each_cents != null ? `${money(l.value_each_cents)} each · ${money(l.value_total_cents)} in all` : money(l.value_total_cents)}` : ''}
                            {l.split_from ? ' · split from a bigger lot' : ''}
                          </p>
                          {lineCode(l) && <p className="font-mono text-xs font-bold tracking-widest text-slate-500">{lineCode(l)}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* The thank-you letter */}
              <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" aria-labelledby="dropoff-letter">
                <h2 id="dropoff-letter" className="font-display text-lg font-extrabold text-ink">
                  The thank-you letter
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">Change anything you like before you send it.</p>
                <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold text-slate-800">
                  <input type="checkbox" checked={showValues} onChange={(e) => toggleValues(e.target.checked)} className="h-6 w-6 accent-brand-blue" />
                  Show values in the letter
                </label>
                <label className="mt-2 block">
                  <span className="sr-only">The letter</span>
                  <textarea
                    // Grows with the letter where the browser can; enough rows where it can't.
                    className={`${staffInput} min-h-64 font-sans text-base leading-relaxed [field-sizing:content]`}
                    rows={Math.min(40, Math.max(12, letter.split('\n').length + 6))}
                    value={letter}
                    onChange={(e) => {
                      setLetter(e.target.value)
                      setEdited(true)
                    }}
                  />
                </label>
                {edited && (
                  <button
                    type="button"
                    onClick={() => {
                      setEdited(false)
                      rebuild(d, showValues)
                    }}
                    className="min-h-11 px-1 text-sm font-bold text-brand-blue"
                  >
                    Write it again
                  </button>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => window.print()} className={btn.orange}>
                    <Icon name="printer" size={16} /> Print
                  </button>
                  {d.donor_email && (
                    <a href={letterMailto(d.donor_email, letter)} className={btn.outline}>
                      <Icon name="mail" size={16} /> Email it
                    </a>
                  )}
                  <button type="button" onClick={() => void copy()} className={btn.outline}>
                    Copy
                  </button>
                </div>
                {d.donor_email ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Email it opens your email with the letter in it, to {d.donor_email}, subject “{LETTER_SUBJECT}”.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No email for them. Print it, or add their email above.</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  {d.thanked_at ? (
                    <>
                      <span className="text-base text-slate-800">Thanked {usDate(ohioDay(d.thanked_at))}.</span>
                      <button type="button" disabled={thankBusy} onClick={() => void thanked(false)} className={`${btn.outline} disabled:opacity-60`}>
                        Not thanked yet
                      </button>
                    </>
                  ) : (
                    <button type="button" disabled={thankBusy} onClick={() => void thanked(true)} className={`${btn.blue} disabled:opacity-60`}>
                      <Icon name="check" size={16} /> Mark as thanked
                    </button>
                  )}
                </div>
                {letterNote && (
                  <p className="mt-2 text-base text-slate-800" role="status">
                    {letterNote}
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </div>

      {/* What prints: the letter alone, on OHRR's mark */}
      {d && state === 'ready' && (
        <div className="dropoff-letter print-only">
          <img src="/img/ohrr-mark.png" alt="" className="mb-6 h-16 w-16 object-contain" />
          <div className="whitespace-pre-wrap text-base leading-relaxed">{letter}</div>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: letter; margin: 0.9in; }
          body * { visibility: hidden !important; }
          .dropoff-letter, .dropoff-letter * { visibility: visible !important; }
          .dropoff-letter { position: absolute; left: 0; top: 0; width: 100%; font-size: 12pt; }
        }
      `}</style>
    </div>
  )
}
