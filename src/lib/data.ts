import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'
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
      let q = supabase
        .from('announcements')
        .select('id,title,body,created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (limit > 0) q = q.limit(limit)
      const { data, error } = await q
      const rows = (data ?? []) as AnnouncementRow[]
      if (error || rows.length === 0) return fallback()
      if (active) {
        setItems(rows.map((r) => ({ id: r.id, title: r.title, body: r.body, createdAt: r.created_at })))
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
          .select('id,slug,title,icon,summary,body,tip')
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
        if (!error && active && rows.length > 0) {
          setSlides(
            rows.map((r) => ({
              id: r.id,
              placement: r.placement === 'featured' ? 'featured' : 'hero',
              headline: r.headline,
              subline: r.subline,
              imageUrl: r.image_url,
              ctaLabel: r.cta_label,
              ctaUrl: r.cta_url,
              startsAt: r.starts_at,
              endsAt: r.ends_at,
              sortOrder: r.sort_order,
            })),
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
