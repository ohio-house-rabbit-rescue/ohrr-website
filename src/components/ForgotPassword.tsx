// "Forgot your password?" — the small piece that sits inside the staff sign-in
// form (StaffShell). Website copy of the app's "Forgot password?" step: asks
// for the email, sends Supabase's reset link pointing back at /staff/reset on
// this site, and says "check your email".
//
// It is placed INSIDE the sign-in <form>, so it has no <form> of its own: the
// send button is a plain button and Enter in the email box is caught here
// rather than submitting the sign-in.
import { useState, type KeyboardEvent } from 'react'
import { supabase, errMessage } from '../lib/supabase'
import { staffInput } from '../lib/staff'
import { btn } from './ui'
import { Icon } from './icons'

export function ForgotPasswordLink({ email: initialEmail = '' }: { email?: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(initialEmail)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const addr = email.trim()
    if (!addr) {
      setError('Enter your email address first.')
      return
    }
    setError(null)
    setStatus('sending')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(addr, {
        redirectTo: `${window.location.origin}/staff/reset`,
      })
      if (error) throw error
      setStatus('sent')
    } catch (err) {
      setError(errMessage(err))
      setStatus('idle')
    }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void send()
    }
  }

  if (!open) {
    return (
      <p>
        <button
          type="button"
          onClick={() => {
            setEmail((v) => v || initialEmail)
            setOpen(true)
          }}
          className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Forgot your password?
        </button>
      </p>
    )
  }

  if (status === 'sent') {
    return (
      <div className="rounded-xl border border-brand-blue/30 bg-brand-blue-50/60 p-4">
        <p className="flex items-center gap-2 font-display text-base font-extrabold text-ink">
          <Icon name="mail" size={18} className="text-brand-blue" /> Check your email
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          If an account exists for <strong>{email.trim()}</strong>, we sent a link to reset your password.
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="text-brand-orange">•</span>
            <span>
              Open it on <strong>this device</strong> if you can — that’s where the new password gets set.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-orange">•</span>
            <span>
              It works <strong>once</strong>, and expires after about an hour.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-orange">•</span>
            <span>Nothing after a few minutes? Check spam — it comes from Supabase on OHRR’s behalf.</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => {
            setStatus('idle')
            setOpen(false)
          }}
          className="mt-3 text-sm font-bold text-brand-blue hover:text-brand-blue-dark"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-display text-base font-extrabold text-ink">Reset your password</p>
      <p className="mt-1 text-sm text-slate-600">Enter your email and we’ll send a link to set a new password.</p>
      <label className="mt-2 block text-sm font-semibold text-slate-700">
        Email
        <input
          className={staffInput}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onKey}
          placeholder="you@example.com"
        />
      </label>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void send()} disabled={status === 'sending'} className={`${btn.blue} disabled:opacity-60`}>
          {status === 'sending' ? 'Sending…' : 'Send reset link'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className={btn.outline}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ForgotPasswordLink
