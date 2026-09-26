import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isConfigured } from './supabase'
import { Icon } from '../components/icons'

// Capability keys (mirror the app / DB seed). Owners & admins implicitly hold all.
export const CAPS = [
  'hopshop.products.create',
  'hopshop.products.edit',
  'hopshop.products.delete',
  'hopshop.inventory.update',
  'hopshop.orders.view',
  'adoptions.listings.create',
  'adoptions.listings.edit',
  'adoptions.status.change',
  'volunteers.shifts.manage',
  'volunteers.signups.approve',
  'content.education.edit',
  'events.bunfest.manage',
  'announcements.post',
  'staff.invite',
  'staff.permissions.manage',
  'audit.view',
  'settings.manage',
  'inbox.manage',
  'bookings.manage',
  'social.publish',
  'counter.use',
  // Update 26: a second person approves social posts. Update 25: certificates are the top tier's.
  'social.approve',
  'volunteers.certificates',
  // Update 29: the Legacy Fund's Rescue Rabbit Guardians list.
  'giving.guardians',
  // Update 31: the email list (Staff → Supporters).
  'supporters.view',
] as const
export type Cap = (typeof CAPS)[number]

// Human-readable catalog grouped by area — drives the Team permission toggles.
export interface PermissionMeta {
  key: Cap
  area: string
  description: string
}
export const PERMISSION_CATALOG: PermissionMeta[] = [
  { key: 'hopshop.products.create', area: 'Hop Shop', description: 'Add new products' },
  { key: 'hopshop.products.edit', area: 'Hop Shop', description: 'Edit product details' },
  { key: 'hopshop.products.delete', area: 'Hop Shop', description: 'Delete products' },
  { key: 'hopshop.inventory.update', area: 'Hop Shop', description: 'Update stock quantities' },
  { key: 'hopshop.orders.view', area: 'Hop Shop', description: 'View orders' },
  { key: 'adoptions.listings.create', area: 'Adoptions', description: 'Create adoptable rabbit listings' },
  { key: 'adoptions.listings.edit', area: 'Adoptions', description: 'Edit adoptable rabbit listings' },
  { key: 'adoptions.status.change', area: 'Adoptions', description: "Change a rabbit's adoption status" },
  { key: 'volunteers.shifts.manage', area: 'Volunteers', description: 'Create/manage volunteer shifts' },
  { key: 'volunteers.signups.approve', area: 'Volunteers', description: 'Approve volunteer sign-ups' },
  { key: 'content.education.edit', area: 'Content', description: 'Edit education / care content' },
  { key: 'events.bunfest.manage', area: 'Events', description: 'Manage Midwest BunFest info' },
  { key: 'announcements.post', area: 'Content', description: 'Post announcements' },
  // Update 30: you share only what you have, and only with people below you.
  { key: 'staff.invite', area: 'Staff', description: 'Invite people — to levels below yours, sharing only tasks you have' },
  { key: 'staff.permissions.manage', area: 'Staff', description: 'Change the level, tasks and access of people below you (sharing only tasks you have)' },
  { key: 'audit.view', area: 'Staff', description: 'View the activity log' },
  { key: 'settings.manage', area: 'Staff', description: 'Change app settings and turn test features on/off' },
  { key: 'inbox.manage', area: 'Inbox', description: 'Read and handle requests sent from the app and website' },
  { key: 'bookings.manage', area: 'Bookings', description: 'Set up bookable shifts & appointments, see rosters, confirm and check in' },
  { key: 'social.publish', area: 'Content', description: 'Release queued social-media posts (the one person who posts as OHRR)' },
  { key: 'counter.use', area: 'Counter', description: 'The Counter (in the app): add items, ring up sales, take tickets at the door, sell raffle tickets' },
  { key: 'social.approve', area: 'Content', description: 'Approve social-media posts written by someone else' },
  { key: 'volunteers.certificates', area: 'Volunteers', description: 'Make volunteer certificates and set the hours that earn one' },
  { key: 'giving.guardians', area: 'Giving', description: 'Keep the Rescue Rabbit Guardians list (the Legacy Fund thank-you)' },
  { key: 'supporters.view', area: 'Supporters', description: 'See and download the supporter email list' },
]

// Access presets (mirror the DB permission_presets seed) for quick invites,
// roughly by the level they suit (see PRESET_LEVEL in Team).
export const PRESETS: Record<string, Cap[]> = {
  // Update 30: the board's own set — the activity log and the approvals.
  Board: ['audit.view', 'social.approve', 'volunteers.certificates', 'giving.guardians'],
  'Adoptions Coordinator': [
    'adoptions.listings.create',
    'adoptions.listings.edit',
    'adoptions.status.change',
    'inbox.manage',
    'bookings.manage',
  ],
  'Volunteer Lead': ['volunteers.shifts.manage', 'volunteers.signups.approve', 'inbox.manage', 'bookings.manage'],
  'Hop Shop Manager': [
    'hopshop.products.create',
    'hopshop.products.edit',
    'hopshop.products.delete',
    'hopshop.inventory.update',
    'hopshop.orders.view',
  ],
  'Content Editor': ['content.education.edit', 'announcements.post', 'events.bunfest.manage'],
  'BunFest & Events': ['events.bunfest.manage', 'bookings.manage', 'counter.use'],
  // Update 30: helpers with one slice of a coordinator's job.
  'Inbox helper': ['inbox.manage'],
  'Rabbit listings helper': ['adoptions.listings.create', 'adoptions.listings.edit', 'adoptions.status.change'],
  'Care pages helper': ['content.education.edit'],
  'Content Approver': ['social.approve'],
  // The till and the door only (the Counter lives in the app, on a phone).
  'Counter volunteer': ['counter.use'],
  // Update 28: someone certified to work the Hop Shop — the till, stock counts and orders, nothing else.
  'Hop Shop Worker': ['counter.use', 'hopshop.inventory.update', 'hopshop.orders.view'],
}

/*
 * Staff levels, highest first (update 28; update 30 made the ladder the
 * sponsor set on 2026-09-25). A level decides who may change whom: founders
 * and developers may change anyone but themselves; everyone else only people
 * below their own level, and you can only share tasks you have yourself.
 * Founders and developers are owners, so they hold every task and every can()
 * check keeps working; everyone else — Board and Admin 1–3 included — holds
 * exactly the tasks switched on for them. The database enforces all of this;
 * the screens only offer what it will allow.
 */
export type StaffLevel =
  | 'developer'
  | 'founder'
  | 'board'
  | 'admin3'
  | 'admin2'
  | 'admin1'
  | 'lead'
  | 'volunteer3'
  | 'volunteer2'
  | 'volunteer1'
export const LEVELS: { value: StaffLevel; label: string; plural: string; blurb: string }[] = [
  { value: 'developer', label: 'Developer', plural: 'Developers', blurb: 'Every task; builds and maintains the app and website' },
  { value: 'founder', label: 'Founder', plural: 'Founders', blurb: 'Every task, and looks after everyone' },
  { value: 'board', label: 'Board', plural: 'Board', blurb: 'The board: oversight and approvals, plus any tasks added' },
  { value: 'admin3', label: 'Admin 3', plural: 'Admin 3', blurb: 'Office and operations, with the tasks switched on' },
  { value: 'admin2', label: 'Admin 2', plural: 'Admin 2', blurb: 'Office and operations, with the tasks switched on' },
  { value: 'admin1', label: 'Admin 1', plural: 'Admin 1', blurb: 'Office and operations, with the tasks switched on' },
  { value: 'lead', label: 'Lead', plural: 'Leads', blurb: 'Runs an area and can share its tasks' },
  { value: 'volunteer3', label: 'Volunteer 3', plural: 'Volunteer 3', blurb: 'A trusted volunteer; their hours count straight away' },
  { value: 'volunteer2', label: 'Volunteer 2', plural: 'Volunteer 2', blurb: 'A few chosen tasks' },
  { value: 'volunteer1', label: 'Volunteer 1', plural: 'Volunteer 1', blurb: 'One job, e.g. the Counter' },
]
const LEVEL_RANK: Record<StaffLevel, number> = {
  developer: 10,
  founder: 9,
  board: 8,
  admin3: 7,
  admin2: 6,
  admin1: 5,
  lead: 4,
  volunteer3: 3,
  volunteer2: 2,
  volunteer1: 1,
}
/**
 * The four levels before update 30 has been run (Board then meant every task).
 * Their 'worker' reads as Volunteer 1 here and is sent back as 'worker' (dbLevel).
 */
export const LEGACY_LEVELS: StaffLevel[] = ['founder', 'board', 'lead', 'volunteer1']

export function isStaffLevel(v: unknown): v is StaffLevel {
  return typeof v === 'string' && v in LEVEL_RANK
}
/** A level from the database: update 28's 'worker' is Volunteer 1 (update 30 renames it so). */
export function parseLevel(v: unknown): StaffLevel | null {
  if (v === 'worker') return 'volunteer1'
  return isStaffLevel(v) ? v : null
}
/** The value the database takes: before update 30, Volunteer 1 is still 'worker'. */
export function dbLevel(l: StaffLevel, tiers: boolean): string {
  return !tiers && l === 'volunteer1' ? 'worker' : l
}
export function levelRank(l: StaffLevel | null | undefined): number {
  return l ? LEVEL_RANK[l] : 0
}
export function levelLabel(l: StaffLevel): string {
  return LEVELS.find((x) => x.value === l)?.label ?? l
}
/** Founders and developers hold every task (they're owners); nobody else does. */
export function isFullAccessLevel(l: StaffLevel | null | undefined): boolean {
  return l === 'founder' || l === 'developer'
}
/**
 * The levels someone at `mine` may give, highest first: any at all for a
 * founder or developer, otherwise only those below their own. Before update 30
 * (`tiers` false) only the four levels of then.
 */
export function levelsICanGive(mine: StaffLevel | null | undefined, tiers = true): StaffLevel[] {
  if (!mine) return []
  return LEVELS.map((l) => l.value).filter(
    (l) => (tiers || LEGACY_LEVELS.includes(l)) && (isFullAccessLevel(mine) || levelRank(l) < levelRank(mine)),
  )
}

/** Today in Ohio, as YYYY-MM-DD — access ends by Ohio's calendar, as in the database. */
export const todayOhio = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
/** Access with an end date before today (update 30). The end date itself is still a working day. */
export function accessHasEnded(until: string | null | undefined): boolean {
  return Boolean(until && until < todayOhio())
}
/** "Oct 3", or "Oct 3, 2027" in another year. */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const sameYear = iso.slice(0, 4) === todayOhio().slice(0, 4)
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
}
/** "October 3, 2026". */
export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export interface Membership {
  id: string
  orgId: string
  role: string
  status: string
  /** Update 28 — null until that update has been run. */
  level: StaffLevel | null
  /** Update 30 — the last day of their access (YYYY-MM-DD), or null for no end. */
  accessUntil: string | null
}

interface StaffValue {
  configured: boolean
  loading: boolean
  user: User | null
  membership: Membership | null
  /** The signed-in person's level (update 28); null before that update, or when not a member. */
  level: StaffLevel | null
  /** Set when their access ended on this date (update 30): they're treated as not on the team. */
  accessEndedOn: string | null
  /** Someone put them on hold (status 'disabled'): not on the team until turned back on. */
  onHold: boolean
  capabilities: Set<string>
  can: (cap: Cap) => boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<StaffValue | null>(null)

export function StaffProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [accessEndedOn, setAccessEndedOn] = useState<string | null>(null)
  const [onHold, setOnHold] = useState(false)
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) {
      setSessionLoaded(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setSessionLoaded(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = user?.id ?? null

  const loadMembership = useCallback(async () => {
    if (!isConfigured || !userId) {
      setMembership(null)
      setAccessEndedOn(null)
      setOnHold(false)
      setCapabilities(new Set())
      return
    }
    // Ask for the level and the end date too. Before update 30 there's no
    // access_until and before update 28 no level, so ask again with less.
    // Fellow members' rows are readable too, so this asks for the person's own.
    type Row = { id: string; org_id: string; role: string; status: string; level?: unknown; access_until?: unknown }
    let r: Row | undefined
    for (const cols of ['id, org_id, role, status, level, access_until', 'id, org_id, role, status, level', 'id, org_id, role, status']) {
      const res = await supabase.from('memberships').select(cols).eq('user_id', userId).eq('status', 'active').limit(1)
      if (res.error) continue
      r = (res.data as unknown as Row[] | null)?.[0]
      break
    }
    const until = typeof r?.access_until === 'string' ? r.access_until : null
    // Access that has ended counts as not on the team (the database refuses them anyway).
    if (!r || accessHasEnded(until)) {
      // Their own row is readable whatever its status (update 30), so an
      // on-hold person can be told so instead of being asked for a code.
      const held = r
        ? null
        : await supabase.from('memberships').select('id').eq('user_id', userId).eq('status', 'disabled').limit(1)
      setOnHold(Boolean(held?.data?.length))
      setMembership(null)
      setAccessEndedOn(r ? until : null)
      setCapabilities(new Set())
      return
    }
    setAccessEndedOn(null)
    setOnHold(false)
    const m: Membership = {
      id: r.id,
      orgId: r.org_id,
      role: r.role,
      status: r.status,
      level: parseLevel(r.level),
      accessUntil: until,
    }
    setMembership(m)
    if (m.role === 'owner' || m.role === 'admin') {
      setCapabilities(new Set(CAPS))
      return
    }
    const { data: grants } = await supabase
      .from('membership_permissions')
      .select('permission_key')
      .eq('membership_id', m.id)
    setCapabilities(new Set((grants ?? []).map((g: { permission_key: string }) => g.permission_key)))
  }, [userId])

  useEffect(() => {
    if (!sessionLoaded) return
    let active = true
    ;(async () => {
      await loadMembership()
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [sessionLoaded, loadMembership])

  const can = useCallback(
    (cap: Cap) => {
      if (membership && (membership.role === 'owner' || membership.role === 'admin')) return true
      return capabilities.has(cap)
    },
    [membership, capabilities],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setMembership(null)
    setAccessEndedOn(null)
    setCapabilities(new Set())
  }, [])

  return (
    <Ctx.Provider
      value={{
        configured: isConfigured,
        loading,
        user,
        membership,
        level: membership?.level ?? null,
        accessEndedOn,
        onHold,
        capabilities,
        can,
        refresh: loadMembership,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useStaff(): StaffValue {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStaff must be used within <StaffProvider>')
  return c
}

export const staffInput =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-brand-blue" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

/**
 * A password box with a Show / Hide button inside it, so people can check
 * what they typed — easy to get wrong on a phone keyboard. Takes the same
 * props as an <input>, apart from `type`.
 */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative mt-1 block">
      <input {...props} type={show ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${staffInput} !mt-0 pr-24`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex min-w-[44px] items-center gap-1.5 rounded-r-xl px-3 text-sm font-bold text-brand-blue hover:text-brand-blue-dark"
      >
        <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        {show ? 'Hide' : 'Show'}
      </button>
    </span>
  )
}
