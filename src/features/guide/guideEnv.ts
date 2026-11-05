// What the guided start needs from the website around it — the one file of the guide that differs between the
// app and the website (the app's copy is src/features/guide/guideEnv.ts there). Everything else in this
// folder is identical in both.
import { supabase } from '../../lib/supabase'
import { useStaff } from '../../lib/staff'
import { APP_URL } from '../../lib/constants'
import type { RouteKey } from './walkthrough'

export { supabase }

/** Who is looking: the signed-in person and their place on the team. */
export function useGuideWho(): { ready: boolean; userId: string | null; orgId: string | null; membershipId: string | null } {
  const { loading, user, membership } = useStaff()
  return { ready: !loading, userId: user?.id ?? null, orgId: membership?.orgId ?? null, membershipId: membership?.id ?? null }
}

/**
 * Each route key: where it goes, the staff-menu entry that says this person may open it (`match`, compared with
 * the tiles in lib/staffTiles.ts), and the page's real title. Here "My volunteer hours" is a button in the Me
 * group (it opens the volunteer page), so its link goes to that group.
 */
export const GUIDE_ROUTES: Record<RouteKey, { to: string; match: string; title: string }> = {
  account: { to: '/staff/account', match: '/staff/account', title: 'My account' },
  'my-hours': { to: '/staff/g/me', match: '#my-volunteer-hours', title: 'My volunteer hours' },
  announcements: { to: '/staff/announcements', match: '/staff/announcements', title: 'Announcements' },
  'post-queue': { to: '/staff/posts', match: '/staff/posts', title: 'Posts' },
  inbox: { to: '/staff/inbox', match: '/staff/inbox', title: 'Inbox' },
  bookings: { to: '/staff/bookings', match: '/staff/bookings', title: 'Bookings' },
  calls: { to: '/staff/calls', match: '/staff/calls', title: 'Volunteer calls' },
  rabbits: { to: '/staff/rabbits', match: '/staff/rabbits', title: 'Adoptable rabbits' },
  // The public Adopt page: always open (no menu entry needed).
  'adopt-page': { to: '/adopt', match: '', title: 'Adopt a rabbit' },
  tails: { to: '/staff/tails', match: '/staff/tails', title: 'Happy Tails' },
  scan: { to: '/staff/scan', match: '/staff/scan', title: 'Scan an item' },
  items: { to: '/staff/items', match: '/staff/items', title: 'Items' },
  hopshop: { to: '/staff/hopshop', match: '/staff/hopshop', title: 'Hop Shop inventory' },
  // Here the shelf list is the Items tab of that one page, and the reorder list is its Reorder tab.
  shelf: { to: '/staff/hopshop', match: '/staff/hopshop', title: 'Hop Shop inventory' },
  reorder: { to: '/staff/hopshop/reorder', match: '/staff/hopshop', title: 'Hop Shop inventory' },
  deliveries: { to: '/staff/hopshop/deliveries', match: '/staff/hopshop', title: 'Deliveries' },
}

/** Where the Welcome page's "I have my invitation" goes: the app's join screen (an invite link carries its code; this one opens on Create account and comes back to the join screen). */
export const JOIN = { href: `${APP_URL}/account?next=${encodeURIComponent('/staff/join')}&create=1`, external: true }

/** Where "I already have an account" goes: this site's staff sign-in. */
export const SIGN_IN = { href: '/staff', external: false }

/** The Welcome page's picture: a real OHRR photo already bundled with the site. */
export const WELCOME_PHOTO = '/img/ohrr/adoption-rescued-favorite-breed.jpg'

/** Pictures for the Done screens: the credited sample bunnies. */
export const DONE_PHOTOS = [
  '/img/bunny-lionhead-white.jpg',
  '/img/bunny-lop-caramel.jpg',
  '/img/bunny-silver.jpg',
  '/img/bunny-spotted.jpg',
  '/img/bunny-grey-lop.jpg',
  '/img/bunny-lop-orange.jpg',
  '/img/bunny-brown.jpg',
  '/img/bunny-grey-dwarf.jpg',
]

/** The padding classes of a guide page inside the staff area (its shell pads), and of the Welcome page outside it. */
export const PAGE_CLASS = 'space-y-5'
export const PUBLIC_PAGE_CLASS = 'mx-auto max-w-2xl space-y-5 px-5 py-8'

/** Staff pages on this site. */
export const TRAIL_PATH = '/staff/guide'
export const MONEY_PATH = '/staff/guide/money'
export const LEVEL_PATH = (key: string) => `/staff/guide/${key}`
