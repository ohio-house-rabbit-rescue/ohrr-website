// Staff → My account: everyone signed in can change how they appear (name,
// title, photo, the About page), their sign-in email and their password, and
// see their level and what they can do. OHRR (2026-09-25): "I don't have the
// ability to create an account or edit my account." Until now a person's own
// name and photo lived only in Team, which most people can't open, and nobody
// could change their email or password without signing out. Same as the app's
// screen. No database change: save_member_profile always lets you save your own.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useStaff, staffInput, Spinner, PasswordInput, LEVELS, PERMISSION_CATALOG, isFullAccessLevel, longDate } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { uploadSiteImage } from '../../lib/images'
import { btn, Card } from '../../components/ui'
import { Icon } from '../../components/icons'

interface Profile {
  display_name: string
  title: string
  photo_url: string
  show_on_about: boolean
}

export default function MyAccount() {
  const { user, membership, capabilities, refresh, signOut } = useStaff()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!membership) return
    supabase
      .from('memberships')
      .select('display_name, title, photo_url, show_on_about')
      .eq('id', membership.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setLoadError(errMessage(error))
        const r = (data ?? {}) as Partial<Record<keyof Profile, unknown>>
        setProfile({
          display_name: typeof r.display_name === 'string' ? r.display_name : '',
          title: typeof r.title === 'string' ? r.title : '',
          photo_url: typeof r.photo_url === 'string' ? r.photo_url : '',
          show_on_about: Boolean(r.show_on_about),
        })
      })
  }, [membership])

  if (!user || !membership) return null

  const level = membership.level ? LEVELS.find((l) => l.value === membership.level) : null
  const fullAccess = isFullAccessLevel(membership.level) || membership.role === 'owner' || membership.role === 'admin'
  const mine = PERMISSION_CATALOG.filter((p) => capabilities.has(p.key))

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-black text-ink">My account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Signed in as <strong>{user.email}</strong>.
      </p>

      <div className="mt-6 space-y-5">
        <Part title="How you appear" blurb="Your name and title show in Team, and on the About page if you choose. The photo is optional.">
          {loadError && <p className="text-sm font-semibold text-red-600">{loadError}</p>}
          {profile ? <ProfileForm membershipId={membership.id} userId={user.id} initial={profile} onSaved={refresh} /> : <Spinner />}
        </Part>

        <Part title="Sign-in email" blurb="The address you sign in with, and where password links go.">
          <EmailForm current={user.email ?? ''} />
        </Part>

        <Part title="Password" blurb="At least 8 characters.">
          <PasswordForm />
        </Part>

        <Part title="Your level and access">
          <p className="text-base font-bold text-ink">
            {level ? level.label : membership.role[0].toUpperCase() + membership.role.slice(1)}
            {level && <span className="ml-2 text-sm font-semibold text-slate-500">{level.blurb}</span>}
          </p>
          {/* Update 30: access for a set time, e.g. BunFest weekend. */}
          {membership.accessUntil && <p className="mt-1 text-sm font-semibold text-slate-700">Your access ends on {longDate(membership.accessUntil)}.</p>}
          {fullAccess ? (
            <p className="mt-2 text-sm text-slate-700">You can do everything in the staff area.</p>
          ) : mine.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {mine.map((p) => (
                <li key={p.key} className="flex gap-2">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-green-700" />
                  <span>
                    {p.description} <span className="text-slate-500">({p.area})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-700">Nothing has been switched on for you yet.</p>
          )}
          <p className="mt-3 text-sm text-slate-600">Only someone above your level can change your level or access (Staff → Team).</p>
        </Part>

        <button type="button" onClick={signOut} className={btn.outline}>
          Sign out
        </button>
      </div>
    </div>
  )
}

function Part({ title, blurb, children }: { title: string; blurb?: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
      {blurb && <p className="mt-0.5 text-sm text-slate-600">{blurb}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  )
}

const label = 'block text-sm font-semibold text-slate-700'
const done = 'mt-2 text-sm font-semibold text-green-700'
const bad = 'mt-2 text-sm font-semibold text-red-600'

function ProfileForm({
  membershipId,
  userId,
  initial,
  onSaved,
}: {
  membershipId: string
  userId: string
  initial: Profile
  onSaved: () => Promise<void>
}) {
  const [d, setD] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onPhoto = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setPhotoBusy(true)
    setError(null)
    try {
      const url = await uploadSiteImage(f, userId, 800)
      setD((x) => ({ ...x, photo_url: url }))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setPhotoBusy(false)
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    setError(null)
    const { error } = await supabase.rpc('save_member_profile', {
      p_membership: membershipId,
      p_display_name: d.display_name.trim() || null,
      p_title: d.title.trim(),
      p_photo_url: d.photo_url.trim(),
      p_show_on_about: d.show_on_about,
    })
    setBusy(false)
    if (error) return setError(errMessage(error))
    setMsg('Saved.')
    await onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Your name
          <input className={staffInput} value={d.display_name} onChange={(e) => setD({ ...d, display_name: e.target.value })} placeholder="e.g. Bev" autoComplete="name" />
        </label>
        <label className={label}>
          Title (optional)
          <input className={staffInput} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Adoption coordinator" />
        </label>
      </div>
      <div>
        <span className={label}>Photo (optional)</span>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200">
            {d.photo_url ? <img src={d.photo_url} alt="" className="h-full w-full object-cover" /> : <Icon name="camera" size={24} />}
          </span>
          <label
            className={`inline-block cursor-pointer rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-brand-blue hover:bg-slate-50 ${photoBusy ? 'opacity-60' : ''}`}
          >
            {photoBusy ? 'Uploading…' : d.photo_url ? 'Change photo' : 'Choose a photo'}
            <input type="file" accept="image/*" disabled={photoBusy} className="hidden" onChange={(e) => void onPhoto(e.target.files)} />
          </label>
          {d.photo_url && !photoBusy && (
            <button type="button" onClick={() => setD({ ...d, photo_url: '' })} className="text-sm font-bold text-slate-600">
              Remove
            </button>
          )}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-brand-blue"
          checked={d.show_on_about}
          onChange={(e) => setD({ ...d, show_on_about: e.target.checked })}
        />
        Show me on the About page
      </label>
      <button type="submit" disabled={busy || photoBusy} className={`${btn.orange} disabled:opacity-60`}>
        {busy ? 'Saving…' : 'Save'}
      </button>
      {msg && <p className={done}>{msg}</p>}
      {error && <p className={bad}>{error}</p>}
    </form>
  )
}

function EmailForm({ current }: { current: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const next = email.trim().toLowerCase()
    if (!next || next === current.toLowerCase()) return setError('That is already your sign-in email.')
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: `${window.location.origin}/staff/account` })
    setBusy(false)
    if (error) return setError(errMessage(error))
    setSentTo(next)
    setEmail('')
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-sm text-slate-700">
        Now: <strong>{current}</strong>
      </p>
      <label className={label}>
        New email
        <input className={staffInput} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <button type="submit" disabled={busy} className={`${btn.blue} disabled:opacity-60`}>
        {busy ? 'Sending…' : 'Change email'}
      </button>
      {sentTo && (
        <p className={done}>
          We sent a link to {sentTo}. Your sign-in email changes when you open it. Until then, keep signing in with {current}.
        </p>
      )}
      {error && <p className={bad}>{error}</p>}
    </form>
  )
}

function PasswordForm() {
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (pw.length < 8) return setError('Use at least 8 characters.')
    if (pw !== again) return setError('The two passwords don’t match.')
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setError(errMessage(error))
    setPw('')
    setAgain('')
    setMsg('Password changed. Use the new one next time you sign in.')
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          New password
          <PasswordInput autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <label className={label}>
          Type it again
          <PasswordInput autoComplete="new-password" minLength={8} required value={again} onChange={(e) => setAgain(e.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={busy} className={`${btn.blue} disabled:opacity-60`}>
        {busy ? 'Saving…' : 'Change password'}
      </button>
      {msg && <p className={done}>{msg}</p>}
      {error && <p className={bad}>{error}</p>}
    </form>
  )
}
