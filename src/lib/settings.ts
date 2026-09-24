// Org-wide app settings — the website's copy of the app's
// src/features/settings/useSetting.ts and features.ts (keep the three in sync).
//
// Backed by the `app_settings` table: one row per key with a small JSON value,
// e.g. key 'raffle_tickets_enabled' → {"enabled": true}. Public pages call
// useSetting() to decide what to show; it never throws — a missing row, an RLS
// denial or absent Supabase config all resolve silently to the fallback. Staff
// write with setSetting() from Staff → Features (RLS gates writes on
// `settings.manage`).
//
// Only NON-SECRET values belong in this table: every row is publicly readable.
import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'

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

// Upsert one setting (staff). RLS enforces `settings.manage`.
export async function setSetting(key: string, value: Json, ctx: { orgId: string; userId?: string | null }): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ org_id: ctx.orgId, key, value, updated_by: ctx.userId ?? null }, { onConflict: 'org_id,key' })
  if (error) throw error
}

/* ------------------------------------------------------------ the switches */

// The features an admin can switch on and off, in one list. Each entry is an
// `app_settings` row holding {"enabled": boolean}; the screen that shows the
// feature asks `useFeatureFlag(key, defaultOn)`. Same list as the app's.

export interface AppFeature {
  /** app_settings.key */
  key: string
  label: string
  /** One line: what turning it on shows, and where. */
  description: string
  /** Treated as ON until a row is saved (the gate must pass the same default). */
  defaultOn?: boolean
  group: 'Midwest BunFest' | 'Volunteering' | 'For the app stores'
}

export const RAFFLE_TICKETS_FLAG = 'raffle_tickets_enabled'
/** Second switch for the Android / iPhone apps only (Apple 5.3.3 / Play gambling). */
export const RAFFLE_TICKETS_NATIVE_FLAG = 'raffle_tickets_native_enabled'
export const BUNFEST_SECTION_FLAG = 'bunfest_section_enabled'
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
    key: RAFFLE_TICKETS_FLAG,
    label: 'Raffle tickets',
    description:
      'Show “Get raffle tickets” on the BunFest raffle page: numbered tickets held for the person, paid at the raffle table, drawn from Staff → Raffle tickets. Pricing comes from Silent Auction → Auction setup.',
    group: 'Midwest BunFest',
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

export const FEATURE_GROUPS: AppFeature['group'][] = ['Midwest BunFest', 'Volunteering', 'For the app stores']
