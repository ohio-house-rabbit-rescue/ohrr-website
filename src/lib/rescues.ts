// The rescue directory — the published rows of the shared `rescue_partners`
// table, mapped exactly as the app's Find a Rescue maps them
// (ohrr-app/src/features/bunfest/content.ts → useRescuePartners). Staff edit the
// list under Staff → BunFest → Rescues (here or in the app); there is no bundled
// sample list on the website, so an empty table shows an empty state.
import { useEffect, useMemo, useState } from 'react'
import { supabase, isConfigured } from './supabase'
import { useBunFestEvent } from './data'

// Display order for the region filter (only regions present are shown).
export const REGIONS = ['Midwest', 'Northeast', 'South', 'West'] as const
export type Region = (typeof REGIONS)[number]

// Abbreviation → full state name, so searching either ("OH" or "Ohio") works.
export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington DC',
}

/** "OH" → "Ohio" (or the code itself when it isn't a known state). */
export function stateName(code: string): string {
  return US_STATES[code.toUpperCase()] ?? code
}

// A rescue as the public pages show one (camelCase, like the app's Partner).
export interface Rescue {
  id: string
  name: string
  /** Human-readable place label for cards, e.g. "Columbus, OH". */
  location: string
  city?: string
  state?: string
  region?: string
  phone?: string
  email?: string
  address?: string
  url?: string
  blurb?: string
  /** OHRR — the host of Midwest BunFest. Its own phone number is never shown. */
  host: boolean
  /** At this year's BunFest (tagged by year; untagged rows fall back to the older flag). */
  atBunfest: boolean
}

interface RescueRow {
  id: string
  name: string
  location: string | null
  city: string | null
  state: string | null
  region: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  blurb: string | null
  is_host: boolean
  at_bunfest: boolean
  bunfest_years: number[] | null
}

const COLUMNS =
  'id,name,location,city,state,region,phone,email,address,website,blurb,is_host,at_bunfest,bunfest_years'

const orUndef = (v: string | null) => (v && v.trim().length > 0 ? v : undefined)

function rowToRescue(r: RescueRow, year: number): Rescue {
  const years = r.bunfest_years ?? []
  return {
    id: r.id,
    name: r.name,
    location: r.location ?? [r.city, r.state].filter(Boolean).join(', '),
    city: orUndef(r.city),
    state: orUndef(r.state),
    region: orUndef(r.region),
    phone: orUndef(r.phone),
    email: orUndef(r.email),
    address: orUndef(r.address),
    url: orUndef(r.website),
    blurb: orUndef(r.blurb),
    host: r.is_host,
    // `bunfest_years` holds the years a rescue came. A row nobody has tagged by
    // year yet falls back to the older at_bunfest flag (same rule as the app).
    atBunfest: years.length > 0 ? years.includes(year) : r.at_bunfest,
  }
}

/**
 * The published rescue directory. `loading` is true until both the rows and
 * the BunFest event (which tells us which year "this year" is) have arrived.
 * [] when the table is empty or unreachable — no sample fallback here.
 */
export function useRescues(): { items: Rescue[]; loading: boolean } {
  const bunfest = useBunFestEvent()
  const [rows, setRows] = useState<RescueRow[] | null>(null)

  useEffect(() => {
    if (!isConfigured) {
      setRows([])
      return
    }
    let active = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('rescue_partners')
          .select(COLUMNS)
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true })
        if (active) setRows(error ? [] : ((data ?? []) as RescueRow[]))
      } catch {
        if (active) setRows([])
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const year = bunfest.event ? new Date(bunfest.event.startsAt).getFullYear() : new Date().getFullYear()
  const items = useMemo(() => (rows ?? []).map((r) => rowToRescue(r, year)), [rows, year])
  return { items, loading: rows === null || bunfest.loading }
}

/** "Columbus House Rabbit Society" → "CH" — for the neutral name tile (no logos, no clip art). */
export function initials(name: string): string {
  return name
    .replace(/[^A-Za-z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** A tap-to-call link for another rescue's published number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** A Google Maps search for a rescue's street address. */
export function mapsHref(r: Pick<Rescue, 'name' | 'address'>): string {
  const q = [r.name, r.address].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
