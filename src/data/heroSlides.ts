import type { HeroSlide } from '../lib/types'
import type { IconName } from '../components/icons'

// Fallback for the home-page hero and featured strip, used until OHRR manages
// them in Staff → Homepage features (shared `hero_slides` table, which also drives
// the app's home screen). Photos are the site's own; no hotlinked images.
//
// Sponsor rule: a card that stands for a FUNCTION (events, ways to give, the auction)
// shows a fixed line icon so people see and remember its purpose. A photo is only for
// things that ARE content — real rabbits, auction items, artwork, the BunFest logo.
export const sampleHeroSlides: HeroSlide[] = [
  // "What's happening at OHRR" — the website home's picture cards: the posts on
  // the current OHRR home page, with their own artwork (bundled, never hotlinked).
  // The same five are seeded into the live table by update 23, where staff edit them.
  {
    id: 's-happening-bunfest',
    placement: 'happening',
    sortOrder: 50,
    headline: 'Midwest BunFest is Sunday, October 25th!',
    subline: 'Binky On! 10am – 4pm at The Makoy in Hilliard: rescues, vendors, a silent auction, raffle, bunny spa and educational sessions all day.',
    imageUrl: '/img/bunfest-2026-logo.png',
    ctaLabel: 'About BunFest',
    ctaUrl: '/bunfest',
    endsAt: '2026-10-25T23:59:00-04:00',
  },
  {
    id: 's-happening-beach',
    placement: 'happening',
    sortOrder: 40,
    headline: 'Beach Bunny Vibes – new OHRR merch',
    subline: 'A retro beach cruiser, a surfboard and a cool bunny. Proceeds help OHRR care for rabbits waiting for their forever families.',
    imageUrl: '/img/news/beach-bunny-vibes.jpg',
    ctaLabel: 'Shop the shirt',
    ctaUrl: 'https://www.bonfire.com/beach-bunny-vibes/',
  },
  {
    id: 's-happening-tshirt',
    placement: 'happening',
    sortOrder: 30,
    headline: 'They Still Talk About You',
    subline: 'A shirt that honors the rabbits we’ve loved and lost. All proceeds support OHRR’s adoption activities.',
    imageUrl: '/img/news/they-still-talk-about-you-shirt.png',
    ctaLabel: 'Shop the shirt',
    ctaUrl: 'https://www.bonfire.com/they-still-talk-about-you/',
  },
  {
    id: 's-happening-plate',
    placement: 'happening',
    sortOrder: 20,
    headline: 'Drive for the Bunnies',
    subline: 'The official OHRR license plate, with a Dutch rabbit. OHRR receives a portion of each sale.',
    imageUrl: '/img/news/license-plate-drive-for-the-bunnies.jpg',
    ctaLabel: 'About the plate',
    ctaUrl: '/info/license-plate',
  },
  {
    id: 's-happening-kroger',
    placement: 'happening',
    sortOrder: 10,
    headline: 'Link OHRR to your Kroger card',
    subline: 'Every shopping trip donates to the rescue rabbits, at no cost to you.',
    imageUrl: '/img/news/kroger-community-rewards.jpg',
    ctaLabel: 'Link your card',
    ctaUrl: '/info/kroger-rewards',
  },
  {
    id: 's-hero-bunfest',
    placement: 'hero',
    sortOrder: 100,
    headline: 'Midwest BunFest 2026 — Binky On!',
    subline:
      'Sunday, October 25, 2026, 10am – 4pm at The Makoy in Hilliard. Sponsors, rescue partners & vendors, a silent auction, raffle, the Hop Shop, bunny spa, glamour shots, the Chillaxabun Lounge and educational sessions all day.',
    imageUrl: '/img/bunfest-2026-logo.png',
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
    icon: 'award',
    ctaLabel: 'See the items',
    ctaUrl: '/bunfest/silent-auction',
  },
  {
    // Real rabbits are content, so this card keeps a photo.
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
    icon: 'calendar',
    ctaLabel: 'See events',
    ctaUrl: '/events',
  },
  {
    id: 's-feat-give',
    placement: 'featured',
    sortOrder: 70,
    headline: 'Ways to give',
    subline: 'Donate, workplace matching, Kroger rewards, the wish list, merch and the license plate.',
    icon: 'gift',
    ctaLabel: 'Support the bunnies',
    ctaUrl: '/give',
  },
]

// The real-rabbit photo for an adopt card that has no uploaded image.
export const ADOPT_PHOTO = '/img/bunny-lionhead-white.jpg'

// The standard icon for each link — the same meanings the OHRR app uses. Ordered so
// the longest matching route wins (/learn/vets → phone, any other /learn/… → book).
const ROUTE_ICONS: [route: string, icon: IconName][] = [
  ['/bunfest/silent-auction', 'award'],
  ['/bunfest', 'calendar'],
  ['/events', 'calendar'],
  ['/give', 'gift'],
  ['/volunteer', 'users'],
  ['/learn/vets', 'phone'],
  ['/learn', 'book'],
  ['/surrender', 'mappin'],
  ['/hop-shop', 'bag'],
  ['/news', 'sparkles'],
  ['/partners/perks', 'ticket'],
  ['/partners', 'star'],
  ['/contact', 'mail'],
  ['/about', 'info'],
  ['/app', 'device'],
  // Only where no rabbit photo is appropriate — see slideVisual().
  ['/adopt', 'heart'],
]

// The path of an internal link ('/events?x#y/' → '/events'); null for external URLs.
function routeOf(url: string | null | undefined): string | null {
  if (!url || /^https?:\/\//i.test(url)) return null
  return url.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
}

// The fixed icon for a slide: the seed's own `icon`, else the standard icon for its link.
export function slideIcon(slide: Pick<HeroSlide, 'icon' | 'ctaUrl'>): IconName | null {
  if (slide.icon) return slide.icon
  const path = routeOf(slide.ctaUrl)
  if (!path) return null
  const hit = ROUTE_ICONS.find(([route]) => path === route || path.startsWith(`${route}/`))
  return hit ? hit[1] : null
}

// Adopt cards are about real rabbits, so they get a rabbit photo rather than an icon.
export function isAdoptSlide(slide: Pick<HeroSlide, 'ctaUrl'>): boolean {
  const path = routeOf(slide.ctaUrl)
  return path === '/adopt' || path?.startsWith('/adopt/') === true
}

export type SlideVisualSpec = { image: string; fit: 'cover' | 'contain' } | { icon: IconName }

// What a slide shows in its picture slot, in order: an uploaded image (the staff
// choice always wins), a real-rabbit photo for adopt cards, otherwise its fixed icon.
export function slideVisual(
  slide: Pick<HeroSlide, 'imageUrl' | 'imageFit' | 'icon' | 'ctaUrl'>,
): SlideVisualSpec | null {
  if (slide.imageUrl) return { image: slide.imageUrl, fit: slide.imageFit === 'contain' ? 'contain' : 'cover' }
  if (isAdoptSlide(slide)) return { image: ADOPT_PHOTO, fit: 'cover' }
  const icon = slideIcon(slide)
  return icon ? { icon } : null
}
