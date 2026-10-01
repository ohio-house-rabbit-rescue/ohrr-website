import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { supabase, errMessage } from '../lib/supabase'
import { useStaff, staffInput, Spinner, PasswordInput, levelLabel, longDate } from '../lib/staff'
import { useStaffTiles, placeOf, groupLink } from '../lib/staffTiles'
import { Icon, type IconName } from './icons'
import { btn } from './ui'
import { buildLabel } from '../lib/version'
import { ForgotPasswordLink } from './ForgotPassword'

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
        // An email that already has an account comes back with no identities and no session.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode('signin')
          setError('That email already has an account. Sign in instead, or use “Forgot your password?”.')
          return
        }
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
              <PasswordInput autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {mode === 'signin' && <ForgotPasswordLink email={email} />}
            {mode === 'signup' && (
              <p className="text-sm text-slate-600">After you create your account, you’ll enter the invite code you were given.</p>
            )}
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
            <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-brand-blue">← Back to the website</Link>
          </p>
        </>
      )}
    </div>
  )
}

const navClass = (active: boolean) =>
  `flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-base font-semibold transition ${
    active ? 'bg-brand-blue text-white' : 'text-slate-700 hover:bg-slate-100'
  }`

// The way back to the public site, in the same place on every staff screen.
function BackToSite() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-blue/60 bg-white px-4 text-base font-bold text-brand-blue hover:bg-brand-blue-50"
    >
      <span aria-hidden="true">←</span> Back to the website
    </Link>
  )
}

const isDashboardPath = (pathname: string) => (pathname.replace(/\/+$/, '') || '/') === '/staff'

/** Where you are: the page's group and its own title (from the one list in lib/staffTiles.ts). */
function useHere() {
  const { pathname, search } = useLocation()
  const { tiles, today, groups } = useStaffTiles()
  const here = placeOf(pathname, search, tiles)
  return { here, atDashboard: isDashboardPath(pathname), today, groups }
}

/**
 * The laptop's sidebar, short (OHRR, 2026-10-01): Dashboard, the Today pages,
 * then one line per group — the group's page list opens from there, as on the
 * dashboard. A group with one page goes straight to it.
 */
function StaffMenu() {
  const { here, atDashboard, today, groups } = useHere()
  const line = (key: string, to: string, label: string, icon: IconName, active: boolean) => (
    <li key={key}>
      <Link to={to} aria-current={active ? 'page' : undefined} className={navClass(active)}>
        <Icon name={icon} size={20} className="shrink-0" />
        {label}
      </Link>
    </li>
  )
  return (
    <nav aria-label="Staff tools">
      <ul className="space-y-0.5">
        {line('dashboard', '/staff', 'Dashboard', 'home', atDashboard)}
        {today.map((t) => line(t.to, t.to, t.title, t.icon, here.tile?.to === t.to))}
      </ul>
      <ul className="mt-2 space-y-0.5 border-t border-slate-200 pt-2">
        {groups.map((g) => line(g.key, groupLink(g), g.title, g.icon, here.group?.key === g.key && !here.tile?.today))}
      </ul>
    </nav>
  )
}

const sep = (
  <span aria-hidden="true" className="shrink-0 px-1 text-slate-400">
    ›
  </span>
)

/**
 * The path bar: [home] Staff › Group. OHRR, 2026-10-01: the home button should
 * take you home, not open a list — the grouped dashboard is the menu. "Staff"
 * goes to the dashboard; on a page inside a group the group goes to its page
 * list, and on the group's own page it is plain text. The page's own title is
 * left out (its heading is just below), so nothing gets cut off on a phone.
 * No bar on the dashboard. Same as the app's "Where you are".
 */
function StaffPath({ className = '' }: { className?: string }) {
  const { here, atDashboard } = useHere()
  if (atDashboard) return null
  const { tile, group } = here
  const link = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-brand-blue underline-offset-2 hover:underline'
  return (
    <nav aria-label="Where you are" className={`no-print ${className}`}>
      <ol className="flex flex-nowrap items-center whitespace-nowrap font-display text-base font-extrabold">
        <li className="shrink-0">
          <Link to="/staff" className={link}>
            <Icon name="home" size={20} className="shrink-0" />
            Staff
          </Link>
        </li>
        {group && (
          <li className="flex shrink-0 items-center">
            {sep}
            {tile ? (
              <Link to={`/staff/g/${group.key}`} className={link}>
                {group.title}
              </Link>
            ) : (
              <span aria-current="page" className="inline-flex min-h-11 items-center px-1 text-ink">
                {group.title}
              </span>
            )}
          </li>
        )}
      </ol>
    </nav>
  )
}

const pill = 'inline-flex min-h-11 items-center rounded-full border-2 border-slate-300 px-4 text-base font-bold text-slate-700 hover:bg-slate-50'

/** The way back to the website, your account and signing out: in the laptop's header, and at the foot of the dashboard on a phone. */
export function AccountLinks({ account = true }: { account?: boolean }) {
  const { signOut } = useStaff()
  return (
    <>
      <BackToSite />
      {account && (
        <Link to="/staff/account" className={pill}>
          My account
        </Link>
      )}
      <button type="button" onClick={signOut} className={pill}>
        Sign out
      </button>
    </>
  )
}

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
  const { configured, loading, user, membership, accessEndedOn, onHold, signOut, refresh } = useStaff()
  // Hooks before any early return. The phone's top bar is the path, and the dashboard needs none.
  const atDashboard = isDashboardPath(useLocation().pathname)

  if (!configured)
    return <div className="mx-auto max-w-md px-5 py-16 text-center text-slate-600">Backend not configured.</div>
  if (loading) return <Spinner />
  if (!user) return <SignIn />

  if (!membership) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="font-display text-xl font-extrabold text-ink">{onHold || accessEndedOn ? 'Your access is on hold' : 'Join the OHRR team'}</h1>
        {/* Update 30: access can end on a date. An invite code can extend it. */}
        {onHold ? (
          <p className="mt-2 text-sm text-slate-600">
            You're signed in as <strong>{user.email}</strong>. Your account, level and tasks are kept. Ask whoever looks after your
            access (a lead, admin, founder or developer) to turn it back on.
          </p>
        ) : accessEndedOn ? (
          <p className="mt-2 text-sm text-slate-600">
            You're signed in as <strong>{user.email}</strong>. Your access ended on {longDate(accessEndedOn)}, so it's on hold until
            someone turns it back on. Ask a lead, admin, founder or developer.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            You're signed in as <strong>{user.email}</strong>, but this account isn't on the OHRR team yet.
            Ask whoever is bringing you on — a founder, an admin or a lead — for an invite code (they make one in Staff → Team) and enter
            it here.
          </p>
        )}
        {!onHold && <JoinByCode onJoined={refresh} />}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <BackToSite />
          <button onClick={signOut} className={btn.outline}>Sign out</button>
        </div>
      </div>
    )
  }

  // Developer / Founder / Board / Admin 1–3 / Lead / Volunteer 1–3 once the levels are in; Owner / Admin / Staff before update 28.
  const role = membership.level ? levelLabel(membership.level) : membership.role[0].toUpperCase() + membership.role.slice(1)

  return (
    <div className="min-h-screen bg-canvas">
      <header className={`border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:z-40 ${atDashboard ? 'hidden lg:block' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-5 lg:py-2.5">
          <Link to="/staff" className="hidden shrink-0 items-center gap-2.5 lg:flex">
            <img src="/img/ohrr-mark.png" alt="" className="h-10 w-10 object-contain" />
            <span className="leading-tight">
              <span className="block font-display text-lg font-extrabold text-ink">OHRR Staff</span>
              <span className="block text-sm font-semibold text-slate-600">{role}</span>
            </span>
          </Link>
          {/* Phone and tablet: the path bar is the whole top row; the dashboard is the menu */}
          <StaffPath className="flex-1 lg:hidden" />
          {/* Laptop: the way back, your account and signing out stay in view */}
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <AccountLinks />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 sm:px-5">
        {/* Laptop: the grouped menu stays in view down the left */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto py-6">
            <StaffMenu />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-8 pt-4 lg:pt-6">
          {/* Laptop: the same path above the page (the dashboard has none) */}
          <StaffPath className="mb-2 hidden lg:block" />
          <Outlet />
        </main>
      </div>
      {/* Which update this is — so a volunteer can report "rev 5" and mean it. */}
      <p className="no-print pb-6 text-center text-xs text-slate-600">OHRR staff tools · {buildLabel}</p>
    </div>
  )
}
