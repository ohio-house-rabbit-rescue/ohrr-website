// Org-wide app settings — the website's copy of the app's
// src/features/settings/useSetting.ts and features.ts (keep the three in sync).
//
// Backed by the `app_settings` table: one row per key with a small JSON value,
// e.g. key 'raffle_tickets_enabled' → {"enabled": true}. Public pages call
// useSetting() / useFeature() to decide what to show; they never throw — a
// missing row, an RLS denial or absent Supabase config all resolve silently to
// the fallback. Staff write with setSetting(): the on/off switches (keys ending
// "_enabled") from Staff → Features, which only Founders and Developers may
// change once update 38 has run; other settings need `settings.manage`.
//
// Only NON-SECRET values belong in this table: every row is publicly readable.
import { useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { supabase, isConfigured } from './supabase'
import { StaffContext, accessHasEnded } from './staff'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface SettingState<T> {
  /** The stored value, or `fallback` while loading / when nothing is stored. */
  value: T
  /** True until the first read settles (so a gated feature never flashes). */
  loading: boolean
}

// Read one setting. The public site has no org context, so this reads the first
// row for the key (the site serves one organisation). Returns the fallback
// silently on any error.
export function useSetting<T extends Json>(key: string, fallback: T): SettingState<T> {
  const [state, setState] = useState<SettingState<T>>({ value: fallback, loading: isConfigured })

  useEffect(() => {
    if (!isConfigured) {
      setState({ value: fallback, loading: false })
      return
    }
    let active = true
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        const stored = !error && data ? (data.value as T | null) : null
        setState({ value: stored ?? fallback, loading: false })
      })
    return () => {
      active = false
    }
    // `fallback` is a literal at every call site; keying on it would refetch on
    // each render when it's an object, so only `key` drives the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

// Convenience for the common {"enabled": boolean} flag shape.
export function useFeatureFlag(key: string, fallback = false): SettingState<boolean> {
  const { value, loading } = useSetting<{ enabled?: boolean }>(key, { enabled: fallback })
  return { value: value?.enabled === true, loading }
}

// Every setting row for an org (staff screens). Throws on error so the caller
// can show it.
export async function fetchSettings(orgId: string): Promise<Record<string, Json>> {
  const { data, error } = await supabase.from('app_settings').select('key, value').eq('org_id', orgId)
  if (error) throw error
  const out: Record<string, Json> = {}
  for (const row of (data ?? []) as { key: string; value: Json }[]) out[row.key] = row.value
  return out
}

// Upsert one setting (staff). RLS decides who may: after update 38 only a
// Founder or Developer for a switch (a key ending "_enabled"); `settings.manage`
// for the rest.
export async function setSetting(key: string, value: Json, ctx: { orgId: string; userId?: string | null }): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ org_id: ctx.orgId, key, value, updated_by: ctx.userId ?? null }, { onConflict: 'org_id,key' })
  if (error) throw error
}

/* ------------------------------------------------------------ the switches */

// The features a Founder or Developer can switch on and off, in one list —
// IDENTICAL to the app's src/features/settings/features.ts (same keys, labels,
// descriptions, defaults and groups; keep the two in sync).
//
// Each entry is an `app_settings` row holding {"enabled": boolean}; the page
// that shows the feature asks `useFeature(key)` (or the older useFeatureFlag).
// Switched OFF, a feature disappears for visitors on the app, the website and
// the BunFest site. Signed-in staff still see it, under a "Hidden from the
// public" note, so it can be got ready and checked before it goes live.

export type FeatureGroup = 'Midwest BunFest' | 'The rescue' | 'Volunteering' | 'For the app stores'

export interface AppFeature {
  /** app_settings.key — always ends in "_enabled". */
  key: string
  label: string
  /** One line: what turning it on shows, and where. */
  description: string
  /** Treated as ON until a row is saved (the gate must pass the same default). */
  defaultOn?: boolean
  group: FeatureGroup
}

export const BUNFEST_SECTION_FLAG = 'bunfest_section_enabled'
export const SILENT_AUCTION_FLAG = 'silent_auction_enabled'
export const RAFFLE_TICKETS_FLAG = 'raffle_tickets_enabled'
/** Second switch for the Android / iPhone apps only (Apple 5.3.3 / Play gambling). */
export const RAFFLE_TICKETS_NATIVE_FLAG = 'raffle_tickets_native_enabled'
export const HOP_SHOP_ITEMS_FLAG = 'hop_shop_items_enabled'
export const PHONE_NOTIFICATIONS_FLAG = 'phone_notifications_enabled'
export const VOLUNTEER_HOURS_FLAG = 'volunteer_hours_enabled'

export const APP_FEATURES: AppFeature[] = [
  {
    key: BUNFEST_SECTION_FLAG,
    label: 'The Midwest BunFest section',
    defaultOn: true,
    description:
      'The BunFest tab, its home screen and everything under it. Switch OFF out of season and the app becomes OHRR-only; the pages stay, ready for next year.',
    group: 'Midwest BunFest',
  },
  {
    key: SILENT_AUCTION_FLAG,
    label: 'Silent Auction',
    defaultOn: true,
    description:
      'The auction items, their pages and online bidding, on the app, the website and the BunFest site. Switching it OFF also closes online bidding; switch bidding back on at the auction desk when the auction is ready.',
    group: 'Midwest BunFest',
  },
  {
    key: RAFFLE_TICKETS_FLAG,
    label: 'Raffle tickets',
    description:
      'Show “Get raffle tickets” on the BunFest raffle page: numbered tickets held for the person, paid at the raffle table, drawn from Staff → Raffle tickets. Pricing comes from Silent Auction → Auction setup.',
    group: 'Midwest BunFest',
  },
  {
    key: HOP_SHOP_ITEMS_FLAG,
    label: 'Hop Shop items online',
    defaultOn: true,
    description:
      'The “On the shelf now” list on the Hop Shop page, on the app and the website: what staff have added to the shop, with photos and prices. The shop’s hours and address always show.',
    group: 'The rescue',
  },
  {
    key: PHONE_NOTIFICATIONS_FLAG,
    label: 'Phone notifications',
    defaultOn: true,
    description:
      'The “Notifications on this phone” sign-up in My OHRR and the one-time offer on Home. Switched OFF, nothing new is sent either; phones already signed up hear again when it is back on.',
    group: 'The rescue',
  },
  {
    key: VOLUNTEER_HOURS_FLAG,
    label: 'Volunteers can log their own hours',
    defaultOn: true,
    description:
      'The private “My volunteer hours” link lets a volunteer see their totals and log hours; staff confirm them under Staff → Volunteers. Switch OFF to keep hours staff-entered only.',
    group: 'Volunteering',
  },
  {
    key: RAFFLE_TICKETS_NATIVE_FLAG,
    label: 'Raffle tickets inside the phone apps',
    defaultOn: true,
    description:
      'Also show raffle tickets inside the installed Android / iPhone apps. ON for testers. Switch OFF before a store review if Apple or Google object to raffle tickets in an app — the web app is unaffected.',
    group: 'For the app stores',
  },
]

export const FEATURE_GROUPS: FeatureGroup[] = ['Midwest BunFest', 'The rescue', 'Volunteering', 'For the app stores']

/** The default for a key (ON unless the entry says otherwise). */
export function featureDefault(key: string): boolean {
  return Boolean(APP_FEATURES.find((f) => f.key === key)?.defaultOn)
}

/**
 * Is a stored switch on? The same rule as the database's feature_on(): a
 * boolean `enabled` decides; a missing row (or anything else) means the default.
 */
export function switchValue(value: Json | undefined | null, defaultOn: boolean): boolean {
  const enabled = value && typeof value === 'object' && !Array.isArray(value) ? value.enabled : undefined
  return typeof enabled === 'boolean' ? enabled : defaultOn
}

/* ------------------------------------------------ is a staff member here? */

// The public pages have no staff context (StaffProvider only wraps /staff), so
// this asks — once per signed-in person — whether whoever is signed in on this
// browser has an active OHRR membership. It never asks anyone to sign in: with
// no session there is nothing to ask, and the answer is simply "not staff".
interface StaffSeen {
  /** False until the answer is in. */
  known: boolean
  staff: boolean
}

let staffSeen: StaffSeen = { known: !isConfigured, staff: false }
let checkedFor: string | null | undefined
let watching = false
const staffListeners = new Set<() => void>()

function setStaffSeen(next: StaffSeen) {
  staffSeen = next
  staffListeners.forEach((l) => l())
}

async function checkStaff(userId: string | null): Promise<void> {
  if (userId === checkedFor) return
  checkedFor = userId
  if (!userId) {
    setStaffSeen({ known: true, staff: false })
    return
  }
  let staff = false
  try {
    // access_until arrives with update 30: ask again without it if it isn't there.
    for (const cols of ['id, access_until', 'id']) {
      const { data, error } = await supabase.from('memberships').select(cols).eq('user_id', userId).eq('status', 'active').limit(1)
      if (error) continue
      const row = (data as unknown as { access_until?: string | null }[] | null)?.[0]
      staff = Boolean(row) && !accessHasEnded(row?.access_until ?? null)
      break
    }
  } catch {
    staff = false
  }
  if (checkedFor === userId) setStaffSeen({ known: true, staff })
}

function watchStaff() {
  if (watching || !isConfigured) return
  watching = true
  supabase.auth.getSession().then(
    ({ data }) => void checkStaff(data.session?.user?.id ?? null),
    () => setStaffSeen({ known: true, staff: false }),
  )
  supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user?.id ?? null
    // Not from inside supabase-js's own callback (it asks for that).
    setTimeout(() => void checkStaff(id), 0)
  })
}

function subscribeStaff(listener: () => void): () => void {
  watchStaff()
  staffListeners.add(listener)
  return () => {
    staffListeners.delete(listener)
  }
}
const readStaff = () => staffSeen

/**
 * Is a signed-in OHRR team member looking at this page? Inside the staff area
 * the staff context answers; on the public pages, the browser's own sign-in.
 */
export function useStaffHere(): StaffSeen {
  const ctx = useContext(StaffContext)
  const seen = useSyncExternalStore(subscribeStaff, readStaff, readStaff)
  if (ctx) return { known: !ctx.loading, staff: Boolean(ctx.membership) }
  return seen
}

export interface FeatureState {
  /** The stored switch (a missing row = the feature's default). */
  on: boolean
  /** Show it here: switched on, or a signed-in staff member is looking. */
  show: boolean
  /** Switched off, but staff are looking: show it under the "Hidden from the public" note. */
  preview: boolean
  /** True until the answer is in (so a switched-off feature never flashes). */
  loading: boolean
}

/**
 * One feature switch for a page. `on` is what the switch says; `show` and
 * `preview` add the rule that signed-in staff still see a switched-off
 * feature, marked "Hidden from the public" (HiddenFromPublic).
 */
export function useFeature(key: string, defaultOn: boolean = featureDefault(key)): FeatureState {
  const { value, loading } = useSetting<Json>(key, null)
  const staff = useStaffHere()
  const on = switchValue(value, defaultOn)
  return {
    on,
    show: on || staff.staff,
    preview: !on && staff.staff,
    loading: loading || (!on && !staff.known),
  }
}
