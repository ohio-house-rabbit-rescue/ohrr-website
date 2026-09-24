// /staff/reset — setting a new password from the emailed link. Website copy
// of the app's StaffResetPassword.
//
// This page must work when nobody is signed in, so it lives OUTSIDE the
// signed-in staff shell and never calls useStaff(): it talks to Supabase auth
// directly. Supabase sends the link in one of three shapes depending on how
// the project is configured, and only one of them signs you in by itself:
//
//   …/staff/reset#access_token=…&type=recovery     the client picks this up
//   …/staff/reset?code=…                           PKCE: exchange it for a session
//   …/staff/reset?token_hash=…&type=recovery       verify it for a session
//
// All three work here; a genuinely expired link says so in plain words, and a
// new one can be requested right on this page instead of sending someone back
// to the sign-in screen to start again.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, errMessage, isConfigured } from '../../lib/supabase'
import { staffInput, Spinner, PasswordInput } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'

type LinkState = 'checking' | 'ready' | 'bad'

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-5 py-16">{children}</div>
    </div>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [linkState, setLinkState] = useState<LinkState>('checking')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Turn whatever the email link carried into a session.
  useEffect(() => {
    if (!isConfigured) {
      setLinkState('bad')
      return
    }
    let alive = true

    // The implicit-flow link (#access_token…) is picked up by the client itself
    // (detectSessionInUrl) and announced as PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setEmail(session.user.email ?? null)
        setLinkState('ready')
      }
    })

    const run = async () => {
      // Supabase reports an expired or already-used link in the query or the hash.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const errDescription = params.get('error_description') ?? hash.get('error_description')
      if (errDescription) {
        if (!alive) return
        setLinkError(errDescription.replace(/\+/g, ' '))
        setLinkState('bad')
        return
      }

      // getSession waits for the client to finish reading the address, so a
      // hash-style link is already a session by now.
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        if (alive) {
          setEmail(data.session.user.email ?? null)
          setLinkState('ready')
        }
        return
      }

      const code = params.get('code')
      const tokenHash = params.get('token_hash') ?? params.get('token')
      try {
        if (code) {
          const { data: ex, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          if (alive) setEmail(ex.session?.user.email ?? null)
        } else if (tokenHash) {
          const { data: ver, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
          if (error) throw error
          if (alive) setEmail(ver.session?.user.email ?? null)
        } else if (hash.get('access_token')) {
          // The client is still turning the hash into a session; the listener above finishes the job.
          return
        } else {
          // Nothing to work with: opened directly, or the link was truncated.
          if (alive) setLinkState('bad')
          return
        }
        if (alive) setLinkState('ready')
      } catch (e) {
        if (!alive) return
        setLinkError(errMessage(e))
        setLinkState('bad')
      }
    }

    void run()
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isConfigured) return <Frame><p className="text-center text-base text-slate-600">Backend not configured.</p></Frame>
  if (linkState === 'checking') return <Frame><Spinner label="Checking your link…" /></Frame>
  if (linkState === 'bad') return <Frame><BadLink reason={linkError} /></Frame>

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.')
      return
    }
    setStatus('submitting')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setStatus('done')
      setTimeout(() => navigate('/staff', { replace: true }), 1400)
    } catch (err) {
      setError(errMessage(err))
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <Frame>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Icon name="check" size={34} />
          </span>
          <h1 className="mt-4 font-display text-xl font-extrabold text-ink">Password updated</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">You’re signed in. Taking you to your dashboard…</p>
          <Link to="/staff" className={`${btn.blue} mt-4`}>
            Go to the dashboard
          </Link>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <h1 className="font-display text-2xl font-black text-ink">Set a new password</h1>
      <p className="mt-1 text-base leading-relaxed text-slate-600">
        {email ? (
          <>
            Choose a new password for <strong>{email}</strong>.
          </>
        ) : (
          'Choose a new password for your OHRR account.'
        )}
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          New password
          <PasswordInput autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Type it again
          <PasswordInput autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <p className="text-sm text-slate-600">At least 8 characters.</p>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button type="submit" disabled={status === 'submitting' || !password || !confirm} className={`${btn.orange} w-full disabled:opacity-60`}>
          {status === 'submitting' ? 'Saving…' : 'Save new password'}
        </button>
      </form>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">This link works once. If you don’t finish now, ask for another from the sign-in screen.</p>
      <p className="mt-4 text-center">
        <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-slate-700">
          ← Back to the website
        </Link>
      </p>
    </Frame>
  )
}

/**
 * The link didn't work — say why, and let them start again from here. A dead
 * end with a "back to sign in" button made people give up.
 */
function BadLink({ reason }: { reason: string | null }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('sending')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/staff/reset`,
      })
      if (error) throw error
      setStatus('sent')
    } catch (err) {
      setError(errMessage(err))
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue">
          <Icon name="mail" size={32} />
        </span>
        <h1 className="mt-4 font-display text-xl font-extrabold text-ink">Check your email</h1>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          A new link is on its way to <strong>{email}</strong>. It works once, and only for a short while — open it on this device if you can.
        </p>
        <Link to="/staff" className={`${btn.outline} mt-4`}>
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange-50 text-brand-orange-dark">
          <Icon name="clock" size={32} />
        </span>
        <h1 className="mt-3 font-display text-xl font-extrabold text-ink">That link didn’t work</h1>
        <p className="mt-1 text-base leading-relaxed text-slate-600">
          Password links work once and expire after an hour. If you opened it on a different device from the one that asked, it won’t carry across either.
        </p>
        {reason && <p className="mt-2 text-sm text-slate-600">({reason})</p>}
      </div>

      <form onSubmit={send} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-display text-lg font-extrabold text-ink">Send me a new one</p>
        <label className="block text-sm font-semibold text-slate-700">
          Your OHRR email
          <input className={staffInput} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={status === 'sending' || !email.trim()} className={`${btn.orange} w-full disabled:opacity-60`}>
          {status === 'sending' ? 'Sending…' : 'Email me a new link'}
        </button>
      </form>

      <Link to="/staff" className={`${btn.outline} w-full`}>
        Back to sign in
      </Link>
    </div>
  )
}
