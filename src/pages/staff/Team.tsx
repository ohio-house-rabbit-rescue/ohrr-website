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
// Update 30 (OHRR: "beyond founder there should be admin and a few levels …
// how we can share some but not all tasks with different trusted staff and
// volunteers"): ten levels — Volunteer 1–3, Lead, Admin 1–3, Board, Founder,
// Developer. Only founders and developers hold every task. Everyone else can
// only give a level below their own and only share tasks they have
// themselves, and access can end on a date. One call makes an invite with
// everything on it (create_staff_invite). Until update 30 has been run the
// invite panel says so, and only the four levels of update 28 are offered
// (its 'worker' shows as Volunteer 1).
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
  accessHasEnded,
  dbLevel,
  isFullAccessLevel,
  isStaffLevel,
  levelLabel,
  parseLevel,
  levelsICanGive,
  longDate,
  shortDate,
  todayOhio,
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
  /** Update 30 — the last day of their access, or null for no end. */
  access_until: string | null
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

/**
 * The level each preset suggests; picking a preset moves the level there if the
 * inviter may give it. Admin 1–3 have no preset: their tasks are chosen one by one.
 */
const PRESET_LEVEL: Record<string, StaffLevel> = {
  Board: 'board',
  'Adoptions Coordinator': 'lead',
  'Volunteer Lead': 'lead',
  'Hop Shop Manager': 'lead',
  'Content Editor': 'lead',
  'BunFest & Events': 'lead',
  'Inbox helper': 'volunteer3',
  'Content Approver': 'volunteer3',
  'Rabbit listings helper': 'volunteer2',
  'Care pages helper': 'volunteer2',
  'Hop Shop Worker': 'volunteer1',
  'Counter volunteer': 'volunteer1',
}
const ADMIN_LEVELS: StaffLevel[] = ['admin1', 'admin2', 'admin3']

/** "Can bring on helpers": inviting people below them and sharing their own tasks. */
const HELPER_CAPS: Cap[] = ['staff.invite', 'staff.permissions.manage']
/** The levels offered it: Lead, Admin 1–3 and Board. */
const HELPER_LEVELS: StaffLevel[] = ['lead', ...ADMIN_LEVELS, 'board']

/** A switch the signed-in person can't share (update 30). */
const SHARE_HINT = 'Only someone who has this task can share it.'

/** Shown wherever update 30 is needed and hasn't been run. */
const NEEDS_UPDATE_30 = 'Invites switch on with update 30 (RUN-THIS-IN-SUPABASE.sql in the Drive).'

const taskCount = (n: number) => `${n} ${n === 1 ? 'task' : 'tasks'}`

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

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const memberName = (m: Member) => m.display_name?.trim() || m.email || `Member ${m.user_id.slice(0, 8)}`

/** The quiet line on someone the signed-in person can't change. */
function managedBy(m: Member, isSelf: boolean): string {
  if (isSelf) {
    if (isFullAccessLevel(m.level)) return 'Your own level and access are looked after by another founder or developer.'
    return 'Your own level and access are looked after by someone above you.'
  }
  if (isFullAccessLevel(m.level)) return 'Only a founder or developer can change them.'
  return 'Only someone above their level can change them.'
}

/** The ten levels in the explainer, in groups, lowest first. */
const LEVEL_GROUPS: { title: string; levels: StaffLevel[] }[] = [
  { title: 'Volunteers 1–3', levels: ['volunteer1', 'volunteer2', 'volunteer3'] },
  { title: 'Lead', levels: ['lead'] },
  { title: 'Admins 1–3', levels: ADMIN_LEVELS },
  { title: 'Board', levels: ['board'] },
  { title: 'Founder', levels: ['founder'] },
  { title: 'Developer', levels: ['developer'] },
]

/* ---------- How access works ---------- */
function HowAccessWorks() {
  const blurbOf = (l: StaffLevel) => LEVELS.find((x) => x.value === l)?.blurb ?? ''
  return (
    <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <summary className="cursor-pointer font-display text-base font-extrabold text-ink">How access works</summary>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
        <ul className="space-y-1.5">
          {LEVEL_GROUPS.map((g) => {
            // Admin 1–3 share one line; the volunteers each have their own.
            const same = g.levels.every((l) => blurbOf(l) === blurbOf(g.levels[0]))
            return (
              <li key={g.title}>
                <strong className="text-ink">{g.title}</strong>
                {same ? (
                  ` — ${blurbOf(g.levels[0])}.`
                ) : (
                  <ul className="mt-0.5 space-y-0.5 pl-4">
                    {g.levels.map((l) => (
                      <li key={l}>
                        {levelLabel(l)} — {blurbOf(l)}.
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
        <p>
          <strong className="text-ink">Sharing.</strong> You can only give a level below your own, and you can only share tasks you have
          yourself. Founders and developers have every task and can give any level; everyone else — the board and admins too — holds just
          the tasks switched on for them. Nobody can change their own level or access.
        </p>
        <p>
          <strong className="text-ink">On hold.</strong> Put someone on hold when you don’t need them for a while — say, BunFest helpers
          after the festival. They keep their account, level and tasks but can’t use anything until you turn them back on, with no new
          invite needed. An end date (“Put on hold automatically after”) does it for you.
        </p>
        <p>
          <strong className="text-ink">Volunteers who only sign up for shifts and log their hours don’t need an account.</strong> They use
          their private volunteer link (Staff → Volunteer roster &amp; hours). Only people who work in the staff area — the Counter,
          check-in, editing — need one.
        </p>
      </div>
    </details>
  )
}

/** Switched off, or past their end date: either way they can't get in until turned back on. */
function isOnHold(m: Member): boolean {
  return m.status !== 'active' || (!!m.access_until && accessHasEnded(m.access_until))
}

/** "Access ends Oct 3", or muted once it has passed. */
function AccessBadge({ until }: { until: string }) {
  return accessHasEnded(until) ? (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Access ended {shortDate(until)}</span>
  ) : (
    <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange-dark">Access ends {shortDate(until)}</span>
  )
}

/* ---------- Invite someone ---------- */
/** The invite just made, for the result box (the form clears for the next one). */
interface MadeInvite {
  code: string
  level: StaffLevel
  name: string
  email: string
  position: string
  accessUntil: string | null
}

/** A ready-to-send email with the code in it — email is how OHRR reaches people. */
function inviteMailto(m: MadeInvite): string {
  const url = `${window.location.origin}/staff`
  const body = [
    `Hi${m.name ? ` ${m.name}` : ''},`,
    '',
    `Here's your invite to OHRR's staff area${m.position ? ` (${m.position})` : ''}. Sign in at ${url}, or create an account there with this email, then enter this code:`,
    '',
    m.code,
    '',
    `You'll join as ${levelLabel(m.level)}.${m.accessUntil ? ` Your access runs until ${longDate(m.accessUntil)}.` : ''} The code works once and expires in 14 days.`,
    '',
    'Ohio House Rabbit Rescue',
  ].join('\n')
  return `mailto:${m.email}?subject=${encodeURIComponent('Your OHRR staff invite')}&body=${encodeURIComponent(body)}`
}

function InvitePanel({
  orgId,
  tiers,
  myLevel,
  holds,
  onInvited,
}: {
  orgId: string
  /** Update 30 has been run: create_staff_invite is there. */
  tiers: boolean
  myLevel: StaffLevel | null
  /** Whether the signed-in person has a task (founders and developers have them all). */
  holds: (cap: Cap) => boolean
  onInvited: () => void
}) {
  // Only levels the inviter may give; the lowest (Volunteer 1) is the default, so nobody makes a founder by accident.
  const canGive = useMemo(() => levelsICanGive(myLevel), [myLevel])
  const lowest: StaffLevel = canGive[canGive.length - 1] ?? 'volunteer1'
  // Only presets whose every task the inviter has themselves.
  const presets = useMemo(() => Object.keys(PRESETS).filter((p) => PRESETS[p].every((k) => holds(k))), [holds])
  const [level, setLevel] = useState<StaffLevel>(lowest)
  const [preset, setPreset] = useState<string>(() => presets.find((p) => PRESET_LEVEL[p] === lowest) ?? presets[0] ?? '__custom__')
  const [customCaps, setCustomCaps] = useState<Set<Cap>>(new Set())
  const [helpers, setHelpers] = useState(false)
  const [until, setUntil] = useState('')
  const [who, setWho] = useState({ name: '', email: '', phone: '', position: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [made, setMade] = useState<MadeInvite | null>(null)
  const [copied, setCopied] = useState(false)
  // Always a level the inviter may give, and a preset they may share.
  const chosen: StaffLevel = canGive.includes(level) ? level : lowest
  const presetNow = preset === '__custom__' || presets.includes(preset) ? preset : (presets[0] ?? '__custom__')
  const isCustom = presetNow === '__custom__'
  // Founders and developers hold every task: nothing to choose, and their access never ends.
  const fullAccess = isFullAccessLevel(chosen)
  // "Can bring on helpers": Lead, Admin 1–3 and Board, and only from someone who can do both.
  const offerHelpers = !fullAccess && HELPER_LEVELS.includes(chosen) && HELPER_CAPS.every((k) => holds(k))
  // The custom list: only tasks the inviter has (the helper pair is the checkbox when it's offered).
  const customChoices = useMemo(
    () =>
      AREAS.map(({ area, caps }) => ({
        area,
        caps: caps.filter((c) => holds(c.key) && !(offerHelpers && HELPER_CAPS.includes(c.key))),
      })).filter((a) => a.caps.length > 0),
    [holds, offerHelpers],
  )
  const baseCaps: Cap[] = fullAccess
    ? []
    : isCustom
      ? customChoices.flatMap((a) => a.caps.map((c) => c.key)).filter((k) => customCaps.has(k))
      : (PRESETS[presetNow] ?? [])
  const caps: Cap[] = Array.from(new Set([...baseCaps, ...(offerHelpers && helpers ? HELPER_CAPS : [])]))
  const today = todayOhio()

  const toggleCustom = (key: Cap) =>
    setCustomCaps((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  const pickPreset = (p: string) => {
    setPreset(p)
    // Each preset suggests a level ("Board" → Board, "Inbox helper" → Volunteer 3 …), if the inviter may give it.
    const suggested = PRESET_LEVEL[p]
    if (suggested && canGive.includes(suggested)) setLevel(suggested)
  }

  const pickLevel = (l: StaffLevel) => {
    setLevel(l)
    // Admin 1–3 have no preset: their tasks are chosen one by one.
    if (ADMIN_LEVELS.includes(l)) setPreset('__custom__')
  }

  // "Select all the tasks I can share", or clear them again.
  const shareable = customChoices.flatMap((a) => a.caps.map((c) => c.key))
  const allPicked = shareable.length > 0 && shareable.every((k) => customCaps.has(k))
  const pickAll = () => setCustomCaps(allPicked ? new Set() : new Set(shareable))

  const setWhoField = (k: keyof typeof who) => (e: { target: { value: string } }) => setWho((w) => ({ ...w, [k]: e.target.value }))

  const generate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMade(null)
    setCopied(false)
    const end = fullAccess ? null : until || null
    if (end && end < today) return setError('Pick an end date from today on, or leave it empty.')
    setBusy(true)
    // One call does everything: level, tasks, end date and who it's for. The
    // database checks the level is below yours and every task is one you have.
    const { data, error } = await supabase.rpc('create_staff_invite', {
      p_org: orgId,
      p_level: chosen,
      p_capabilities: caps,
      p_preset: fullAccess || isCustom ? null : presetNow,
      p_access_until: end,
      p_name: who.name.trim() || null,
      p_email: who.email.trim() || null,
      p_phone: who.phone.trim() || null,
      p_position: who.position.trim() || null,
      p_max_uses: 1,
    })
    setBusy(false)
    if (error) {
      // Not in the database yet: update 30 hasn't been run.
      setError(error.code === 'PGRST202' ? NEEDS_UPDATE_30 : errMessage(error))
      return
    }
    setMade({ code: String(data), level: chosen, name: who.name.trim(), email: who.email.trim(), position: who.position.trim(), accessUntil: end })
    setWho({ name: '', email: '', phone: '', position: '' })
    setUntil('')
    setHelpers(false)
    onInvited()
  }

  const copy = async () => {
    if (!made) return
    try {
      await navigator.clipboard.writeText(made.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked; code is shown for manual copy */
    }
  }

  if (!tiers) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-base font-extrabold text-ink">Invite someone</h2>
        <p className="mt-2 text-sm text-slate-600">{NEEDS_UPDATE_30}</p>
      </div>
    )
  }

  if (canGive.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-base font-extrabold text-ink">Invite someone</h2>
        <p className="mt-2 text-sm text-slate-600">
          You can invite people below your own level, and there isn’t one below {myLevel ? levelLabel(myLevel) : 'yours'}. Ask someone above
          you to invite them.
        </p>
      </div>
    )
  }

  const blurb = LEVELS.find((l) => l.value === chosen)?.blurb

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-base font-extrabold text-ink">Invite someone</h2>
      <form onSubmit={generate} className="mt-3 space-y-3">
        {/* Who it's for — so a waiting invite isn't an anonymous code. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Their name
            <input className={staffInput} value={who.name} maxLength={120} onChange={setWhoField('name')} placeholder="e.g. Bev" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Their email
            <input className={staffInput} type="email" value={who.email} onChange={setWhoField('email')} autoComplete="off" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Phone <span className="font-normal text-slate-500">(optional)</span>
            <input className={staffInput} type="tel" value={who.phone} onChange={setWhoField('phone')} autoComplete="off" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            What for <span className="font-normal text-slate-500">(optional)</span>
            <input className={staffInput} value={who.position} maxLength={120} onChange={setWhoField('position')} placeholder="e.g. Hop Shop, Saturdays" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Level
            <select className={staffInput} value={chosen} onChange={(e) => isStaffLevel(e.target.value) && pickLevel(e.target.value)}>
              {LEVELS.filter((l) => canGive.includes(l.value)).map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {blurb && <span className="mt-1 block text-xs font-normal text-slate-500">{blurb}.</span>}
          </label>
          {!fullAccess && (
            <label className="block text-sm font-semibold text-slate-700">
              Tasks
              <select className={staffInput} value={presetNow} onChange={(e) => pickPreset(e.target.value)}>
                {presets.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="__custom__">Choose tasks myself…</option>
              </select>
            </label>
          )}
        </div>

        {fullAccess ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Holds every task — nothing to choose.</p>
        ) : isCustom ? (
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pick tasks (only ones you have)</p>
              {shareable.length > 0 && (
                <button type="button" onClick={pickAll} className="min-h-11 text-sm font-bold text-brand-blue">
                  {allPicked ? 'Clear all' : 'Select all the tasks I can share'}
                </button>
              )}
            </div>
            {customChoices.length === 0 ? (
              <p className="text-sm text-slate-500">You don’t have any tasks you can share.</p>
            ) : (
              <div className="space-y-2">
                {customChoices.map(({ area, caps: areaCaps }) => (
                  <div key={area}>
                    <p className="text-xs font-bold text-slate-500">{area}</p>
                    <div className="mt-1 grid grid-cols-1 gap-1">
                      {areaCaps.map((c) => (
                        <label key={c.key} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={customCaps.has(c.key)} onChange={() => toggleCustom(c.key)} />
                          {c.description}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            Grants: {PRESETS[presetNow]?.map((k) => k.split('.').slice(-2).join(' ')).join(', ')}
          </p>
        )}

        {offerHelpers && (
          <label className="flex items-start gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue" checked={helpers} onChange={(e) => setHelpers(e.target.checked)} />
            <span>
              Can bring on helpers
              <span className="block text-xs font-normal text-slate-500">They can invite people below them and share only the tasks they have.</span>
            </span>
          </label>
        )}

        {!fullAccess && (
          <label className="block max-w-xs text-sm font-semibold text-slate-700">
            Access until <span className="font-normal text-slate-500">(optional)</span>
            <input type="date" className={staffInput} value={until} min={today} onChange={(e) => setUntil(e.target.value)} />
            <span className="mt-1 block text-xs font-normal text-slate-500">For a set time, e.g. BunFest weekend. Leave empty for no end.</span>
          </label>
        )}

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={busy || (!fullAccess && caps.length === 0)} className={`${btn.blue} w-full disabled:opacity-60`}>
          {busy ? 'Generating…' : 'Generate invite code'}
        </button>
      </form>

      {made && (
        <div className="mt-3 rounded-xl border border-brand-blue/30 bg-brand-blue-50/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
            Invite code {made.name ? `for ${made.name}` : '— share with them'} · joins as {levelLabel(made.level)}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-black tracking-wider text-ink">{made.code}</code>
            <button type="button" onClick={copy} className="rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          {made.accessUntil && <p className="mt-1.5 text-sm font-semibold text-slate-700">Access until {longDate(made.accessUntil)}</p>}
          {made.email && (
            <a href={inviteMailto(made)} className="mt-2 inline-flex min-h-11 items-center rounded-full bg-brand-blue px-4 text-sm font-bold text-white">
              Email it to {made.email}
            </a>
          )}
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Single-use, expires in 14 days. They sign in here (or create an account), then enter this code on their dashboard — they’ll join as{' '}
            {levelLabel(made.level)}.
          </p>
        </div>
      )}
    </div>
  )
}

/** An unused invite (open_invites). Level, tasks and the end date arrive with update 30. */
interface OpenInvite {
  code: string
  role: string | null
  level?: string | null
  preset: string | null
  capabilities?: string[] | null
  access_until?: string | null
  invitee_name: string | null
  invitee_email: string | null
  invitee_phone: string | null
  position_note: string | null
  expires_at: string | null
}

/* ---------- Invites not used yet ---------- */
function WaitingInvites({ invites }: { invites: OpenInvite[] }) {
  if (invites.length === 0) return null
  return (
    <section aria-labelledby="waiting-invites" className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="waiting-invites" className="font-display text-base font-extrabold text-ink">
        Waiting invites <span className="text-sm font-bold text-slate-500">({invites.length})</span>
      </h2>
      <p className="mt-0.5 text-sm text-slate-600">Codes made but not used yet.</p>
      <ul className="mt-2 divide-y divide-slate-100">
        {invites.map((i) => {
          const lv = parseLevel(i.level)
          const n = i.capabilities?.length ?? 0
          const tasks = lv && isFullAccessLevel(lv) ? 'Every task' : i.preset || (n > 0 ? taskCount(n) : null)
          const contact = [i.invitee_email, i.invitee_phone].filter(Boolean).join(' · ')
          const expires = i.expires_at
            ? new Date(i.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
            : null
          return (
            <li key={i.code} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">
                  {i.invitee_name || 'No name given'}
                  {i.position_note && <span className="font-normal text-slate-600"> · {i.position_note}</span>}
                </p>
                {contact && <p className="break-all text-sm text-slate-500">{contact}</p>}
                {(lv || tasks) && <p className="text-sm text-slate-600">{[lv ? levelLabel(lv) : null, tasks].filter(Boolean).join(' · ')}</p>}
                <p className="text-xs text-slate-500">
                  Code <code className="font-mono font-bold text-ink">{i.code}</code>
                  {expires ? ` · expires ${expires}` : ''}
                </p>
              </div>
              {i.access_until && <AccessBadge until={i.access_until} />}
            </li>
          )
        })}
      </ul>
    </section>
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

/* ---------- When someone's access ends (update 30) ---------- */
function AccessUntilField({ member, onSave }: { member: Member; onSave: (member: Member, until: string | null) => Promise<void> }) {
  const [value, setValue] = useState(member.access_until ?? '')
  const [busy, setBusy] = useState(false)
  const save = async (until: string | null) => {
    setBusy(true)
    await onSave(member, until)
    setBusy(false)
  }
  return (
    <div className="mt-3">
      <label className="block max-w-xs text-sm font-semibold text-slate-700">
        Put on hold automatically after <span className="font-normal text-slate-500">(optional)</span>
        <input type="date" className={staffInput} value={value} min={todayOhio()} onChange={(e) => setValue(e.target.value)} />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save(value)}
          disabled={busy || !value || value === (member.access_until ?? '')}
          className="rounded-full bg-brand-blue px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        {member.access_until && (
          <button
            type="button"
            onClick={() => void save(null)}
            disabled={busy}
            className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            No end date
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- One member row ---------- */
function MemberCard({
  member,
  isSelf,
  grants,
  levels,
  tiers,
  canManagePerm,
  giveable,
  holds,
  certs,
  orgId,
  userId,
  nameOfUser,
  onToggleCap,
  onToggleStatus,
  onSetLevel,
  onSetAccessUntil,
  onCertsChanged,
}: {
  member: Member
  isSelf: boolean
  grants: Set<string>
  /** Update 28 has been run: levels, can_manage from the database, certifications. */
  levels: boolean
  /** Update 30 has been run: access that ends on a date. */
  tiers: boolean
  /** Before update 28: whether the signed-in person holds "manage permissions". */
  canManagePerm: boolean
  /** The levels the signed-in person may give. */
  giveable: StaffLevel[]
  /** Whether the signed-in person has a task — only those can be switched on or off (update 30). */
  holds: (cap: Cap) => boolean
  /** null = certifications not available. */
  certs: Certification[] | null
  orgId: string
  userId: string | null
  nameOfUser: (userId: string | null) => string | null
  onToggleCap: (memId: string, key: Cap, grant: boolean) => Promise<void>
  onToggleStatus: (member: Member) => Promise<void>
  onSetLevel: (member: Member, level: StaffLevel) => Promise<void>
  onSetAccessUntil: (member: Member, until: string | null) => Promise<void>
  onCertsChanged: () => Promise<void>
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [levelBusy, setLevelBusy] = useState(false)
  // Owners hold every task — founders and developers (before update 30, board members were admins with every task too).
  const isAdminish = member.role === 'owner' || member.role === 'admin'
  // Update 28: the database says whom the signed-in person may change. Before it: today's rule.
  const manage = levels ? member.can_manage : canManagePerm
  const showToggles = manage && !isAdminish
  const showStatus = levels ? manage : canManagePerm && !isAdminish && !isSelf
  // Their current level always shows in the picker (can_manage means it's below yours, or you're both founders).
  const levelOptions = member.level && !giveable.includes(member.level) ? [member.level, ...giveable] : giveable
  // A founder's or developer's access never ends.
  const showUntil = tiers && manage && !isFullAccessLevel(member.level)
  const someNotMine = showToggles && PERMISSION_CATALOG.some((p) => !holds(p.key))

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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {/* With levels the group heading says it; before them, the role. */}
          {!levels && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isAdminish ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-500'}`}>
              {member.role[0].toUpperCase() + member.role.slice(1)}
            </span>
          )}
          {member.access_until && <AccessBadge until={member.access_until} />}
          {member.status === 'disabled' && <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange">On hold</span>}
        </div>
      </div>

      {/* Only when there's a choice to make (a Volunteer 2 managing a Volunteer 1 has none). */}
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
        <p className="mt-2 text-sm text-slate-500">{levels ? 'Holds every task.' : 'Full access — holds every capability.'}</p>
      ) : showToggles ? (
        <div className="mt-2 space-y-2">
          {/* Update 30: you can only share tasks you have yourself. */}
          {someNotMine && <p className="text-xs text-slate-500">Greyed out: {SHARE_HINT.toLowerCase()}</p>}
          {AREAS.map(({ area, caps }) => (
            <div key={area}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{area}</p>
              <div className="mt-1 grid grid-cols-1 gap-1">
                {caps.map((c) => {
                  const mine = holds(c.key)
                  return (
                    <label key={c.key} title={mine ? undefined : SHARE_HINT} className={`flex items-center gap-2 text-sm ${mine ? 'text-slate-700' : 'text-slate-400'}`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue disabled:opacity-50"
                        checked={grants.has(c.key)}
                        disabled={busyKey === c.key || !mine}
                        onChange={(e) => handleCap(c.key, e.target.checked)}
                      />
                      {c.description}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{grants.size === 0 ? 'No tasks switched on.' : `${taskCount(grants.size)} switched on.`}</p>
      )}

      {showUntil && <AccessUntilField key={member.access_until ?? ''} member={member} onSave={onSetAccessUntil} />}

      {levels && !manage && <p className="mt-1 text-xs text-slate-500">{managedBy(member, isSelf)}</p>}

      {showStatus && (
        <button
          type="button"
          onClick={handleStatus}
          disabled={statusBusy}
          className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
            !isOnHold(member) ? 'border-orange-200 text-brand-orange-dark hover:bg-orange-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {statusBusy ? '…' : isOnHold(member) ? 'Turn back on' : 'Put on hold'}
        </button>
      )}

      {levels && certs && (
        <Certifications member={member} certs={certs} canEdit={manage} orgId={orgId} by={userId} nameOfUser={nameOfUser} onChanged={onCertsChanged} />
      )}
    </div>
  )
}

/** A row from list_team (update 28; access_until arrives with update 30). */
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
  access_until?: string | null
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
  // Update 30 has been run (level_rank('developer') is 10); null = still finding out.
  const [tiers, setTiers] = useState<boolean | null>(null)
  // null = certifications not available.
  const [certs, setCerts] = useState<Certification[] | null>(null)
  // Invites not used yet; null = not available.
  const [invites, setInvites] = useState<OpenInvite[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadCerts = useCallback(async () => {
    if (!orgId) return
    const { data, error } = await supabase
      .from('member_certifications')
      .select('id, membership_id, kind, certified_on, expires_on, certified_by, notes')
      .eq('org_id', orgId)
      .order('certified_on', { ascending: false })
    setCerts(error ? null : ((data ?? []) as Certification[]))
  }, [orgId])

  const loadInvites = useCallback(async () => {
    if (!orgId || !canInvite) return
    const { data, error } = await supabase.rpc('open_invites', { p_org: orgId })
    setInvites(error || !Array.isArray(data) ? null : (data as OpenInvite[]))
  }, [orgId, canInvite])

  const load = useCallback(async () => {
    if (!orgId) return
    setError(null)
    const [teamRes, grantRes, rankRes] = await Promise.all([
      supabase.rpc('list_team', { p_org: orgId }),
      supabase.from('membership_permissions').select('membership_id, permission_key'),
      // The probe for update 30: before it, Developer isn't a level (0), or there are no levels at all.
      supabase.rpc('level_rank', { p_level: 'developer' }),
    ])
    setTiers(!rankRes.error && Number(rankRes.data) === 10)

    let mem: Member[]
    const withLevels = !teamRes.error && Array.isArray(teamRes.data)
    if (withLevels) {
      mem = (teamRes.data as TeamRow[]).map((r) => ({
        id: r.membership_id,
        user_id: r.user_id,
        email: r.email,
        role: r.role,
        status: r.status,
        level: parseLevel(r.level),
        display_name: r.display_name,
        title: r.title,
        can_manage: Boolean(r.can_manage),
        access_until: typeof r.access_until === 'string' ? r.access_until : null,
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
          access_until: null,
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
          access_until: null,
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

  useEffect(() => {
    loadInvites()
  }, [loadInvites])

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

  // On hold = switched off, or past their end date. Turning back on undoes both.
  const toggleStatus = useCallback(async (member: Member) => {
    const name = memberName(member)
    setError(null)
    setNotice(null)
    if (!isOnHold(member)) {
      if (!window.confirm(`Put ${name} on hold? They keep their account, level and tasks, but can’t use anything in the staff area until someone turns them back on.`)) return
      const { error } = await supabase.rpc('set_membership_status', { p_membership: member.id, p_status: 'disabled' })
      if (error) return setError(errMessage(error))
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: 'disabled' } : m)))
      setNotice(`${name} is on hold.`)
      return
    }
    if (member.status !== 'active') {
      const { error } = await supabase.rpc('set_membership_status', { p_membership: member.id, p_status: 'active' })
      if (error) return setError(errMessage(error))
    }
    const ended = !!member.access_until && accessHasEnded(member.access_until)
    if (ended) {
      const { error } = await supabase.rpc('set_member_access_until', { p_membership: member.id, p_until: null })
      if (error) return setError(errMessage(error))
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: 'active', access_until: ended ? null : m.access_until } : m)))
    setNotice(`${name} is back on. Add an end date if their help is for a set time.`)
  }, [])

  const setLevel = useCallback(
    async (member: Member, next: StaffLevel) => {
      if (next === member.level) return
      const name = memberName(member)
      if (next === 'developer' && !window.confirm(`Make ${name} a developer? Developers hold every task and can change anyone, founders included.`)) return
      if (next === 'founder' && !window.confirm(`Make ${name} a founder? Founders hold every task and can change anyone, other founders included.`)) return
      // Before update 30 the board held every task.
      if (next === 'board' && !tiers && !window.confirm(`Put ${name} on the board? Board members can do everything, and look after leads and workers.`)) return
      setError(null)
      const { error } = await supabase.rpc('set_member_level', { p_membership: member.id, p_level: dbLevel(next, tiers === true) })
      if (error) {
        setError(errMessage(error))
        return
      }
      // Their role follows the level (founders and developers are owners) and whom you may manage can change: reload.
      await load()
    },
    [load, tiers],
  )

  const setAccessUntil = useCallback(async (member: Member, until: string | null) => {
    setError(null)
    const { error } = await supabase.rpc('set_member_access_until', { p_membership: member.id, p_until: until })
    if (error) {
      setError(errMessage(error))
      return
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, access_until: until } : m)))
  }, [])

  // Your own level: from the staff context, or your own row if the context loaded before update 28 was run.
  const myLevel = contextLevel ?? members.find((m) => m.user_id === user?.id)?.level ?? null
  const giveable = useMemo(() => (levels ? levelsICanGive(myLevel, tiers === true) : []), [levels, myLevel, tiers])
  const byUser = useMemo(() => new Map(members.map((m) => [m.user_id, memberName(m)])), [members])
  const nameOfUser = useCallback((id: string | null) => (id ? (byUser.get(id) ?? null) : null), [byUser])
  // One group per level someone is at, highest first (ten empty groups would bury the people).
  const working = members.filter((m) => !isOnHold(m))
  const held = members.filter(isOnHold)
  const levelGroups = LEVELS.filter((l) => working.some((m) => m.level === l.value))
  const unplaced = working.filter((m) => !m.level)

  const sortedMembers = useMemo(() => {
    const rank: Record<string, number> = { owner: 0, admin: 1, staff: 2 }
    return [...members].sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9))
  }, [members])

  if (!canInvite && !canManage) {
    return (
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Team</h1>
        <p className="mt-3 text-sm text-slate-600">You don't have access to manage the team. Ask whoever brought you on if you need it.</p>
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
      tiers={tiers === true}
      canManagePerm={canManage}
      giveable={giveable}
      holds={can}
      certs={certs ? certs.filter((c) => c.membership_id === m.id) : null}
      orgId={orgId}
      userId={user?.id ?? null}
      nameOfUser={nameOfUser}
      onToggleCap={toggleCap}
      onToggleStatus={toggleStatus}
      onSetLevel={setLevel}
      onSetAccessUntil={setAccessUntil}
      onCertsChanged={loadCerts}
    />
  )

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Team</h1>
      <p className="mt-1 text-sm text-slate-600">
        Invite staff and control what each person can do. Changes take effect immediately and are logged — across both the website and the app.
        {levels ? ' You can change people below your own level (founders and developers can change anyone), but not yourself.' : ''}
      </p>

      <HowAccessWorks />

      {canInvite && tiers !== null && (
        <div className="mt-5">
          <InvitePanel orgId={orgId} tiers={tiers} myLevel={myLevel} holds={can} onInvited={() => void loadInvites()} />
        </div>
      )}
      {canInvite && invites && <WaitingInvites invites={invites} />}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {notice && <p className="mt-4 text-sm font-semibold text-green-700">{notice}</p>}

      {loading ? (
        <Spinner label="Loading team…" />
      ) : levels ? (
        <div className="mt-6 space-y-6">
          {levelGroups.map((l) => {
            const people = working.filter((m) => m.level === l.value)
            return (
              <section key={l.value} aria-labelledby={`level-${l.value}`}>
                <div className="px-1">
                  <h2 id={`level-${l.value}`} className="font-display text-lg font-extrabold text-ink">
                    {l.plural} <span className="text-sm font-bold text-slate-500">({people.length})</span>
                  </h2>
                  <p className="text-sm text-slate-600">{l.blurb}.</p>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3">{people.map(card)}</div>
              </section>
            )
          })}
          {/* A level this screen doesn't know (say, mid-update) still shows the person. */}
          {unplaced.length > 0 && (
            <section aria-labelledby="level-other">
              <h2 id="level-other" className="px-1 font-display text-lg font-extrabold text-ink">
                Other <span className="text-sm font-bold text-slate-500">({unplaced.length})</span>
              </h2>
              <div className="mt-2 grid grid-cols-1 gap-3">{unplaced.map(card)}</div>
            </section>
          )}
          {held.length > 0 && (
            <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer font-display text-lg font-extrabold text-ink">
                On hold <span className="text-sm font-bold text-slate-500">({held.length})</span>
              </summary>
              <p className="mt-1 text-sm text-slate-600">
                They keep their level and tasks. Turn someone back on when you need them again — say, for next year’s BunFest.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 opacity-90">{held.map(card)}</div>
            </details>
          )}
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
