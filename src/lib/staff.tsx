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
  { key: 'staff.invite', area: 'Staff', description: 'Invite workers' },
  { key: 'staff.permissions.manage', area: 'Staff', description: 'Grant/revoke worker permissions & status' },
  { key: 'audit.view', area: 'Staff', description: 'View the activity log' },
  { key: 'settings.manage', area: 'Staff', description: 'Change app settings and turn test features on/off' },
  { key: 'inbox.manage', area: 'Inbox', description: 'Read and handle requests sent from the app and website' },
  { key: 'bookings.manage', area: 'Bookings', description: 'Set up bookable shifts & appointments, see rosters, confirm and check in' },
  { key: 'social.publish', area: 'Content', description: 'Release queued social-media posts (the one person who posts as OHRR)' },
  { key: 'counter.use', area: 'Counter', description: 'The Counter (in the app): add items, ring up sales, take tickets at the door, sell raffle tickets' },
  { key: 'social.approve', area: 'Content', description: 'Approve social-media posts written by someone else' },
  { key: 'volunteers.certificates', area: 'Volunteers', description: 'Make volunteer certificates and set the hours that earn one' },
  { key: 'giving.guardians', area: 'Giving', description: 'Keep the Rescue Rabbit Guardians list (the Legacy Fund thank-you)' },
]

// Access presets (mirror the DB permission_presets seed) for quick invites.
export const PRESETS: Record<string, Cap[]> = {
  'Hop Shop Manager': [
    'hopshop.products.create',
    'hopshop.products.edit',
    'hopshop.products.delete',
    'hopshop.inventory.update',
    'hopshop.orders.view',
  ],
  'Adoptions Coordinator': [
    'adoptions.listings.create',
    'adoptions.listings.edit',
    'adoptions.status.change',
    'inbox.manage',
    'bookings.manage',
  ],
  'Volunteer Lead': ['volunteers.shifts.manage', 'volunteers.signups.approve', 'inbox.manage', 'bookings.manage'],
  'Content Editor': ['content.education.edit', 'announcements.post', 'events.bunfest.manage'],
  // The till and the door only (the Counter lives in the app, on a phone).
  'Counter volunteer': ['counter.use'],
  'Content Approver': ['social.approve'],
  // Update 28: someone certified to work the Hop Shop — the till, stock counts and orders, nothing else.
  'Hop Shop Worker': ['counter.use', 'hopshop.inventory.update', 'hopshop.orders.view'],
}

/*
 * Update 28: staff levels, highest first. A level decides who may change whom:
 * nobody can change the level, permissions or access of someone at their own
 * level or above (founders can manage founders). Founders are owners and board
 * members are admins, so every can() check keeps working as before. The
 * database enforces all of this; the screens only offer what it will allow.
 */
export type StaffLevel = 'founder' | 'board' | 'lead' | 'worker'
export const LEVELS: { value: StaffLevel; label: string; plural: string; blurb: string }[] = [
  { value: 'founder', label: 'Founder', plural: 'Founders', blurb: 'Everything, including who is on the board' },
  { value: 'board', label: 'Board', plural: 'Board', blurb: 'Everything; looks after leads and workers' },
  { value: 'lead', label: 'Lead', plural: 'Leads', blurb: 'Coordinators with the permissions their job needs' },
  { value: 'worker', label: 'Worker', plural: 'Workers', blurb: 'One job, e.g. the Hop Shop counter' },
]
const LEVEL_RANK: Record<StaffLevel, number> = { founder: 4, board: 3, lead: 2, worker: 1 }

export function isStaffLevel(v: unknown): v is StaffLevel {
  return typeof v === 'string' && v in LEVEL_RANK
}
export function levelRank(l: StaffLevel | null | undefined): number {
  return l ? LEVEL_RANK[l] : 0
}
export function levelLabel(l: StaffLevel): string {
  return LEVELS.find((x) => x.value === l)?.label ?? l
}
/** Founders and board members hold every permission (they're owners and admins). */
export function isFullAccessLevel(l: StaffLevel | null | undefined): boolean {
  return l === 'founder' || l === 'board'
}
/** The levels someone at `mine` may give: any below their own, or any at all for a founder. */
export function levelsICanGive(mine: StaffLevel | null | undefined): StaffLevel[] {
  if (!mine) return []
  return LEVELS.map((l) => l.value).filter((l) => mine === 'founder' || levelRank(l) < levelRank(mine))
}

export interface Membership {
  id: string
  orgId: string
  role: string
  status: string
  /** Update 28 — null until that update has been run. */
  level: StaffLevel | null
}

interface StaffValue {
  configured: boolean
  loading: boolean
  user: User | null
  membership: Membership | null
  /** The signed-in person's level (update 28); null before that update, or when not a member. */
  level: StaffLevel | null
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
      setCapabilities(new Set())
      return
    }
    // Ask for the level too; before update 28 the column isn't there, so ask again without it.
    const withLevel = await supabase
      .from('memberships')
      .select('id, org_id, role, status, level')
      .eq('status', 'active')
      .limit(1)
    let r: { id: string; org_id: string; role: string; status: string; level?: unknown } | undefined = withLevel.data?.[0]
    if (withLevel.error) {
      const plain = await supabase.from('memberships').select('id, org_id, role, status').eq('status', 'active').limit(1)
      r = plain.data?.[0]
    }
    if (!r) {
      setMembership(null)
      setCapabilities(new Set())
      return
    }
    const m: Membership = { id: r.id, orgId: r.org_id, role: r.role, status: r.status, level: isStaffLevel(r.level) ? r.level : null }
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
