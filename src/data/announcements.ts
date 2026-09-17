import type { Announcement } from '../lib/types'

// Used ONLY when the shared `announcements` table is empty or unreachable.
// These are the news posts on the current OHRR home page (captured 2026-09-17),
// with their published dates from the live site. Each image is that post's own
// featured artwork, downloaded from ohiohouserabbitrescue.org and bundled under
// public/img/news/ (never hotlinked); 'contain' keeps logos/artwork uncropped.
export const sampleAnnouncements: Announcement[] = [
  {
    id: 's-bunfest',
    title: 'Midwest BunFest is Sunday, October 25th!',
    body: 'Mark your calendars! Sunday, October 25, 2026, 10am – 4pm at The Makoy, 5462 Center St., Hilliard, OH 43026. Sponsors, rescue partners & vendors, a silent auction, raffle, the OHRR Hop Shop, bunny spa, bunny glamour shots, the Chillaxabun Lounge, and educational sessions all day. This year\'s theme: "Binky On!"',
    createdAt: '2026-08-27T06:04:03+00:00',
    url: 'https://ohiohouserabbitrescue.org/midwest-bunfest-is-sunday-october-25th-2026/',
    imageUrl: '/img/bunfest-2026-logo.png',
    imageFit: 'contain',
  },
  {
    id: 's-beach',
    title: 'Beach Bunny Vibes – New OHRR Merch Fundraiser!',
    body: 'New in our Bonfire shirt store: Beach Bunny Vibes — a retro beach cruiser, a surfboard, and a cool bunny ready for a summer adventure. Proceeds help OHRR provide food, shelter, veterinary care, and daily support to rabbits waiting for their forever families.',
    createdAt: '2026-06-26T14:27:25+00:00',
    url: 'https://www.bonfire.com/beach-bunny-vibes/',
    imageUrl: '/img/news/beach-bunny-vibes.jpg',
    imageFit: 'contain',
  },
  {
    id: 's-kroger',
    title: 'Link OHRR to your Kroger Community Rewards',
    body: 'Link OHRR to your Kroger account and they will donate to us every time you shop. It takes less than a minute and each shopping trip automatically donates to our rescue rabbits at no cost to you. You\'ll see our name towards the bottom of your receipt.',
    createdAt: '2026-03-30T16:17:10+00:00',
    url: 'https://ohiohouserabbitrescue.org/link-ohrr-to-your-kroger-community-rewards/',
    imageUrl: '/img/news/kroger-community-rewards.jpg',
    imageFit: 'contain',
  },
  {
    id: 's-tshirt',
    title: 'New T-Shirt Fundraiser: They Still Talk About You',
    body: 'Our new shirt design honors the rabbits we\'ve loved and lost, reminding us that they are never forgotten. The campaign is lovingly dedicated to Joanne Allsop, a devoted OHRR volunteer and supporter. All proceeds support our adoption activities.',
    createdAt: '2026-01-30T15:45:45+00:00',
    url: 'https://www.bonfire.com/they-still-talk-about-you/',
    imageUrl: '/img/news/they-still-talk-about-you-shirt.png',
    imageFit: 'contain',
  },
  {
    id: 's-plate',
    title: 'Drive for the Bunnies – Get Your OHRR License Plate Today!',
    body: 'In 2023, we launched the official Ohio House Rabbit Rescue license plate featuring a Dutch rabbit. OHRR receives a portion of each sale, which supports the Adoption Center, medical costs, supplies, food, and more. Order online at bmv.ohio.gov (OPLATES) or in person at the BMV.',
    createdAt: '2025-06-16T17:50:57+00:00',
    url: 'https://ohiohouserabbitrescue.org/drive-for-the-bunnies-get-your-ohrr-license-plate-today/',
    imageUrl: '/img/news/license-plate-drive-for-the-bunnies.jpg',
    imageFit: 'cover',
  },
]
