import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'
import { SPONSOR_TIERS } from './constants'
import type {
  Rabbit,
  Announcement,
  CareArticle,
  VolunteerOpp,
  EventItem,
  Vet,
  HopShopProduct,
  RaffleItem,
  HeroSlide,
  Sponsor,
  SponsorTier,
  PlacementSurface,
} from './types'
import { sampleHeroSlides } from '../data/heroSlides'
import { sampleRabbits } from '../data/sampleRabbits'
import { sampleEvents } from '../data/events'
import { sampleVets } from '../data/vets'
import { sampleAnnouncements } from '../data/announcements'
import { sampleCareArticles } from '../data/careArticles'

export type Source = 'live' | 'sample'

// Every public hook here reads the SAME Supabase project the OHRR app uses and
// silently falls back to the built-in sample data (amber "Sample" note) when the
// table is missing, empty, or unreachable. Nothing on the public site ever
// throws because a table hasn't been created yet.

interface RabbitRow {
  id: string
  name: string
  status: string | null
  sex: string | null
  age: string | null
  breed: string | null
  size: string | null
  bonded: boolean
  description: string | null
  photos: string[] | null
}

function mapRabbit(r: RabbitRow): Rabbit {
  return { ...r, photos: r.photos ?? [], photo: r.photos?.[0] }
}

// Adoptable rabbits from the SAME Supabase the app uses; falls back to samples.
export function useRabbits(limit = 60): { rabbits: Rabbit[] | null; source: Source } {
  const [rabbits, setRabbits] = useState<Rabbit[] | null>(null)
  const [source, setSource] = useState<Source>('sample')
  useEffect(() => {
    let active = true
    ;(async () => {
      if (isConfigured) {
        const { data } = await supabase
          .from('rabbits')
          .select('id,name,status,sex,age,breed,size,bonded,description,photos')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .limit(limit)
        const rows = (data ?? []) as RabbitRow[]
        if (active && rows.length > 0) {
          setRabbits(rows.map(mapRabbit))
          setSource('live')
          return
        }
      }
      if (active) {
        setRabbits(sampleRabbits.slice(0, limit))
        setSource('sample')
      }
    })()
    return () => {
      active = false
    }
  }, [limit])
  return { rabbits, source }
}

export function useFeaturedRabbits(limit = 6) {
  return useRabbits(limit)
}

interface AnnouncementRow {
  id: string
  title: string
  body: string
  created_at: string | null
  image_url?: string | null
}

const ANNOUNCEMENT_COLUMNS = 'id,title,body,created_at'

// True when PostgREST rejects a read/write because the optional `image_url` column
// isn't there yet (migration 20260917160000_announcements_image.sql not applied).
export function isMissingImageColumn(error: { message?: string } | null | undefined): boolean {
  return /image_url/i.test(error?.message ?? '')
}

// Published announcements, newest first. Falls back to the live site's news
// posts ONLY when the table is empty or unreachable. `limit` 0 = all.
export function useAnnouncements(limit = 0): { items: Announcement[] | null; source: Source } {
  const [items, setItems] = useState<Announcement[] | null>(null)
  const [source, setSource] = useState<Source>('sample')
  useEffect(() => {
    let active = true
    const fallback = () => {
      if (!active) return
      setItems(limit > 0 ? sampleAnnouncements.slice(0, limit) : sampleAnnouncements)
      setSource('sample')
    }
    ;(async () => {
      if (!isConfigured) return fallback()
      const query = async (columns: string): Promise<{ data: unknown; error: { message?: string } | null }> => {
        let q = supabase
          .from('announcements')
          .select(columns)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
        if (limit > 0) q = q.limit(limit)
        return await q
      }
      let res = await query(`${ANNOUNCEMENT_COLUMNS},image_url`)
      // Until the owner applies the announcements-image migration, read without the column.
      if (res.error && isMissingImageColumn(res.error)) res = await query(ANNOUNCEMENT_COLUMNS)
      const rows = (res.data ?? []) as AnnouncementRow[]
      if (res.error || rows.length === 0) return fallback()
      if (active) {
        setItems(
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            createdAt: r.created_at,
            imageUrl: r.image_url ?? null,
          })),
        )
        setSource('live')
      }
    })()
    return () => {
      active = false
    }
  }, [limit])
  return { items, source }
}

interface CareRow {
  id: string
  slug: string
  title: string
  icon: string
  summary: string
  body: string | null
  tip: string | null
  section?: 'care' | 'give' | 'about' | 'adopt' | 'volunteer'
}

// Care guides: live rows from the app's care_articles table merged with the
// built-in articles adapted from ohiohouserabbitrescue.org (live wins by slug).
// null while loading.
export function useCareArticles(): { articles: CareArticle[] | null; source: Source } {
  const [articles, setArticles] = useState<CareArticle[] | null>(null)
  const [source, setSource] = useState<Source>('sample')
  useEffect(() => {
    let active = true
    ;(async () => {
      let live: CareArticle[] = []
      if (isConfigured) {
        const { data, error } = await supabase
          .from('care_articles')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
        if (!error && data) live = data as CareRow[]
      }
      if (!active) return
      const liveSlugs = new Set(live.map((a) => a.slug))
      setArticles([...live, ...sampleCareArticles.filter((a) => !liveSlugs.has(a.slug))])
      setSource(live.length > 0 ? 'live' : 'sample')
    })()
    return () => {
      active = false
    }
  }, [])
  return { articles, source }
}

// Live volunteer opportunities (null while loading, [] when none/absent).
export function useVolunteerOpps(): VolunteerOpp[] | null {
  const [items, setItems] = useState<VolunteerOpp[] | null>(null)
  useEffect(() => {
    if (!isConfigured) {
      setItems([])
      return
    }
    let active = true
    supabase
      .from('volunteer_opportunities')
      .select('id,category,title,detail,when_text,where_text,spots')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (active) setItems((data ?? []) as VolunteerOpp[])
      })
    return () => {
      active = false
    }
  }, [])
  return items
}

interface EventRow {
  id: string
  slug: string
  title: string
  starts_at: string
  ends_at: string | null
  venue: string | null
  address: string | null
  city: string | null
  summary: string | null
  body: string | null
  theme: string | null
  url: string | null
}

function mapEvent(r: EventRow): EventItem {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    venue: r.venue,
    address: r.address,
    city: r.city,
    summary: r.summary,
    body: r.body,
    theme: r.theme,
    url: r.url,
  }
}

// Events from the shared `events` table (may not exist yet) — falls back to the seed.
export function useEvents(): { events: EventItem[] | null; source: Source } {
  const [events, setEvents] = useState<EventItem[] | null>(null)
  const [source, setSource] = useState<Source>('sample')
  useEffect(() => {
    let active = true
    ;(async () => {
      if (isConfigured) {
        const { data, error } = await supabase
          .from('events')
          .select('id,slug,title,starts_at,ends_at,venue,address,city,summary,body,theme,url')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .order('starts_at', { ascending: true })
        const rows = (data ?? []) as EventRow[]
        if (!error && active && rows.length > 0) {
          setEvents(rows.map(mapEvent))
          setSource('live')
          return
        }
      }
      if (active) {
        setEvents(sampleEvents)
        setSource('sample')
      }
    })()
    return () => {
      active = false
    }
  }, [])
  return { events, source }
}

// The next Midwest BunFest (by slug/title), so /bunfest is never stale.
export function useBunFestEvent(): { event: EventItem | null; source: Source; loading: boolean } {
  const { events, source } = useEvents()
  if (events === null) return { event: null, source, loading: true }
  const bunfests = events
    .filter((e) => /bunfest/i.test(e.slug) || /bunfest/i.test(e.title))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const now = Date.now()
  const upcoming = bunfests.find((e) => new Date(e.endsAt ?? e.startsAt).getTime() >= now)
  return { event: upcoming ?? bunfests[bunfests.length - 1] ?? null, source, loading: false }
}

interface VetRow {
  id: string
  name: string
  doctors: string | null
  address: string | null
  city: string | null
  region: string
  phone: string | null
  phone2: string | null
  email: string | null
  website: string | null
  notes: string | null
  is_emergency: boolean
  is_low_cost_spay: boolean
}

function mapVet(r: VetRow): Vet {
  return {
    id: r.id,
    name: r.name,
    doctors: r.doctors,
    address: r.address,
    city: r.city,
    region: r.region,
    phone: r.phone,
    phone2: r.phone2,
    email: r.email,
    website: r.website,
    notes: r.notes,
    isEmergency: r.is_emergency,
    isLowCostSpay: r.is_low_cost_spay,
  }
}

// Vets from the shared `vets` table (may not exist yet) — falls back to the seed.
export function useVets(): { vets: Vet[] | null; source: Source } {
  const [vets, setVets] = useState<Vet[] | null>(null)
  const [source, setSource] = useState<Source>('sample')
  useEffect(() => {
    let active = true
    ;(async () => {
      if (isConfigured) {
        const { data, error } = await supabase
          .from('vets')
          .select('id,name,doctors,address,city,region,phone,phone2,email,website,notes,is_emergency,is_low_cost_spay')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
        const rows = (data ?? []) as VetRow[]
        if (!error && active && rows.length > 0) {
          setVets(rows.map(mapVet))
          setSource('live')
          return
        }
      }
      if (active) {
        setVets(sampleVets)
        setSource('sample')
      }
    })()
    return () => {
      active = false
    }
  }, [])
  return { vets, source }
}

interface HeroRow {
  id: string
  placement: string
  headline: string
  subline: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  starts_at: string | null
  ends_at: string | null
  sort_order: number
}

function inWindow(s: { startsAt?: string | null; endsAt?: string | null }, now = Date.now()): boolean {
  if (s.startsAt && new Date(s.startsAt).getTime() > now) return false
  if (s.endsAt && new Date(s.endsAt).getTime() < now) return false
  return true
}

// Home-page hero slides (max 3) and featured cards (max 4) from the shared
// `hero_slides` table — highest sort_order first, only within their date window.
// Falls back to the built-in seed when the table is missing or empty.
export function useHeroSlides(): { hero: HeroSlide[]; featured: HeroSlide[]; loaded: boolean; source: Source } {
  const [slides, setSlides] = useState<HeroSlide[] | null>(null)
  const [source, setSource] = useState<Source>('sample')
  useEffect(() => {
    let active = true
    ;(async () => {
      if (isConfigured) {
        const { data, error } = await supabase
          .from('hero_slides')
          .select('id,placement,headline,subline,image_url,cta_label,cta_url,starts_at,ends_at,sort_order')
          .eq('is_published', true)
          .order('sort_order', { ascending: false })
        const rows = (data ?? []) as HeroRow[]
        // Live rows usually have no photo yet (staff can add one later). Borrow the
        // bundled artwork, fit, countdown and icon from the seed slide for the same link
        // so pictures never vanish when the live list replaces the seed. An uploaded
        // image always wins; a function card with no photo shows its fixed icon.
        const seedFor = (placement: string, cta: string | null | undefined) =>
          sampleHeroSlides.find((s) => s.placement === placement && s.ctaUrl === cta) ??
          sampleHeroSlides.find((s) => s.ctaUrl === cta)
        if (!error && active && rows.length > 0) {
          setSlides(
            rows.map((r) => {
              const placement = r.placement === 'featured' ? 'featured' : 'hero'
              const seed = seedFor(placement, r.cta_url)
              return {
                id: r.id,
                placement,
                headline: r.headline,
                subline: r.subline,
                imageUrl: r.image_url || seed?.imageUrl || null,
                imageFit: r.image_url ? null : (seed?.imageFit ?? null),
                countdownTo: seed?.countdownTo ?? null,
                icon: seed?.icon ?? null,
                ctaLabel: r.cta_label,
                ctaUrl: r.cta_url,
                startsAt: r.starts_at,
                endsAt: r.ends_at,
                sortOrder: r.sort_order,
              }
            }),
          )
          setSource('live')
          return
        }
      }
      if (active) {
        setSlides(sampleHeroSlides)
        setSource('sample')
      }
    })()
    return () => {
      active = false
    }
  }, [])
  const all = (slides ?? sampleHeroSlides).filter((s) => inWindow(s)).sort((a, b) => b.sortOrder - a.sortOrder)
  return {
    hero: all.filter((s) => s.placement === 'hero').slice(0, 3),
    featured: all.filter((s) => s.placement === 'featured').slice(0, 4),
    loaded: slides !== null,
    source,
  }
}

interface RaffleRow {
  id: string
  title: string
  description: string | null
  donated_by: string | null
  value_cents: number | null
  photo_url: string | null
  session: string
  status: string
}

// Silent-auction items for one event from the shared `raffle_items` table, plus the
// optional intro text from `auction_settings`. No seed: the table may not exist yet,
// so any read error or empty result yields [] and the page shows its empty state.
export function useRaffleItems(eventSlug = 'midwest-bunfest-2026'): {
  items: RaffleItem[] | null
  intro: string | null
} {
  const [items, setItems] = useState<RaffleItem[] | null>(null)
  const [intro, setIntro] = useState<string | null>(null)
  useEffect(() => {
    if (!isConfigured) {
      setItems([])
      return
    }
    let active = true
    ;(async () => {
      const [itemsRes, settingsRes] = await Promise.all([
        supabase
          .from('raffle_items')
          .select('id,title,description,donated_by,value_cents,photo_url,session,status')
          .eq('event_slug', eventSlug)
          .eq('is_published', true)
          .order('sort_order', { ascending: true }),
        supabase.from('auction_settings').select('intro_text').eq('event_slug', eventSlug).limit(1),
      ])
      if (!active) return
      const rows = itemsRes.error ? [] : ((itemsRes.data ?? []) as RaffleRow[])
      setItems(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          donatedBy: r.donated_by,
          valueCents: r.value_cents,
          photoUrl: r.photo_url,
          session: r.session,
          status: r.status,
        })),
      )
      const s = settingsRes.error ? null : (settingsRes.data?.[0] as { intro_text?: string | null } | undefined)
      setIntro(s?.intro_text?.trim() ? s.intro_text : null)
    })()
    return () => {
      active = false
    }
  }, [eventSlug])
  return { items, intro }
}

// Active Hop Shop products, if the public read is allowed. [] when not readable.
export function useHopShopProducts(): HopShopProduct[] | null {
  const [items, setItems] = useState<HopShopProduct[] | null>(null)
  useEffect(() => {
    if (!isConfigured) {
      setItems([])
      return
    }
    let active = true
    supabase
      .from('hopshop_products')
      .select('id,name,description,price_cents')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (active) setItems(error ? [] : ((data ?? []) as HopShopProduct[]))
      })
    return () => {
      active = false
    }
  }, [])
  return items
}

// ---- Sponsors & placements (read-only; the app owns the tables) ----
// The tables may not exist yet: any error or empty result yields [] and the pages
// show their empty state. No sample data and no Live/Sample note for these.

interface SponsorRow {
  id: string
  name: string
  tier: string
  blurb: string | null
  logo_url: string | null
  website: string | null
  perk_title: string | null
  perk_detail: string | null
  perk_code: string | null
  term_start: string | null
  term_end: string | null
  is_active: boolean | null
  sort_order: number | null
}

const SPONSOR_COLUMNS =
  'id,name,tier,blurb,logo_url,website,perk_title,perk_detail,perk_code,term_start,term_end,is_active,sort_order'

// A date-only "YYYY-MM-DD" end means the whole of that day.
function endOf(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T23:59:59` : iso
}

function inTerm(start: string | null, end: string | null, now = Date.now()): boolean {
  if (start && new Date(start).getTime() > now) return false
  if (end && new Date(endOf(end)).getTime() < now) return false
  return true
}

function mapSponsor(r: SponsorRow): Sponsor {
  const tier = (SPONSOR_TIERS as readonly string[]).includes(r.tier) ? (r.tier as SponsorTier) : 'friend'
  return {
    id: r.id,
    name: r.name,
    tier,
    blurb: r.blurb,
    logoUrl: r.logo_url,
    website: r.website,
    perkTitle: r.perk_title,
    perkDetail: r.perk_detail,
    perkCode: r.perk_code,
    termStart: r.term_start,
    termEnd: r.term_end,
    sortOrder: r.sort_order ?? 0,
  }
}

// RLS already limits the public read to active, unexpired rows; this is a belt-and-braces
// client-side check so a stale row never shows.
function liveSponsors(rows: SponsorRow[]): Sponsor[] {
  return rows
    .filter((r) => r.is_active !== false && inTerm(r.term_start, r.term_end))
    .map(mapSponsor)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

// All current sponsors (null while loading, [] when none or the table is absent).
export function useSponsors(): Sponsor[] | null {
  const [items, setItems] = useState<Sponsor[] | null>(null)
  useEffect(() => {
    if (!isConfigured) {
      setItems([])
      return
    }
    let active = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('sponsors')
          .select(SPONSOR_COLUMNS)
          .order('sort_order', { ascending: true })
        if (active) setItems(error ? [] : liveSponsors((data ?? []) as SponsorRow[]))
      } catch {
        if (active) setItems([])
      }
    })()
    return () => {
      active = false
    }
  }, [])
  return items
}

interface PlacementRow {
  id: string
  sponsor_id: string
  starts_at: string | null
  ends_at: string | null
  is_active: boolean | null
}

// Sponsors placed on one surface (e.g. 'bunfest'): the active placements for that
// surface, joined client-side to their sponsors. null while loading, [] when none.
export function usePlacements(surface: PlacementSurface): Sponsor[] | null {
  const [items, setItems] = useState<Sponsor[] | null>(null)
  useEffect(() => {
    if (!isConfigured) {
      setItems([])
      return
    }
    let active = true
    ;(async () => {
      try {
        const p = await supabase
          .from('sponsor_placements')
          .select('id,sponsor_id,starts_at,ends_at,is_active')
          .eq('surface', surface)
        const placements = p.error ? [] : ((p.data ?? []) as PlacementRow[])
        const ids = Array.from(
          new Set(
            placements.filter((r) => r.is_active !== false && inTerm(r.starts_at, r.ends_at)).map((r) => r.sponsor_id),
          ),
        )
        if (ids.length === 0) {
          if (active) setItems([])
          return
        }
        const s = await supabase.from('sponsors').select(SPONSOR_COLUMNS).in('id', ids)
        if (active) setItems(s.error ? [] : liveSponsors((s.data ?? []) as SponsorRow[]))
      } catch {
        if (active) setItems([])
      }
    })()
    return () => {
      active = false
    }
  }, [surface])
  return items
}
