// The first step of an approved-volunteers-only sign-up (2026-09-24, OHRR:
// "the volunteer can put in their email address and that is validated as
// approved which allows them to sign up for a time slot"). The email is
// checked in the database, which answers only approved / waiting / not yet —
// never anyone's details — and the database refuses the booking itself if
// the email isn't approved, whatever this page does. The email is remembered
// on this device so next time it goes straight to the times.
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { btn } from './ui'
import { inputClass } from './SchemaForm'
import { OHRR } from '../lib/constants'
import { errMessage } from '../lib/supabase'
import {
  checkMessage,
  kindLabel,
  rememberVolunteerEmail,
  savedVolunteerEmail,
  volunteerCheck,
  type CheckResult,
} from '../lib/volunteers/approval'

export default function VolunteerGate({
  where,
  role,
  onApproved,
}: {
  where: { type?: string; call?: string }
  /** The kind of volunteer this is for ('socialization', 'events' …). */
  role: string
  /** Approved (or the sign-up turned out to be open to anyone): the email to book with. */
  onApproved: (email: string, firstName?: string) => void
}) {
  const [email, setEmail] = useState(savedVolunteerEmail())
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const check = async (value: string, quiet = false) => {
    setBusy(true)
    setError(null)
    try {
      const r = await volunteerCheck(value, where)
      if (r.state === 'approved' || r.state === 'open') {
        if (r.state === 'approved') rememberVolunteerEmail(value)
        onApproved(r.state === 'approved' ? value.trim().toLowerCase() : '', r.firstName)
        return
      }
      if (!quiet) setResult(r)
    } catch (e) {
      if (!quiet) setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  // Been here before on this device: go straight to the times if still approved.
  useEffect(() => {
    const saved = savedVolunteerEmail()
    if (saved) check(saved, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    check(email)
  }

  const msg = result ? checkMessage(result) : null
  const what = kindLabel(role)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {!msg ? (
        <form onSubmit={submit}>
          <h2 className="font-display text-xl font-black text-ink">For approved volunteers</h2>
          <p className="mt-1 text-base text-slate-700">
            {what} is for volunteers OHRR has approved. Enter the email you applied with to see the times.
          </p>
          <label className="mt-3 block text-sm font-semibold text-slate-700">
            Your email
            <input
              className={inputClass}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
            <Link to={`/volunteer/apply?kind=${encodeURIComponent(role)}`} className="text-base font-semibold text-brand-blue">
              New? Apply to volunteer
            </Link>
          </div>
        </form>
      ) : (
        <div>
          <h2 className="font-display text-xl font-black text-ink">{msg.title}</h2>
          <p className="mt-1 text-base text-slate-700">{msg.body}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            {result?.state !== 'pending' && (
              <Link to={`/volunteer/apply?kind=${encodeURIComponent(role)}`} className={btn.orange}>
                Apply to volunteer
              </Link>
            )}
            <a href={`${OHRR.emailHref}?subject=${encodeURIComponent(`Volunteering: ${what}`)}`} className={btn.outline}>
              Email OHRR
            </a>
            <button
              type="button"
              onClick={() => {
                setResult(null)
                rememberVolunteerEmail('')
              }}
              className="text-base font-semibold text-brand-blue"
            >
              Try another email
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
