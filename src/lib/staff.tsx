import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isConfigured } from './supabase'

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
}

export interface Membership {
  id: string
  orgId: string
  role: string
  status: string
}

interface StaffValue {
  configured: boolean
  loading: boolean
  user: User | null
  membership: Membership | null
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
    const { data: rows } = await supabase
      .from('memberships')
      .select('id, org_id, role, status')
      .eq('status', 'active')
      .limit(1)
    const r = rows?.[0]
    if (!r) {
      setMembership(null)
      setCapabilities(new Set())
      return
    }
    const m: Membership = { id: r.id, orgId: r.org_id, role: r.role, status: r.status }
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
      value={{ configured: isConfigured, loading, user, membership, capabilities, can, refresh: loadMembership, signOut }}
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
