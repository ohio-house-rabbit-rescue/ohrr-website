// Staff → OHRR details: the hours, holiday notice, email, address and the
// hours-letter signer shown across the app, this website and the BunFest site.
// Desktop mirror of the app's StaffOrgDetails.tsx — one `app_settings` row
// (`org_profile`), owners and admins only (`settings.manage`).
//
// The phone number is kept here because OHRR's About page shows it in small
// print; everywhere else people are pointed to email.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card } from '../../components/ui'
import type { OrgProfile } from '../../lib/orgProfile'

const BLANK: OrgProfile = {
  hours: '',
  hours_short: '',
  hopshop_hours: '',
  notice: '',
  phone: '',
  email: '',
  address: '',
  letter_signer_name: '',
  letter_signer_title: '',
  ein: '',
}

const label = 'block text-sm font-semibold text-slate-700'
const hint = 'mt-1 block text-xs font-normal text-slate-500'

export default function OrgDetails() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const allowed = can('settings.manage')
  const [d, setD] = useState<OrgProfile | null>(null)
  // Keys in the row this screen doesn't edit are written back untouched.
  const [rest, setRest] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('org_id', orgId)
      .eq('key', 'org_profile')
      .maybeSingle()
    if (error) return setError(errMessage(error))
    const v = ((data as { value?: Record<string, unknown> } | null)?.value ?? {}) as Record<string, unknown>
    const out = { ...BLANK }
    for (const k of Object.keys(BLANK) as (keyof OrgProfile)[]) out[k] = typeof v[k] === 'string' ? (v[k] as string) : ''
    setD(out)
    setRest(v)
  }, [orgId])
  useEffect(() => {
    if (orgId && allowed) void load()
  }, [orgId, allowed, load])

  if (!allowed) {
    return (
      <p className="text-slate-600">
        Only an owner or admin can change OHRR’s details. They appear on the app and every website, so they’re kept to a few
        people.
      </p>
    )
  }
  if (!d) return error ? <p className="text-sm font-semibold text-red-600">{error}</p> : <Spinner />

  const txt = (k: keyof OrgProfile) => (e: { target: { value: string } }) => {
    setSaved(false)
    setD({ ...d, [k]: e.target.value })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const value: Record<string, unknown> = { ...rest }
    for (const k of Object.keys(BLANK) as (keyof OrgProfile)[]) value[k] = d[k].trim()
    const { error } = await supabase
      .from('app_settings')
      .upsert({ org_id: orgId, key: 'org_profile', value, updated_by: user?.id ?? null }, { onConflict: 'org_id,key' })
    setBusy(false)
    if (error) setError(errMessage(error))
    else {
      setRest(value)
      setSaved(true)
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">OHRR details</h1>
        <p className="mt-1 text-sm text-slate-600">
          Shown wherever the app, this website or the BunFest site mentions the rescue. A change shows the next time a page is
          opened. Anything left blank uses the details built into the site.
        </p>
      </div>

      <Card className="space-y-3">
        <label className={label}>
          Notice <span className="font-normal text-slate-400">(leave empty for none)</span>
          <input className={staffInput} value={d.notice} onChange={txt('notice')} placeholder="Closed Sun 25 Oct — we’re all at BunFest!" />
          <span className={hint}>Shown on the app’s home screen and the website’s contact page, right where the hours are.</span>
        </label>
      </Card>

      <Card className="space-y-3">
        <label className={label}>
          Hours, in full
          <input className={staffInput} value={d.hours} onChange={txt('hours')} placeholder="Sat & Sun, 12–4 PM · adoptions by appointment" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Hours, short
            <input className={staffInput} value={d.hours_short} onChange={txt('hours_short')} placeholder="Sat & Sun, 12–4 PM" />
          </label>
          <label className={label}>
            Hop Shop hours
            <input className={staffInput} value={d.hopshop_hours} onChange={txt('hopshop_hours')} />
          </label>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Email
            <input className={staffInput} type="email" value={d.email} onChange={txt('email')} />
            <span className={hint}>How people reach OHRR — used on every contact line.</span>
          </label>
          <label className={label}>
            Phone
            <input className={staffInput} type="tel" value={d.phone} onChange={txt('phone')} />
            <span className={hint}>Only shown in small print on the About page.</span>
          </label>
        </div>
        <label className={label}>
          Address
          <input className={staffInput} value={d.address} onChange={txt('address')} />
        </label>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="font-display text-base font-extrabold text-ink">Volunteer-hours letters</h2>
          <p className="mt-1 text-sm text-slate-600">
            Who signs the letters volunteers need for school credit, a military service award or a workplace programme.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Signed by
            <input className={staffInput} value={d.letter_signer_name} onChange={txt('letter_signer_name')} placeholder="Full name" />
          </label>
          <label className={label}>
            Their title
            <input className={staffInput} value={d.letter_signer_title} onChange={txt('letter_signer_title')} />
          </label>
        </div>
        <label className={label}>
          EIN (optional)
          <input className={staffInput} value={d.ein} onChange={txt('ein')} placeholder="00-0000000" />
          <span className={hint}>Employers’ volunteer-grant programmes often ask for it. Leave blank to leave it off.</span>
        </label>
      </Card>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="text-sm font-bold text-green-700">Saved.</p>}
      <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
        {busy ? 'Saving…' : 'Save OHRR details'}
      </button>
    </form>
  )
}
