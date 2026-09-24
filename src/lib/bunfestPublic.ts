// Midwest BunFest for visitors: the "at the festival" cards, each activity's
// page, the talks, the speakers and the vendors — read from the same records
// the app and the BunFest site read. Staff edit them once (Staff → BunFest, in
// the app or here) per year; next year is "Copy 2026 into 2027", then edit.
// Nothing here is typed into the code, so the page changes when they do.
// (lib/bunfest.ts is the staff side of the same tables.)
import { useCallback, useEffect, useReducer } from 'react'
import { supabase } from './supabase'
import { useBunFestEvent } from './data'
import { BUNFEST_SAMPLE } from './constants'
import type { IconName } from '../components/icons'

/* --------------------------------------------------------------- loading */

type Entry = { status: 'loading' | 'ok' | 'error'; value?: unknown; promise: Promise<void> }
const cache = new Map<string, Entry>()

function start(key: string, fn: () => Promise<unknown>): Entry {
  const existing = cache.get(key)
  if (existing) return existing
  const entry: Entry = { status: 'loading', promise: Promise.resolve() }
  entry.promise = fn().then(
    (v) => {
      entry.status = 'ok'
      entry.value = v
    },
    () => {
      entry.status = 'error'
    },
  )
  cache.set(key, entry)
  return entry
}

export interface Loadable<T> {
  data: T | undefined
  loading: boolean
  failed: boolean
  retry: () => void
}

/** Read once per visit (moving between the festival pages doesn't reload); `key` null = not yet. */
function useLoad<T>(key: string | null, fn: () => Promise<T>): Loadable<T> {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const entry = key ? start(key, fn) : null
  const shown = entry?.status
  useEffect(() => {
    if (!entry) return
    if (entry.status !== shown) {
      rerender()
      return
    }
    if (entry.status !== 'loading') return
    let active = true
    entry.promise.then(() => {
      if (active) rerender()
    })
    return () => {
      active = false
    }
  }, [entry, shown])
  const retry = useCallback(() => {
    if (!key) return
    cache.delete(key)
    rerender()
  }, [key])
  return {
    data: entry?.status === 'ok' ? (entry.value as T) : undefined,
    loading: !entry || entry.status === 'loading',
    failed: entry?.status === 'error',
    retry,
  }
}

async function rows<T>(p: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await p
  if (error) throw error
  return (Array.isArray(data) ? data : []) as T[]
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/* ------------------------------------------------------------ the year */

/** The festival's year (in Ohio), from the BunFest event staff keep in Events. */
export function useFestivalYear() {
  const { event, source, loading } = useBunFestEvent()
  const year = event
    ? Number(new Date(event.startsAt).toLocaleDateString('en-US', { year: 'numeric', timeZone: 'America/New_York' }))
    : undefined
  return { event, year, source, loading }
}

/* ------------------------------------------------------------ the cards */

export interface Feature {
  id: string
  title: string
  blurb: string | null
  icon: string | null
  link: string | null
}

export function useFeatures(year: number | undefined): Loadable<Feature[]> {
  return useLoad(year ? `features:${year}` : null, async () =>
    (
      await rows<{ id: string; title: string; blurb: string | null; icon: string | null; link_url: string | null }>(
        supabase
          .from('event_features')
          .select('id,title,blurb,icon,link_url')
          .eq('year', year!)
          .eq('is_published', true)
          .order('sort_order'),
      )
    ).map((r) => ({ id: r.id, title: r.title, blurb: r.blurb, icon: r.icon, link: r.link_url })),
  )
}

/** Icon names staff can pick for a card; anything else draws a star (same list as the app). */
const KNOWN_ICONS = new Set<string>([
  'home', 'calendar', 'bag', 'heart', 'info', 'users', 'award', 'mappin', 'clock', 'book', 'gift',
  'ticket', 'mail', 'store', 'star', 'sparkles', 'camera', 'scan', 'gavel', 'phone', 'search', 'box',
])
export function iconOf(name: string | null | undefined): IconName {
  return (name && KNOWN_ICONS.has(name) ? name : 'star') as IconName
}

/* ---------------------------------------------------- where a link goes */

export type Dest = { to: string } | { href: string }

/**
 * Staff type links in the app's own paths ("/bunfest/p/spa", "/shop",
 * "/vets?rhdv2=1"), once, for the app and both websites. This turns each into
 * the page that answers it here, so nobody retypes a link for the web.
 */
export function bunfestDest(link: string | null | undefined): Dest | null {
  const l = (link ?? '').trim()
  if (!l) return null
  if (/^(https?:|mailto:|tel:)/i.test(l)) return { href: l }
  if (!l.startsWith('/')) return { href: `https://${l}` }
  const [path, query = ''] = l.split('?')
  const params = new URLSearchParams(query)
  if (path === '/bunfest' || path === '/bunfest/') return { to: '/bunfest' }
  const page = path.match(/^\/bunfest\/p\/([\w-]+)\/?$/)
  if (page) return { to: `/bunfest/p/${page[1]}` }
  const map: Record<string, string> = {
    '/bunfest/schedule': '/bunfest/schedule',
    '/bunfest/speakers': '/bunfest/schedule#speakers',
    '/bunfest/vendors': '/bunfest/vendors',
    '/bunfest/partners': '/bunfest/vendors#rescues',
    '/bunfest/sponsors': '/bunfest#sponsors',
    '/bunfest/auction': '/bunfest/silent-auction',
    '/bunfest/visit': '/bunfest',
  }
  if (map[path]) return { to: map[path] }
  if (path.startsWith('/bunfest/vendors/')) return { to: '/bunfest/vendors' }
  if (path.startsWith('/bunfest/partners/')) return { to: '/bunfest/vendors#rescues' }
  // The floor plan lives on the BunFest site only.
  if (path === '/bunfest/map') return { href: `${BUNFEST_SAMPLE}/map` }
  if (path === '/vets') return { to: params.get('rhdv2') ? '/learn/vets?rhdv2=1' : '/learn/vets' }
  if (path === '/shop') return { to: '/hop-shop' }
  return { to: l }
}

/** The words on a card's link, from where it goes. */
export function ctaFor(d: Dest | null): string {
  if (!d) return ''
  if ('href' in d) return 'Visit →'
  if (d.to.startsWith('/bunfest/schedule')) return 'See the schedule →'
  if (d.to.startsWith('/bunfest/vendors')) return "See who's coming →"
  if (d.to === '/hop-shop') return 'About the Hop Shop →'
  return 'Details →'
}

/* ------------------------------------------------------ each activity page */

export interface PageSection {
  heading?: string
  body?: string
  list?: string[]
  slot?: 'raffle-details'
}

export interface FestivalPage {
  id: string
  slug: string
  title: string
  subtitle: string | null
  icon: string | null
  sponsorNote: string | null
  chips: string[]
  note: string | null
  sections: PageSection[]
  feature: 'reserve' | 'raffle' | null
  reserveClosedNote: string | null
  emailSignup: string | null
  contact: { address?: string; phone?: string; url?: string; urlLabel?: string } | null
  relatedLabel: string | null
  related: { label: string; to: string }[]
}

interface PageRow {
  id: string
  slug: string
  title: string
  subtitle: string | null
  icon: string | null
  sponsor_note: string | null
  chips: string[] | null
  note: string | null
  sections: unknown
  feature: 'reserve' | 'raffle' | null
  reserve: unknown
  email_signup: string | null
  contact: unknown
  related_label: string | null
  related: unknown
}

function toPage(r: PageRow): FestivalPage {
  const sections = Array.isArray(r.sections)
    ? (r.sections as Record<string, unknown>[])
        .filter((s) => s && typeof s === 'object')
        .map((s) => ({
          heading: str(s.heading),
          body: str(s.body),
          list: Array.isArray(s.list) ? s.list.filter((i): i is string => typeof i === 'string' && !!i.trim()) : undefined,
          slot: s.slot === 'raffle-details' ? ('raffle-details' as const) : undefined,
        }))
        .filter((s) => s.heading || s.body || (s.list && s.list.length > 0) || s.slot)
    : []
  const c = r.contact && typeof r.contact === 'object' ? (r.contact as Record<string, unknown>) : null
  const contact = c ? { address: str(c.address), phone: str(c.phone), url: str(c.url), urlLabel: str(c.urlLabel) } : null
  const reserve = r.reserve && typeof r.reserve === 'object' ? (r.reserve as Record<string, unknown>) : null
  const related = Array.isArray(r.related)
    ? (r.related as Record<string, unknown>[])
        .map((x) => ({ label: str(x?.label) ?? '', to: str(x?.to) ?? '' }))
        .filter((x) => x.label && x.to)
    : []
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: str(r.subtitle) ?? null,
    icon: r.icon,
    sponsorNote: str(r.sponsor_note) ?? null,
    chips: (r.chips ?? []).filter(Boolean),
    note: str(r.note) ?? null,
    sections,
    feature: r.feature,
    reserveClosedNote: str(reserve?.closedNote) ?? null,
    emailSignup: str(r.email_signup) ?? null,
    contact: contact && (contact.address || contact.phone || contact.url) ? contact : null,
    relatedLabel: str(r.related_label) ?? null,
    related,
  }
}

export function usePages(year: number | undefined): Loadable<FestivalPage[]> {
  return useLoad(year ? `pages:${year}` : null, async () =>
    (
      await rows<PageRow>(
        supabase
          .from('bunfest_pages')
          .select('id,slug,title,subtitle,icon,sponsor_note,chips,note,sections,feature,reserve,email_signup,contact,related_label,related')
          .eq('year', year!)
          .eq('is_published', true)
          .order('sort_order'),
      )
    ).map(toPage),
  )
}

/** Where raffle tickets are sold, the drawing time … (Staff → Silent auction). */
export function useRaffleDetails(eventSlug: string | undefined): Loadable<string | null> {
  return useLoad(eventSlug ? `raffle:${eventSlug}` : null, async () => {
    const { data, error } = await supabase
      .from('auction_settings')
      .select('raffle_details')
      .eq('event_slug', eventSlug!)
      .maybeSingle()
    if (error) throw error
    return str((data as { raffle_details?: unknown } | null)?.raffle_details) ?? null
  })
}

/* ------------------------------------------------------ talks & speakers */

export interface Session {
  id: string
  start: string
  end: string | null
  title: string
  presenter: string | null
  description: string | null
  room: string | null
  track: string
  presenterIds: string[]
  kind: 'session' | 'break' | 'activity'
}

export function useSessions(year: number | undefined): Loadable<Session[]> {
  return useLoad(year ? `sessions:${year}` : null, async () =>
    (
      await rows<{
        id: string
        start_time: string
        end_time: string | null
        title: string
        presenter: string | null
        description: string | null
        room: string | null
        track: string | null
        presenter_ids: string[] | null
        kind: Session['kind']
      }>(
        supabase
          .from('bunfest_sessions')
          .select('id,start_time,end_time,title,presenter,description,room,track,presenter_ids,kind,sort_order')
          .eq('year', year!)
          .eq('is_published', true)
          .order('start_time')
          .order('sort_order'),
      )
    ).map((r) => ({
      id: r.id,
      start: r.start_time,
      end: r.end_time,
      title: r.title,
      presenter: r.presenter,
      description: r.description,
      room: r.room,
      track: r.track ?? '',
      presenterIds: r.presenter_ids ?? [],
      kind: r.kind,
    })),
  )
}

export interface Presenter {
  id: string
  name: string
  credentials: string | null
  affiliation: string | null
  bio: string | null
  photoUrl: string | null
  website: string | null
}

export function usePresenters(): Loadable<Presenter[]> {
  return useLoad('presenters', async () =>
    (
      await rows<{
        id: string
        name: string
        credentials: string | null
        affiliation: string | null
        bio: string | null
        photo_url: string | null
        website: string | null
      }>(
        supabase
          .from('bunfest_presenters')
          .select('id,name,credentials,affiliation,bio,photo_url,website')
          .eq('is_published', true)
          .order('sort_order')
          .order('name'),
      )
    ).map((r) => ({
      id: r.id,
      name: r.name,
      credentials: r.credentials,
      affiliation: r.affiliation,
      bio: r.bio,
      photoUrl: r.photo_url,
      website: r.website,
    })),
  )
}

/** "Barbara Oglesbee, DVM, DABVP (Avian)" */
export function presenterName(p: Pick<Presenter, 'name' | 'credentials'>): string {
  return p.credentials ? `${p.name}, ${p.credentials}` : p.name
}

/** "13:30:00" → "1:30 PM" (a session's time of day). */
export function clock(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h)) return t
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

/** "10:30 – 11:15 AM" (AM/PM said once when both match). */
export function timeRange(start: string, end: string | null): string {
  const a = clock(start)
  if (!end) return a
  const b = clock(end)
  return `${a.slice(-2) === b.slice(-2) ? a.slice(0, -3) : a} – ${b}`
}

/* --------------------------------------------------------------- vendors */

export interface Vendor {
  id: string
  name: string
  category: string
  blurb: string | null
  website: string | null
}

export function useVendors(year: number | undefined): Loadable<Vendor[]> {
  return useLoad(year ? `vendors:${year}` : null, async () => {
    const { data, error } = await supabase.rpc('bunfest_vendors_public', { p_year: year })
    if (error) throw error
    return (
      (Array.isArray(data) ? data : []) as {
        id: string
        name: string
        category: string | null
        blurb: string | null
        website: string | null
      }[]
    ).map((r) => ({ id: r.id, name: r.name, category: r.category ?? 'Vendors', blurb: r.blurb, website: r.website }))
  })
}
