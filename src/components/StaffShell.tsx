import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabase, errMessage } from '../lib/supabase'
import { useStaff, staffInput, Spinner } from '../lib/staff'
import { btn } from './ui'

function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'working'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const onSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setStatus('working')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) {
          setCheckEmail(true)
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      // onAuthStateChange reloads membership and re-renders the shell.
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      {checkEmail ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="font-display text-xl font-extrabold text-ink">Confirm your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            We sent a confirmation link to <strong>{email}</strong>. Open it, then come back and sign
            in.
          </p>
          <button onClick={() => { setCheckEmail(false); setMode('signin') }} className={`${btn.blue} mt-4`}>
            Back to sign in
          </button>
        </div>
      ) : (
        <>
          <h1 className="font-display text-2xl font-black text-ink">Staff &amp; owner sign‑in</h1>
          <p className="mt-1 text-sm text-slate-600">Manage OHRR's content right here on the site.</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">
              Email
              <input className={staffInput} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input className={staffInput} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            <button type="submit" disabled={status === 'working'} className={`${btn.orange} w-full disabled:opacity-60`}>
              {status === 'working' ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="mt-3 text-center text-sm text-slate-500">
            {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }} className="font-bold text-brand-blue">
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          <p className="mt-2 text-center">
            <Link to="/" className="text-xs font-semibold text-slate-400 hover:text-slate-600">← Back to the website</Link>
          </p>
        </>
      )}
    </div>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
    isActive ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

function JoinByCode({ onJoined }: { onJoined: () => Promise<void> }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const trimmed = code.trim()
    // Try a worker invite code first, then a one-time owner (master) code.
    const a = await supabase.rpc('redeem_invite_code', { p_code: trimmed })
    let ok = !a.error
    let bErr: unknown = null
    if (!ok) {
      const b = await supabase.rpc('redeem_master_code', { p_code: trimmed })
      ok = !b.error
      bErr = b.error
    }
    if (!ok) {
      const msgs = [errMessage(a.error), errMessage(bErr)]
      const informative = msgs.find((m) => /expired|used|authenticat/i.test(m))
      setError(informative ?? "That code isn't valid. Check it with your OHRR owner — it may have expired or already been used.")
      setBusy(false)
      return
    }
    await onJoined()
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
      <label className="block text-sm font-semibold text-slate-700">
        Have an invite code?
        <input className={`${staffInput} font-mono tracking-wider`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. 3F9A2C7B1D" />
      </label>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={busy || !code.trim()} className={`${btn.orange} mt-3 w-full disabled:opacity-60`}>
        {busy ? 'Joining…' : 'Join the team'}
      </button>
    </form>
  )
}

export default function StaffShell() {
  const { configured, loading, user, membership, can, signOut, refresh } = useStaff()

  if (!configured)
    return <div className="mx-auto max-w-md px-5 py-16 text-center text-slate-600">Backend not configured.</div>
  if (loading) return <Spinner />
  if (!user) return <SignIn />

  if (!membership) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="font-display text-xl font-extrabold text-ink">Join the OHRR team</h1>
        <p className="mt-2 text-sm text-slate-600">
          You're signed in as <strong>{user.email}</strong>, but this account isn't an OHRR staff member yet.
          Enter the invite code an owner gave you — or the owner's setup code.
        </p>
        <JoinByCode onJoined={refresh} />
        <button onClick={signOut} className={`${btn.outline} mt-4`}>Sign out</button>
      </div>
    )
  }

  const role = membership.role[0].toUpperCase() + membership.role.slice(1)

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link to="/staff" className="flex items-center gap-2.5">
            <img src="/img/ohrr-mark.png" alt="OHRR" className="h-9 w-9 object-contain" />
            <span className="leading-tight">
              <span className="block font-display text-sm font-extrabold text-ink">OHRR Staff</span>
              <span className="block text-[11px] font-semibold text-slate-400">{role}</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1.5">
            <NavLink to="/staff" end className={navClass}>Dashboard</NavLink>
            {can('inbox.manage') && <NavLink to="/staff/inbox" className={navClass}>Inbox</NavLink>}
            {can('bookings.manage') && <NavLink to="/staff/bookings" className={navClass}>Bookings</NavLink>}
            {(can('announcements.post') || can('social.publish')) && <NavLink to="/staff/posts" className={navClass}>Posts</NavLink>}
            {can('announcements.post') && <NavLink to="/staff/announcements" className={navClass}>Announcements</NavLink>}
            {can('announcements.post') && <NavLink to="/staff/homepage" className={navClass}>Homepage</NavLink>}
            {(can('adoptions.listings.create') || can('adoptions.listings.edit') || can('adoptions.status.change')) && (
              <NavLink to="/staff/rabbits" className={navClass}>Rabbits</NavLink>
            )}
            {can('volunteers.shifts.manage') && <NavLink to="/staff/volunteer" className={navClass}>Volunteer</NavLink>}
            {can('content.education.edit') && <NavLink to="/staff/care" className={navClass}>Care guides &amp; pages</NavLink>}
            {(can('events.bunfest.manage') || can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')) && <NavLink to="/staff/items" className={navClass}>Items</NavLink>}
            {(can('staff.invite') || can('staff.permissions.manage')) && <NavLink to="/staff/team" className={navClass}>Team</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
              View site
            </Link>
            <button onClick={signOut} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  )
}
