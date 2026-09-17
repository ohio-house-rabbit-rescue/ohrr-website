import type { HeroSlide } from '../lib/types'

// Fallback for the home-page hero and featured strip, used until OHRR manages
// them in Staff → Homepage features (shared `hero_slides` table, which also drives
// the app's home screen). Photos are the site's own; no hotlinked images.
export const sampleHeroSlides: HeroSlide[] = [
  {
    id: 's-hero-bunfest',
    placement: 'hero',
    sortOrder: 100,
    headline: 'Midwest BunFest 2026 — Binky On!',
    subline:
      'Sunday, October 25, 2026, 10am – 4pm at The Makoy in Hilliard. Sponsors, rescue partners & vendors, a silent auction, raffle, the Hop Shop, bunny spa, glamour shots, the Chillaxabun Lounge and educational sessions all day.',
    imageUrl: '/img/bunfest-2025-logo.jpg',
    imageFit: 'contain',
    ctaLabel: 'About Midwest BunFest',
    ctaUrl: '/bunfest',
    countdownTo: '2026-10-25T00:00:00-04:00',
  },
  {
    id: 's-hero-adopt',
    placement: 'hero',
    sortOrder: 90,
    headline: 'Every bunny deserves a home.',
    subline:
      'We rescue abandoned pet rabbits, run a robust adoption program, and teach the proper care of rabbits as indoor companions — so more bunnies find loving homes.',
    imageUrl: '/img/bunny-lop-caramel.jpg',
    ctaLabel: 'Meet adoptable rabbits',
    ctaUrl: '/adopt',
  },
  {
    id: 's-feat-auction',
    placement: 'featured',
    sortOrder: 100,
    headline: 'Silent auction preview',
    subline: 'Preview the items that will be up for silent auction at Midwest BunFest 2026.',
    imageUrl: '/img/bunny-spotted.jpg',
    ctaLabel: 'See the items',
    ctaUrl: '/bunfest/silent-auction',
  },
  {
    id: 's-feat-adopt',
    placement: 'featured',
    sortOrder: 90,
    headline: 'Adoptable rabbits',
    subline: 'Meet the rabbits looking for homes. Adoptions are by appointment on Saturdays and Sundays.',
    imageUrl: '/img/bunny-lionhead-white.jpg',
    ctaLabel: 'See the rabbits',
    ctaUrl: '/adopt',
  },
  {
    id: 's-feat-events',
    placement: 'featured',
    sortOrder: 80,
    headline: 'Upcoming events',
    subline: 'OHRR hoppenings — Midwest BunFest and more.',
    imageUrl: '/img/bunny-grey-lop.jpg',
    ctaLabel: 'See events',
    ctaUrl: '/events',
  },
  {
    id: 's-feat-give',
    placement: 'featured',
    sortOrder: 70,
    headline: 'Ways to give',
    subline: 'Donate, workplace matching, Kroger rewards, the wish list, merch and the license plate.',
    imageUrl: '/img/bunny-silver.jpg',
    ctaLabel: 'Support the bunnies',
    ctaUrl: '/give',
  },
]
