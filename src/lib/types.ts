import type { IconName } from '../components/icons'

export interface Rabbit {
  id: string
  name: string
  status?: string | null
  sex?: string | null
  age?: string | null
  breed?: string | null
  size?: string | null
  bonded?: boolean
  description?: string | null
  photo?: string
  photos?: string[]
  spayedNeutered?: boolean
  houseTrained?: boolean
  /** Staff notes such as "Special needs" or "Adopted together with Pierce". */
  tags?: string[]
}

export interface Announcement {
  id: string
  title: string
  body: string
  createdAt?: string | null
  // Seed-only: a "read more" link on the current OHRR site.
  url?: string | null
  // Optional photo or artwork: Supabase `image_url` (staff upload) or a bundled
  // /img/news/… file for the seed. Never hotlinked.
  imageUrl?: string | null
  // Seed-only: 'contain' for logo/artwork so it is never cropped; photos use 'cover'.
  imageFit?: 'cover' | 'contain' | null
}

export interface CareArticle {
  id: string
  slug: string
  title: string
  icon: string
  summary: string
  /** 'care' (Learn) | 'give' | 'about' | 'adopt' — pages other than Learn live at /info/<slug> */
  section?: 'care' | 'give' | 'about' | 'adopt' | 'volunteer'
  body?: string | null
  tip?: string | null
  // Seed-only: articles the live site hosts elsewhere (we link, not copy).
  externalUrl?: string | null
  externalSource?: string | null
  // Seed-only: where the adapted text came from on ohiohouserabbitrescue.org.
  sourceUrl?: string | null
}

export interface VolunteerOpp {
  id: string
  category: string
  title: string
  detail?: string | null
  when_text?: string | null
  where_text?: string | null
  spots?: string | null
  /** Limited by a number of people, a number of hours, or not at all. */
  limit_kind?: 'none' | 'people' | 'hours'
  limit_people?: number | null
  limit_hours?: number | null
  filled_people?: number | null
  filled_hours?: number | null
  contact_email?: string | null
}

// Shared with the OHRR app (Supabase `events`).
export interface EventItem {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt?: string | null
  venue?: string | null
  address?: string | null
  city?: string | null
  summary?: string | null
  body?: string | null
  theme?: string | null
  url?: string | null
  /** Admission, parking, the rabbit rule, links — edited per year in Staff → BunFest. */
  info?: Record<string, unknown> | null
}

// Shared with the OHRR app (Supabase `vets`).
export interface Vet {
  id: string
  name: string
  doctors?: string | null
  address?: string | null
  city?: string | null
  region: string
  phone?: string | null
  phone2?: string | null
  email?: string | null
  website?: string | null
  notes?: string | null
  isEmergency: boolean
  isLowCostSpay: boolean
  /** Gives the RHDV2 vaccine — BunFest's rabbit rule points people to these. */
  givesRhdv2?: boolean
  rhdv2Note?: string | null
}

export interface HopShopProduct {
  id: string
  name: string
  description?: string | null
  price_cents: number
  photo_url?: string | null
  in_stock?: boolean
}

// Ticket-raffle prizes (Supabase `raffle_prizes`, scanned in by staff in the app).
export interface RafflePrize {
  id: string
  title: string
  description?: string | null
  donatedBy?: string | null
  valueCents?: number | null
  photoUrl?: string | null
  status: 'available' | 'drawn' | string
}

// Shared with the OHRR app (Supabase `hero_slides`) — the home-page hero and featured strip.
export interface HeroSlide {
  id: string
  placement: 'hero' | 'featured'
  headline: string
  subline?: string | null
  imageUrl?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  startsAt?: string | null
  endsAt?: string | null
  sortOrder: number
  // Seed-only: a date to count down to (days), shown as a badge on the slide.
  countdownTo?: string | null
  // Seed-only: 'contain' for logo artwork so it is never cropped.
  imageFit?: 'cover' | 'contain' | null
  // Seed-only: the fixed line icon shown in place of a photo on function cards
  // (events, ways to give, …). Resolved by slideIcon() in data/heroSlides.ts.
  icon?: IconName | null
}

// Shared with the OHRR app (Supabase `raffle_items`) — the Midwest BunFest silent auction.
export interface RaffleItem {
  id: string
  title: string
  description?: string | null
  donatedBy?: string | null
  valueCents?: number | null
  photoUrl?: string | null
  session: 'morning' | 'afternoon' | 'all-day' | string
  status: 'available' | 'won' | string
}

// ---- Sponsors & placements (shared with the OHRR app; read-only on the site) ----

export type SponsorTier = 'presenting' | 'program' | 'community' | 'friend'

export type PlacementSurface =
  | 'home'
  | 'bunfest'
  | 'silent-auction'
  | 'events'
  | 'care-library'
  | 'find-a-vet'
  | 'happy-tails'
  | 'volunteer'
  | 'hop-shop'
  | 'my-bunny'

// Shared with the OHRR app (Supabase `sponsors`).
export interface Sponsor {
  id: string
  name: string
  tier: SponsorTier
  blurb?: string | null
  logoUrl?: string | null
  website?: string | null
  perkTitle?: string | null
  perkDetail?: string | null
  perkCode?: string | null
  termStart?: string | null
  termEnd?: string | null
  sortOrder: number
}
