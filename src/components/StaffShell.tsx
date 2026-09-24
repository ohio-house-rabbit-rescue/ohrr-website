import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase, errMessage } from '../lib/supabase'
import { useStaff, staffInput, Spinner, PasswordInput } from '../lib/staff'
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

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center rounded-lg px-3 text-base font-semibold transition ${
    isActive ? 'bg-brand-blue text-white' : 'text-slate-700 hover:bg-slate-100'
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

type Can = (cap: Parameters<ReturnType<typeof useStaff>['can']>[0]) => boolean
interface NavItem {
  to: string
  label: string
  show: boolean
  end?: boolean
}

/**
 * The staff menu, in groups — thirty tools in one row of buttons was too much
 * to scan. Each group only appears when the person can use something in it.
 */
function staffGroups(can: Can): { title: string; items: NavItem[] }[] {
  const shop = can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')
  return [
    {
      title: 'Every day',
      items: [
        { to: '/staff', label: 'Dashboard', show: true, end: true },
        { to: '/staff/inbox', label: 'Inbox', show: can('inbox.manage') },
        { to: '/staff/bookings', label: 'Bookings', show: can('bookings.manage') },
      ],
    },
    {
      title: 'Rabbits & care',
      items: [
        { to: '/staff/rabbits', label: 'Adoptable rabbits', show: can('adoptions.listings.create') || can('adoptions.listings.edit') || can('adoptions.status.change') },
        { to: '/staff/tails', label: 'Happy Tails', show: can('content.education.edit') || can('inbox.manage') },
        { to: '/staff/care', label: 'Care guides & pages', show: can('content.education.edit') },
        { to: '/staff/bunny-help', label: 'Bunny Help topics', show: can('content.education.edit') },
        { to: '/staff/vets', label: 'Vets', show: can('content.education.edit') },
      ],
    },
    {
      title: 'Volunteers',
      items: [
        { to: '/staff/calls', label: 'Volunteer calls', show: can('volunteers.shifts.manage') || can('bookings.manage') },
        { to: '/staff/volunteer', label: 'Volunteer opportunities', show: can('volunteers.shifts.manage') },
        { to: '/staff/volunteers', label: 'Volunteer roster & hours', show: can('volunteers.shifts.manage') || can('bookings.manage') },
      ],
    },
    {
      title: 'Website & outreach',
      items: [
        { to: '/staff/homepage', label: 'Homepage', show: can('announcements.post') },
        { to: '/staff/announcements', label: 'Announcements', show: can('announcements.post') },
        { to: '/staff/posts', label: 'Posts & Share kit', show: can('announcements.post') || can('social.publish') || can('social.approve') },
        { to: '/staff/flyers', label: 'Flyers', show: can('announcements.post') },
        { to: '/staff/outreach', label: 'Outreach letters', show: can('announcements.post') },
        { to: '/staff/impact', label: 'Impact numbers', show: can('announcements.post') },
      ],
    },
    {
      title: 'Hop Shop & BunFest',
      items: [
        { to: '/staff/hopshop', label: 'Hop Shop', show: shop || can('hopshop.orders.view') },
        { to: '/staff/items', label: 'Scanned items & tags', show: can('events.bunfest.manage') || shop },
        { to: '/staff/bunfest', label: 'BunFest', show: can('events.bunfest.manage') },
        { to: '/staff/events', label: 'Events', show: can('events.bunfest.manage') },
        { to: '/staff/sponsors', label: 'Sponsors', show: can('events.bunfest.manage') },
        { to: '/staff/sponsors/renewals', label: 'Sponsor renewals', show: can('events.bunfest.manage') },
        { to: '/staff/raffle-tickets', label: 'Raffle tickets', show: can('events.bunfest.manage') },
        { to: '/staff/auction', label: 'Silent auction', show: can('events.bunfest.manage') },
      ],
    },
    {
      title: 'Settings',
      items: [
        { to: '/staff/team', label: 'Team', show: can('staff.invite') || can('staff.permissions.manage') },
        { to: '/staff/details', label: 'OHRR details', show: can('settings.manage') },
        { to: '/staff/features', label: 'Features', show: can('settings.manage') },
        { to: '/staff/activity', label: 'Activity', show: can('audit.view') },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
    .filter((g) => g.items.length > 0)
}

function StaffMenu({ can }: { can: Can }) {
  return (
    <nav aria-label="Staff tools" className="space-y-5">
      {staffGroups(can).map((g) => (
        <div key={g.title}>
          <p className="px-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">{g.title}</p>
          <ul className="mt-1 space-y-0.5">
            {g.items.map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.end} className={navClass}>
                  {i.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
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
  const { configured, loading, user, membership, can, signOut, refresh } = useStaff()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenuOpen(false), [pathname])

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
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <BackToSite />
          <button onClick={signOut} className={btn.outline}>Sign out</button>
        </div>
      </div>
    )
  }

  const role = membership.role[0].toUpperCase() + membership.role.slice(1)

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:z-40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
          <Link to="/staff" className="flex items-center gap-2.5">
            <img src="/img/ohrr-mark.png" alt="" className="h-10 w-10 object-contain" />
            <span className="leading-tight">
              <span className="block font-display text-lg font-extrabold text-ink">OHRR Staff</span>
              <span className="block text-sm font-semibold text-slate-600">{role}</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden lg:inline-flex">
              <BackToSite />
            </span>
            <button
              onClick={signOut}
              className="inline-flex min-h-11 items-center rounded-full border-2 border-slate-300 px-4 text-base font-bold text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
        {/* Phone and tablet: the staff menu opens from one labelled button */}
        <div className="border-t border-slate-100 px-4 py-2 lg:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <BackToSite />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="staff-menu"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-slate-300 px-3 text-base font-bold text-ink"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
            {menuOpen ? 'Close menu' : 'Staff menu'}
          </button>
          </div>
          {menuOpen && (
            <div id="staff-menu" className="max-h-[70vh] overflow-y-auto py-3">
              <StaffMenu can={can} />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 sm:px-5">
        {/* Laptop: the grouped menu stays in view down the left */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto py-6">
            <StaffMenu can={can} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 py-8">
          <Outlet />
        </main>
      </div>
      {/* Which update this is — so a volunteer can report "rev 5" and mean it. */}
      <p className="pb-6 text-center text-xs text-slate-600">OHRR staff tools · {buildLabel}</p>
    </div>
  )
}
