// Staff → Team: who is on OHRR's team, what each person can do, and invites.
//
// Update 28 (OHRR: "we also need a multiple levels of users and admins. so top
// admin the founders, then the board level … then a user that only can work
// the hop shop and is certified"): people are grouped by level — founders,
// board, leads, workers. You can only change people below your own level
// (founders can change founders), never yourself, and OHRR always keeps one
// founder; the database enforces this and `list_team` says whom the signed-in
// person may manage. Certifications record what someone has been trained and
// signed off for, with an optional expiry.
//
// Before update 28 has been run this is the screen it always was: owners,
// admins and staff, with permission toggles for staff.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import {
  useStaff,
  staffInput,
  Spinner,
  PERMISSION_CATALOG,
  PRESETS,
  LEVELS,
  isFullAccessLevel,
  isStaffLevel,
  levelLabel,
  levelsICanGive,
  type Cap,
  type PermissionMeta,
  type StaffLevel,
} from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'

interface Member {
  id: string
  user_id: string
  email: string | null
  role: string
  status: string
  /** Update 28 — null before it has been run. */
  level: StaffLevel | null
  display_name: string | null
  title: string | null
  /** Whether the signed-in person may change this person (update 28: from list_team). */
  can_manage: boolean
}

/** What someone has been trained and signed off for (update 28). */
interface Certification {
  id: string
  membership_id: string
  kind: string
  certified_on: string
  expires_on: string | null
  certified_by: string | null
  notes: string | null
}

// Capabilities grouped by area for the toggle UI.
const AREAS: { area: string; caps: PermissionMeta[] }[] = (() => {
  const order: string[] = []
  const byArea = new Map<string, PermissionMeta[]>()
  for (const p of PERMISSION_CATALOG) {
    if (!byArea.has(p.area)) {
      byArea.set(p.area, [])
      order.push(p.area)
    }
    byArea.get(p.area)!.push(p)
  }
  return order.map((area) => ({ area, caps: byArea.get(area)! }))
})()

/** Presets for people who do one job suggest the Worker level; the others, Lead. */
const PRESET_LEVEL: Record<string, StaffLevel> = { 'Hop Shop Worker': 'worker', 'Counter volunteer': 'worker' }

/** "a founder", "a board member" … */
const LEVEL_NOUN: Record<StaffLevel, string> = { founder: 'founder', board: 'board member', lead: 'lead', worker: 'worker' }

/** The certifications OHRR gives most, offered as chips (anything else can be typed). */
const CERT_KINDS: { value: string; label: string }[] = [
  { value: 'hop-shop', label: 'Hop Shop counter' },
  { value: 'buncare', label: 'Buncare orientation' },
  { value: 'animal-handling', label: 'Animal handling' },
  { value: 'vet-transport', label: 'Vet transport' },
]
const certLabel = (kind: string) => CERT_KINDS.find((k) => k.value === kind)?.label ?? (kind === 'counter' ? 'The Counter' : kind)
/** Typed text that names a common kind is saved as that kind, so nobody holds it twice. */
const certKindFrom = (text: string) => {
  const t = text.trim()
  return CERT_KINDS.find((k) => k.label.toLowerCase() === t.toLowerCase() || k.value === t.toLowerCase())?.value ?? t
}

/** Today in Ohio, as YYYY-MM-DD. */
const todayOhio = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const memberName = (m: Member) => m.display_name?.trim() || m.email || `Member ${m.user_id.slice(0, 8)}`

/** The quiet line on someone the signed-in person can't change. */
function managedBy(m: Member, isSelf: boolean): string {
  if (isSelf) {
    if (m.level === 'founder') return 'Your own level and access are looked after by another founder.'
    return `Your own level and access are looked after by ${m.level === 'board' ? 'a founder' : 'the board'}.`
  }
  return isFullAccessLevel(m.level) ? 'Managed by a founder.' : 'Managed by the board.'
}

/* ---------- Invite someone ---------- */
function InvitePanel({ orgId, levels, myLevel }: { orgId: string; levels: boolean; myLevel: StaffLevel | null }) {
  // Before update 28: a role. After: a level, and only ones the inviter may give.
  const canGive = useMemo(() => (levels ? levelsICanGive(myLevel) : []), [levels, myLevel])
  const fallbackLevel: StaffLevel = canGive.includes('lead') ? 'lead' : (canGive[canGive.length - 1] ?? 'worker')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [level, setLevel] = useState<StaffLevel>(fallbackLevel)
  const [preset, setPreset] = useState<string>('Adoptions Coordinator')
  const [customCaps, setCustomCaps] = useState<Set<Cap>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [codeLevel, setCodeLevel] = useState<StaffLevel | null>(null)
  const [copied, setCopied] = useState(false)
  const isCustom = preset === '__custom__'
  // Always a level the inviter may give.
  const chosen: StaffLevel = canGive.includes(level) ? level : fallbackLevel
  // Founders and board members (owners and admins) hold every permission.
  const fullAccess = levels ? isFullAccessLevel(chosen) : role === 'admin'

  const toggleCustom = (key: Cap) =>
    setCustomCaps((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  const pickPreset = (p: string) => {
    setPreset(p)
    // "Hop Shop Worker" suggests the Worker level; the coordinator presets suggest Lead.
    if (!levels || p === '__custom__') return
    const suggested = PRESET_LEVEL[p] ?? 'lead'
    if (canGive.includes(suggested) && !isFullAccessLevel(chosen)) setLevel(suggested)
  }

  const generate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setCode(null)
    setCodeLevel(null)
    setCopied(false)
    setBusy(true)
    try {
      const inviteRole = levels ? (chosen === 'founder' ? 'owner' : chosen === 'board' ? 'admin' : 'staff') : role
      // The preset's permissions go along explicitly too, so a preset the database
      // doesn't know yet (Hop Shop Worker before update 28) still grants them.
      const caps = fullAccess ? [] : isCustom ? Array.from(customCaps) : (PRESETS[preset] ?? [])
      const { data, error } = await supabase.rpc('create_invite_code', {
        p_org: orgId,
        p_role: inviteRole,
        p_capabilities: caps,
        p_preset: isCustom || fullAccess ? null : preset,
        p_max_uses: 1,
      })
      if (error) throw error
      const made = String(data)
      if (levels) {
        const lv = await supabase.rpc('set_invite_level', { p_code: made, p_level: chosen })
        if (lv.error) {
          throw new Error(`A code was made, but its level couldn’t be set (${errMessage(lv.error)}). Please don’t hand it out — make a new one.`)
        }
        setCodeLevel(chosen)
      }
      setCode(made)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked; code is shown for manual copy */
    }
  }

  if (levels && canGive.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-base font-extrabold text-ink">Invite someone</h2>
        <p className="mt-2 text-sm text-slate-600">
          New people are invited by someone above the {myLevel ? levelLabel(myLevel) : 'Worker'} level — a lead, the board or a founder.
        </p>
      </div>
    )
  }

  const blurb = LEVELS.find((l) => l.value === chosen)?.blurb

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-base font-extrabold text-ink">{levels ? 'Invite someone' : 'Invite a worker'}</h2>
      <form onSubmit={generate} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {levels ? (
            <label className="block text-sm font-semibold text-slate-700">
              Level
              <select className={staffInput} value={chosen} onChange={(e) => isStaffLevel(e.target.value) && setLevel(e.target.value)}>
                {LEVELS.filter((l) => canGive.includes(l.value)).map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              {blurb && <span className="mt-1 block text-xs font-normal text-slate-500">{blurb}.</span>}
            </label>
          ) : (
            <label className="block text-sm font-semibold text-slate-700">
              Role
              <select className={staffInput} value={role} onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}>
                <option value="staff">Staff (scoped access)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </label>
          )}
          <label className="block text-sm font-semibold text-slate-700">
            Access preset
            <select className={staffInput} value={preset} onChange={(e) => pickPreset(e.target.value)} disabled={fullAccess}>
              {Object.keys(PRESETS).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
          </label>
        </div>

        {fullAccess ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {levels
              ? `${chosen === 'founder' ? 'Founders' : 'Board members'} hold every permission — no preset needed.`
              : 'Admins implicitly hold every capability — no preset needed.'}
          </p>
        ) : isCustom ? (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Pick capabilities</p>
            <div className="space-y-2">
              {AREAS.map(({ area, caps }) => (
                <div key={area}>
                  <p className="text-xs font-bold text-slate-500">{area}</p>
                  <div className="mt-1 grid grid-cols-1 gap-1">
                    {caps.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={customCaps.has(c.key)} onChange={() => toggleCustom(c.key)} />
                        {c.description}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            Grants: {PRESETS[preset]?.map((k) => k.split('.').slice(-2).join(' ')).join(', ')}
          </p>
        )}

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={busy || (!fullAccess && isCustom && customCaps.size === 0)} className={`${btn.blue} w-full disabled:opacity-60`}>
          {busy ? 'Generating…' : 'Generate invite code'}
        </button>
      </form>

      {code && (
        <div className="mt-3 rounded-xl border border-brand-blue/30 bg-brand-blue-50/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
            Invite code — share with the {codeLevel ? `new ${LEVEL_NOUN[codeLevel]}` : 'worker'}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-black tracking-wider text-ink">{code}</code>
            <button type="button" onClick={copy} className="rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {codeLevel
              ? `Single-use, expires in 14 days. They sign in here, then enter this code on their dashboard — they’ll join as a ${LEVEL_NOUN[codeLevel]}.`
              : 'Single-use, expires in 14 days. The worker signs in here, then enters this code on their dashboard.'}
          </p>
        </div>
      )}
    </div>
  )
}

/* ---------- Certifications on one person ---------- */
function Certifications({
  member,
  certs,
  canEdit,
  orgId,
  by,
  nameOfUser,
  onChanged,
}: {
  member: Member
  certs: Certification[]
  canEdit: boolean
  orgId: string
  by: string | null
  nameOfUser: (userId: string | null) => string | null
  onChanged: () => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [chip, setChip] = useState<string | null>(null)
  const [other, setOther] = useState('')
  const [on, setOn] = useState(todayOhio)
  const [expires, setExpires] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = todayOhio()
  const kind = chip ?? certKindFrom(other)
  const held = Boolean(kind) && certs.some((c) => c.kind === kind)

  const reset = () => {
    setAdding(false)
    setChip(null)
    setOther('')
    setOn(todayOhio())
    setExpires('')
    setNotes('')
    setError(null)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!kind) return
    if (expires && on && expires < on) {
      setError('The expiry date is before the day they were certified.')
      return
    }
    setBusy(true)
    setError(null)
    // One of each kind per person: adding one they already hold renews it.
    const { error } = await supabase.from('member_certifications').upsert(
      {
        org_id: orgId,
        membership_id: member.id,
        kind,
        certified_on: on || today,
        expires_on: expires || null,
        certified_by: by,
        notes: notes.trim() || null,
      },
      { onConflict: 'membership_id,kind' },
    )
    setBusy(false)
    if (error) {
      setError(errMessage(error))
      return
    }
    reset()
    await onChanged()
  }

  const remove = async (c: Certification) => {
    if (!window.confirm(`Remove “${certLabel(c.kind)}” from ${memberName(member)}?`)) return
    setError(null)
    const { data, error } = await supabase.from('member_certifications').delete().eq('id', c.id).select('id')
    if (error || !data || data.length === 0) {
      setError(error ? errMessage(error) : 'That wasn’t removed — you may not be able to change this person.')
      return
    }
    await onChanged()
  }

  const chipClass = (active: boolean) =>
    `min-h-[40px] rounded-full px-3.5 text-sm font-bold ${active ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'}`

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Certifications</p>
      {certs.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">None recorded.</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {certs.map((c) => {
            const expired = Boolean(c.expires_on && c.expires_on < today)
            const who = nameOfUser(c.certified_by)
            return (
              <li key={c.id} className="flex flex-wrap items-start gap-2">
                <span className="min-w-0 flex-1 text-sm text-slate-700">
                  <span className="font-bold text-ink">{certLabel(c.kind)}</span>
                  {` · certified ${fmtDate(c.certified_on)}`}
                  {who ? ` by ${who}` : ''}
                  {c.expires_on && !expired ? ` · expires ${fmtDate(c.expires_on)}` : ''}
                  {c.notes ? ` · ${c.notes}` : ''}
                  {expired && c.expires_on && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange-dark">
                      Expired {fmtDate(c.expires_on)}
                    </span>
                  )}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void remove(c)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    <Icon name="trash" size={13} /> Remove
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canEdit && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
          <Icon name="plus" size={15} /> Add a certification
        </button>
      )}
      {canEdit && adding && (
        <form onSubmit={save} className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="text-sm font-semibold text-slate-700">What {memberName(member)} is certified for</p>
          <div className="flex flex-wrap gap-1.5">
            {CERT_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                aria-pressed={chip === k.value}
                onClick={() => {
                  setChip(chip === k.value ? null : k.value)
                  setOther('')
                }}
                className={chipClass(chip === k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Or type another
            <input
              className={staffInput}
              value={other}
              maxLength={80}
              onChange={(e) => {
                setOther(e.target.value)
                setChip(null)
              }}
              placeholder="e.g. Fostering, Nail trims"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Certified on
              <input type="date" className={staffInput} value={on} max={today} onChange={(e) => setOn(e.target.value)} required />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Expires <span className="font-normal text-slate-500">(optional)</span>
              <input type="date" className={staffInput} value={expires} min={on || undefined} onChange={(e) => setExpires(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Notes <span className="font-normal text-slate-500">(optional)</span>
            <input className={staffInput} value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {held && <p className="text-sm text-slate-600">They already hold this one — saving renews it with these dates.</p>}
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !kind} className={`${btn.blue} disabled:opacity-60`}>
              {busy ? 'Saving…' : held ? 'Renew' : 'Save'}
            </button>
            <button type="button" onClick={reset} className={btn.outline}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {!adding && error && <p className="mt-1 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

/* ---------- One member row ---------- */
function MemberCard({
  member,
  isSelf,
  grants,
  levels,
  canManagePerm,
  giveable,
  certs,
  orgId,
  userId,
  nameOfUser,
  onToggleCap,
  onToggleStatus,
  onSetLevel,
  onCertsChanged,
}: {
  member: Member
  isSelf: boolean
  grants: Set<string>
  /** Update 28 has been run: levels, can_manage from the database, certifications. */
  levels: boolean
  /** Before update 28: whether the signed-in person holds "manage permissions". */
  canManagePerm: boolean
  /** The levels the signed-in person may give. */
  giveable: StaffLevel[]
  /** null = certifications not available. */
  certs: Certification[] | null
  orgId: string
  userId: string | null
  nameOfUser: (userId: string | null) => string | null
  onToggleCap: (memId: string, key: Cap, grant: boolean) => Promise<void>
  onToggleStatus: (member: Member) => Promise<void>
  onSetLevel: (member: Member, level: StaffLevel) => Promise<void>
  onCertsChanged: () => Promise<void>
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [levelBusy, setLevelBusy] = useState(false)
  const isAdminish = levels ? isFullAccessLevel(member.level) : member.role === 'owner' || member.role === 'admin'
  // Update 28: the database says whom the signed-in person may change. Before it: today's rule.
  const manage = levels ? member.can_manage : canManagePerm
  const showToggles = manage && !isAdminish
  const showStatus = levels ? manage : canManagePerm && !isAdminish && !isSelf
  // Their current level always shows in the picker (can_manage means it's below yours, or you're both founders).
  const levelOptions = member.level && !giveable.includes(member.level) ? [member.level, ...giveable] : giveable

  const handleCap = async (key: Cap, grant: boolean) => {
    setBusyKey(key)
    await onToggleCap(member.id, key, grant)
    setBusyKey(null)
  }
  const handleStatus = async () => {
    setStatusBusy(true)
    await onToggleStatus(member)
    setStatusBusy(false)
  }
  const handleLevel = async (next: StaffLevel) => {
    setLevelBusy(true)
    await onSetLevel(member, next)
    setLevelBusy(false)
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="break-all font-display text-[15px] font-extrabold text-ink">{memberName(member)}</span>
          {isSelf && <span className="ml-1.5 text-xs font-bold text-slate-400">(you)</span>}
          {member.display_name && member.email && <span className="block break-all text-sm text-slate-500">{member.email}</span>}
          {member.title && <span className="block text-sm text-slate-600">{member.title}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* With levels the group heading says it; before them, the role. */}
          {!levels && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isAdminish ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-500'}`}>
              {member.role[0].toUpperCase() + member.role.slice(1)}
            </span>
          )}
          {member.status === 'disabled' && <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange">Disabled</span>}
        </div>
      </div>

      {/* Only when there's a choice to make (a lead managing a worker has none). */}
      {levels && manage && member.level && levelOptions.length > 1 && (
        <label className="mt-3 block max-w-xs text-sm font-semibold text-slate-700">
          Level
          <select
            className={`${staffInput} disabled:opacity-60`}
            value={member.level}
            disabled={levelBusy}
            onChange={(e) => {
              if (isStaffLevel(e.target.value)) void handleLevel(e.target.value)
            }}
          >
            {LEVELS.filter((l) => levelOptions.includes(l.value)).map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {isAdminish ? (
        <p className="mt-2 text-sm text-slate-500">{levels ? 'Holds every permission.' : 'Full access — holds every capability.'}</p>
      ) : showToggles ? (
        <div className="mt-2 space-y-2">
          {AREAS.map(({ area, caps }) => (
            <div key={area}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{area}</p>
              <div className="mt-1 grid grid-cols-1 gap-1">
                {caps.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue disabled:opacity-50" checked={grants.has(c.key)} disabled={busyKey === c.key} onChange={(e) => handleCap(c.key, e.target.checked)} />
                    {c.description}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{grants.size === 0 ? 'No capabilities granted.' : `${grants.size} ${grants.size === 1 ? 'capability' : 'capabilities'} granted.`}</p>
      )}

      {levels && !manage && <p className="mt-1 text-xs text-slate-500">{managedBy(member, isSelf)}</p>}

      {showStatus && (
        <button
          type="button"
          onClick={handleStatus}
          disabled={statusBusy}
          className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
            member.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {statusBusy ? '…' : member.status === 'active' ? 'Disable access' : 'Re-enable'}
        </button>
      )}

      {levels && certs && (
        <Certifications member={member} certs={certs} canEdit={manage} orgId={orgId} by={userId} nameOfUser={nameOfUser} onChanged={onCertsChanged} />
      )}
    </div>
  )
}

/** A row from list_team (update 28). */
interface TeamRow {
  membership_id: string
  user_id: string
  email: string | null
  role: string
  status: string
  level: string | null
  display_name: string | null
  title: string | null
  can_manage: boolean | null
}

export default function Team() {
  const { user, membership, can, level: contextLevel } = useStaff()
  const orgId = membership?.orgId ?? ''
  const canInvite = can('staff.invite')
  const canManage = can('staff.permissions.manage')

  const [members, setMembers] = useState<Member[]>([])
  const [grantMap, setGrantMap] = useState<Map<string, Set<string>>>(new Map())
  // Update 28 has been run (list_team answered); null = still finding out.
  const [levels, setLevels] = useState<boolean | null>(null)
  // null = certifications not available.
  const [certs, setCerts] = useState<Certification[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCerts = useCallback(async () => {
    if (!orgId) return
    const { data, error } = await supabase
      .from('member_certifications')
      .select('id, membership_id, kind, certified_on, expires_on, certified_by, notes')
      .eq('org_id', orgId)
      .order('certified_on', { ascending: false })
    setCerts(error ? null : ((data ?? []) as Certification[]))
  }, [orgId])

  const load = useCallback(async () => {
    if (!orgId) return
    setError(null)
    const [teamRes, grantRes] = await Promise.all([
      supabase.rpc('list_team', { p_org: orgId }),
      supabase.from('membership_permissions').select('membership_id, permission_key'),
    ])

    let mem: Member[]
    const withLevels = !teamRes.error && Array.isArray(teamRes.data)
    if (withLevels) {
      mem = (teamRes.data as TeamRow[]).map((r) => ({
        id: r.membership_id,
        user_id: r.user_id,
        email: r.email,
        role: r.role,
        status: r.status,
        level: isStaffLevel(r.level) ? r.level : null,
        display_name: r.display_name,
        title: r.title,
        can_manage: Boolean(r.can_manage),
      }))
    } else {
      // Before update 28: the list it has always been.
      const memRes = await supabase.rpc('list_org_members', { p_org: orgId })
      if (!memRes.error && memRes.data) {
        mem = (memRes.data as Array<{ membership_id: string; user_id: string; email: string | null; role: string; status: string }>).map((r) => ({
          id: r.membership_id,
          user_id: r.user_id,
          email: r.email,
          role: r.role,
          status: r.status,
          level: null,
          display_name: null,
          title: null,
          can_manage: canManage,
        }))
      } else {
        const fb = await supabase.from('memberships').select('id, user_id, role, status').eq('org_id', orgId).order('created_at')
        if (fb.error) {
          setError(errMessage(fb.error))
          setLevels(false)
          setLoading(false)
          return
        }
        mem = (fb.data ?? []).map((r: { id: string; user_id: string; role: string; status: string }) => ({
          id: r.id,
          user_id: r.user_id,
          email: null,
          role: r.role,
          status: r.status,
          level: null,
          display_name: null,
          title: null,
          can_manage: canManage,
        }))
      }
    }

    setLevels(withLevels)
    if (grantRes.error) {
      setError(errMessage(grantRes.error))
      setLoading(false)
      return
    }
    const map = new Map<string, Set<string>>()
    for (const g of (grantRes.data ?? []) as Array<{ membership_id: string; permission_key: string }>) {
      if (!map.has(g.membership_id)) map.set(g.membership_id, new Set())
      map.get(g.membership_id)!.add(g.permission_key)
    }
    setMembers(mem)
    setGrantMap(map)
    if (withLevels) await loadCerts()
    else setCerts(null)
    setLoading(false)
  }, [orgId, canManage, loadCerts])

  useEffect(() => {
    load()
  }, [load])

  const toggleCap = useCallback(async (memId: string, key: Cap, grant: boolean) => {
    const { error } = await supabase.rpc('set_membership_permission', { p_membership: memId, p_key: key, p_grant: grant })
    if (error) {
      setError(errMessage(error))
      return
    }
    setGrantMap((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(memId) ?? [])
      if (grant) set.add(key)
      else set.delete(key)
      next.set(memId, set)
      return next
    })
  }, [])

  const toggleStatus = useCallback(async (member: Member) => {
    const nextStatus = member.status === 'active' ? 'disabled' : 'active'
    const { error } = await supabase.rpc('set_membership_status', { p_membership: member.id, p_status: nextStatus })
    if (error) {
      setError(errMessage(error))
      return
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m)))
  }, [])

  const setLevel = useCallback(
    async (member: Member, next: StaffLevel) => {
      if (next === member.level) return
      const name = memberName(member)
      if (next === 'founder' && !window.confirm(`Make ${name} a founder? Founders can do everything, including changing other founders and the board.`)) return
      if (next === 'board' && !window.confirm(`Put ${name} on the board? Board members can do everything, and look after leads and workers.`)) return
      setError(null)
      const { error } = await supabase.rpc('set_member_level', { p_membership: member.id, p_level: next })
      if (error) {
        setError(errMessage(error))
        return
      }
      // Their role follows the level (founder = owner, board = admin) and whom you may manage can change: reload.
      await load()
    },
    [load],
  )

  // Your own level: from the staff context, or your own row if the context loaded before update 28 was run.
  const myLevel = contextLevel ?? members.find((m) => m.user_id === user?.id)?.level ?? null
  const giveable = useMemo(() => (levels ? levelsICanGive(myLevel) : []), [levels, myLevel])
  const byUser = useMemo(() => new Map(members.map((m) => [m.user_id, memberName(m)])), [members])
  const nameOfUser = useCallback((id: string | null) => (id ? (byUser.get(id) ?? null) : null), [byUser])

  const sortedMembers = useMemo(() => {
    const rank: Record<string, number> = { owner: 0, admin: 1, staff: 2 }
    return [...members].sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9))
  }, [members])

  if (!canInvite && !canManage) {
    return (
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Team</h1>
        <p className="mt-3 text-sm text-slate-600">You don't have access to manage the team. Ask an owner or admin if you need it.</p>
      </div>
    )
  }

  const card = (m: Member) => (
    <MemberCard
      key={m.id}
      member={m}
      isSelf={m.user_id === user?.id}
      grants={grantMap.get(m.id) ?? new Set()}
      levels={levels === true}
      canManagePerm={canManage}
      giveable={giveable}
      certs={certs ? certs.filter((c) => c.membership_id === m.id) : null}
      orgId={orgId}
      userId={user?.id ?? null}
      nameOfUser={nameOfUser}
      onToggleCap={toggleCap}
      onToggleStatus={toggleStatus}
      onSetLevel={setLevel}
      onCertsChanged={loadCerts}
    />
  )

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Team</h1>
      <p className="mt-1 text-sm text-slate-600">
        Invite staff and control what each person can do. Changes take effect immediately and are logged — across both the website and the app.
        {levels ? ' You can change people below your own level (founders can change founders), but not yourself.' : ''}
      </p>

      {canInvite && levels !== null && (
        <div className="mt-5">
          <InvitePanel orgId={orgId} levels={levels} myLevel={myLevel} />
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner label="Loading team…" />
      ) : levels ? (
        <div className="mt-6 space-y-6">
          {LEVELS.map((l) => {
            const people = members.filter((m) => m.level === l.value)
            return (
              <section key={l.value} aria-labelledby={`level-${l.value}`}>
                <div className="px-1">
                  <h2 id={`level-${l.value}`} className="font-display text-lg font-extrabold text-ink">
                    {l.plural} <span className="text-sm font-bold text-slate-500">({people.length})</span>
                  </h2>
                  <p className="text-sm text-slate-600">{l.blurb}.</p>
                </div>
                {people.length === 0 ? (
                  <p className="mt-2 px-1 text-sm text-slate-500">Nobody at this level yet.</p>
                ) : (
                  <div className="mt-2 grid grid-cols-1 gap-3">{people.map(card)}</div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <p className="mt-6 px-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">Members</p>
          <div className="mt-2 grid grid-cols-1 gap-3">{sortedMembers.map(card)}</div>
        </>
      )}
    </div>
  )
}
