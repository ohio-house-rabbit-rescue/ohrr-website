// Every staff page, the group it belongs to and who may open it — the one
// list the dashboard, the group pages (/staff/g/:group) and the staff menu all
// read. The website's copy of the app's src/features/staff/staffTiles.ts:
// same groups, titles and hints wherever the website has the same page.
//
// OHRR, 2026-10-01: "too many in the list and you have to scroll a long way …
// bin these into groups and simplify the look and feel." So the dashboard is a
// short "Today" row (Inbox, Bookings) and eight groups; each group opens a
// short list. Adding a page later = one line in the list below.
//
// Each `show` is the same permission check the old dashboard and menu used.
// The website has no Counter or Scan page (those are the app's), so its Today
// row is the Inbox and Bookings.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, errMessage } from './supabase'
import { useStaff, canSwitchFeatures } from './staff'
import { myStaffVolunteerPage } from './volunteers/api'
import type { IconName } from '../components/icons'

export type GroupKey = 'items' | 'rabbits' | 'volunteers' | 'events' | 'word' | 'giving' | 'admin' | 'me'

export interface StaffGroup {
  key: GroupKey
  title: string
  /** Three to five words under the group's name. */
  hint: string
  icon: IconName
}

export const GROUPS: StaffGroup[] = [
  { key: 'items', title: 'Items and Hop Shop', hint: 'Donations, inventory, labels', icon: 'box' },
  { key: 'rabbits', title: 'Rabbits and care', hint: 'Adoptions, guides, vets', icon: 'heart' },
  { key: 'volunteers', title: 'Volunteers', hint: 'Calls, roster, shifts', icon: 'users' },
  { key: 'events', title: 'Events and BunFest', hint: 'Auction, raffle, sponsors', icon: 'ticket' },
  { key: 'word', title: 'Getting the word out', hint: 'Posts, flyers, notices', icon: 'sparkles' },
  { key: 'giving', title: 'Supporters and giving', hint: 'Email list, wish list', icon: 'gift' },
  { key: 'admin', title: 'Admin', hint: 'Team, features, details', icon: 'settings' },
  { key: 'me', title: 'Me', hint: 'Your account, your hours', icon: 'user' },
]

export interface StaffTile {
  /** The page. For a button (My volunteer hours) a key only — it has `onClick`. */
  to: string
  title: string
  /** One short line under the title. */
  hint: string
  icon: IconName
  /** Its group; the Inbox has none (it lives in the Today row). */
  group?: GroupKey
  /** Also in the Today row at the top of the dashboard (and the menu). */
  today?: boolean
  /** Something waiting (new requests, bookings to confirm, posts ready). */
  badge?: number
  /** A button rather than a page: it does something, then goes somewhere. */
  onClick?: () => void
  busy?: boolean
  error?: string | null
}

export type GroupWithTiles = StaffGroup & { tiles: StaffTile[]; badge: number }

export interface StaffTiles {
  /** Every page this person may open, in group order. */
  tiles: StaffTile[]
  today: StaffTile[]
  /** The groups this person has at least one page in, with their pages. */
  groups: GroupWithTiles[]
  /** No tasks switched on yet (only "Me"). */
  nothingYet: boolean
  isAdminish: boolean
}

/** Where a group's tile (or menu line) goes: one page opens straight away, more open the group. */
export const groupLink = (g: GroupWithTiles): string => (g.tiles.length === 1 && !g.tiles[0].onClick ? g.tiles[0].to : `/staff/g/${g.key}`)

/** The waiting counts cost a database call each, so only the dashboard and the group pages ask for them. */
export function useStaffTiles({ counts = false }: { counts?: boolean } = {}): StaffTiles {
  const { membership, can } = useStaff()
  const myHours = useMyVolunteerHours()
  const orgId = membership?.orgId ?? null
  const newCount = useCount('count_new_requests', counts && orgId && can('inbox.manage') ? orgId : null)
  const pendingCount = useCount('count_pending_bookings', counts && orgId && can('bookings.manage') ? orgId : null)
  const readyPosts = useCount('count_ready_posts', counts && orgId && (can('announcements.post') || can('social.publish')) ? orgId : null)

  const isAdminish = membership?.role === 'owner' || membership?.role === 'admin'
  // Items, labels, drop-offs and the report: BunFest or any Hop Shop editing task (as before).
  const shop = can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')
  const canItems = can('events.bunfest.manage') || shop
  const canAdopt = can('adoptions.listings.create') || can('adoptions.listings.edit') || can('adoptions.status.change')
  const canCare = can('content.education.edit')
  const canVolunteer = can('volunteers.shifts.manage')
  const canBookings = can('bookings.manage')
  const canEvents = can('events.bunfest.manage')
  const canPost = can('announcements.post')

  const all: (StaffTile & { show: boolean })[] = [
    // Today (Bookings is also in Volunteers)
    { to: '/staff/inbox', title: 'Inbox', hint: newCount > 0 ? `${newCount} new waiting` : 'Appointments, sign-ups, messages', icon: 'mail', today: true, badge: newCount, show: can('inbox.manage') },
    { to: '/staff/bookings', title: 'Bookings', hint: pendingCount > 0 ? `${pendingCount} to confirm` : 'Shifts and appointments', icon: 'calendar', group: 'volunteers', today: true, badge: pendingCount, show: canBookings },

    // Items and Hop Shop
    { to: '/staff/items?add=1', title: 'Add a donation', hint: 'Photo, name, how many, value', icon: 'camera', group: 'items', show: canItems },
    { to: '/staff/items', title: 'Items', hint: 'Donations to sort, baskets, auction and raffle', icon: 'box', group: 'items', show: canItems },
    { to: '/staff/hopshop', title: 'Hop Shop inventory', hint: 'What the shop carries, stock, reorder', icon: 'store', group: 'items', show: shop || can('hopshop.orders.view') },
    { to: '/staff/dropoffs', title: 'Drop-offs and thank-yous', hint: 'Who gave what, the letter', icon: 'mail', group: 'items', show: canItems },
    { to: '/staff/donations/report', title: 'Monthly donations report', hint: 'Totals, by donor, a spreadsheet', icon: 'book', group: 'items', show: canItems },
    { to: '/staff/items/labels', title: 'Print labels', hint: 'Codes for items, any label size', icon: 'printer', group: 'items', show: canItems },

    // Rabbits and care
    { to: '/staff/rabbits', title: 'Adoptable rabbits', hint: 'Rabbits, photos, adoption status', icon: 'heart', group: 'rabbits', show: canAdopt },
    { to: '/staff/tails', title: 'Happy Tails', hint: 'Adopters’ stories', icon: 'sparkles', group: 'rabbits', show: canCare || can('inbox.manage') },
    { to: '/staff/care', title: 'Care guides and pages', hint: 'Rabbit Care articles, Give, Adopt, About', icon: 'book', group: 'rabbits', show: canCare },
    { to: '/staff/bunny-help', title: 'Bunny Help topics', hint: 'What “My bunny is…” answers', icon: 'help', group: 'rabbits', show: canCare },
    { to: '/staff/vets', title: 'Vet directory', hint: 'Rabbit-savvy vets in Find a vet', icon: 'vet', group: 'rabbits', show: canCare },

    // Volunteers
    { to: '/staff/calls', title: 'Volunteer calls', hint: 'Put out a need, check in, thank', icon: 'heart', group: 'volunteers', show: canVolunteer || canBookings },
    { to: '/staff/volunteers', title: 'Volunteers', hint: 'The roster and their hours', icon: 'users', group: 'volunteers', show: canVolunteer || canBookings },
    { to: '/staff/volunteer', title: 'Volunteer opportunities', hint: 'Shifts, transport runs, events', icon: 'calendar', group: 'volunteers', show: canVolunteer },

    // Events and BunFest
    { to: '/staff/events', title: 'Events', hint: 'BunFest and OHRR hoppenings', icon: 'calendar', group: 'events', show: canEvents },
    { to: '/staff/bunfest', title: 'BunFest content', hint: 'Schedule, floor, vendors, rescues', icon: 'star', group: 'events', show: canEvents },
    { to: '/staff/auction', title: 'Silent Auction', hint: 'Auction items, photos, won', icon: 'award', group: 'events', show: canEvents },
    { to: '/staff/auction/desk', title: 'Auction desk', hint: 'Close and charge, pickup, shipping', icon: 'gavel', group: 'events', show: canEvents },
    { to: '/staff/raffle-tickets', title: 'Raffle tickets', hint: 'The raffle table, draw winners', icon: 'ticket', group: 'events', show: canEvents },
    { to: '/staff/sponsors', title: 'Sponsors and partners', hint: 'Roster, perks, placements', icon: 'award', group: 'events', show: canEvents },
    { to: '/staff/sponsors/renewals', title: 'Sponsor renewals', hint: 'Who to ask next', icon: 'calendar', group: 'events', show: canEvents },

    // Getting the word out
    { to: '/staff/announcements', title: 'Announcements', hint: 'Notices on the home page and the app', icon: 'gift', group: 'word', show: canPost },
    { to: '/staff/homepage', title: 'Home page', hint: 'Slides and featured cards, here and in the app', icon: 'home', group: 'word', show: canPost },
    { to: '/staff/posts', title: 'Post queue', hint: readyPosts > 0 ? `${readyPosts} ready to post` : 'Posts to approve and release', icon: 'mail', group: 'word', badge: readyPosts, show: canPost || can('social.publish') || can('social.approve') },
    { to: '/staff/posts?view=kit', title: 'Share kit', hint: 'Posts for Instagram, Facebook, TikTok', icon: 'sparkles', group: 'word', show: canPost },
    { to: '/staff/flyers', title: 'Flyers', hint: 'QR posters to print or share', icon: 'printer', group: 'word', show: canPost },
    { to: '/staff/outreach', title: 'Outreach letters', hint: 'Emails to vets, stores, schools', icon: 'mail', group: 'word', show: canPost },
    { to: '/staff/notify', title: 'Send a notification', hint: 'To phones that asked for it', icon: 'device', group: 'word', show: can('notifications.send') },
    { to: '/staff/impact', title: 'Impact numbers', hint: 'The year in numbers', icon: 'star', group: 'word', show: canPost },

    // Supporters and giving
    { to: '/staff/supporters', title: 'Supporters', hint: 'The email list and interests', icon: 'mail', group: 'giving', show: can('supporters.view') },
    { to: '/staff/wish-list', title: 'Wish list items', hint: 'Amazon wish list buttons', icon: 'gift', group: 'giving', show: can('giving.wishlist') },
    { to: '/staff/guardians', title: 'Rescue Rabbit Guardians', hint: 'The Legacy Fund thank-you list', icon: 'heart', group: 'giving', show: can('giving.guardians') },

    // Admin
    { to: '/staff/team', title: 'Team', hint: 'Invite staff, who can do what', icon: 'users', group: 'admin', show: can('staff.invite') || can('staff.permissions.manage') },
    { to: '/staff/activity', title: 'Activity', hint: 'Who changed what, and when', icon: 'clock', group: 'admin', show: can('audit.view') },
    // Founders and Developers only (update 38)
    { to: '/staff/features', title: 'Features', hint: 'Show or hide whole features', icon: 'settings', group: 'admin', show: canSwitchFeatures(membership) },
    { to: '/staff/details', title: 'OHRR details', hint: 'Hours, a notice, email, address', icon: 'mappin', group: 'admin', show: can('settings.manage') },

    // Me
    { to: '/staff/account', title: 'My account', hint: 'Name, photo, level and access', icon: 'user', group: 'me', show: Boolean(membership) },
    {
      to: '#my-volunteer-hours',
      title: myHours.busy ? 'Opening…' : 'My volunteer hours',
      hint: 'Log time that isn’t a shift',
      icon: 'clock',
      group: 'me',
      show: myHours.available,
      onClick: () => void myHours.open(),
      busy: myHours.busy,
      error: myHours.error,
    },
  ]
  const tiles = all.filter((t) => t.show).map(({ show: _show, ...t }) => t)
  const groups = GROUPS.map((g) => {
    const list = tiles.filter((t) => t.group === g.key)
    return { ...g, tiles: list, badge: list.reduce((n, t) => n + (t.badge ?? 0), 0) }
  }).filter((g) => g.tiles.length > 0)
  return {
    tiles,
    today: tiles.filter((t) => t.today),
    groups,
    nothingYet: groups.every((g) => g.key === 'me'),
    isAdminish,
  }
}

/**
 * Where a page sits, for the menu: its group and its own title. The longest
 * match wins, so /staff/sponsors/renewals isn't labelled /staff/sponsors, and
 * a page's own sub-pages (/staff/dropoffs/:id) count as that page.
 */
export function placeOf(pathname: string, search: string, tiles: StaffTile[]): { group?: StaffGroup; tile?: StaffTile } {
  const path = pathname.replace(/\/+$/, '') || '/'
  const g = /^\/staff\/g\/([a-z]+)$/.exec(path)
  if (g) return { group: GROUPS.find((x) => x.key === g[1]) }
  const pages = tiles.filter((t) => !t.onClick)
  // A page reached with its own query (Share kit, Add a donation) first.
  const tile =
    (search && pages.find((t) => t.to === path + search)) ||
    pages
      .filter((t) => !t.to.includes('?') && (path === t.to || path.startsWith(`${t.to}/`)))
      .sort((a, b) => b.to.length - a.to.length)[0]
  return { tile, group: tile?.group ? GROUPS.find((x) => x.key === tile.group) : undefined }
}

/** A waiting count from one of the count_* functions; 0 while loading, without access, or on any error. */
function useCount(fn: 'count_new_requests' | 'count_pending_bookings' | 'count_ready_posts', orgId: string | null): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!orgId) return
    let alive = true
    supabase
      .rpc(fn, { p_org: orgId })
      .then(({ data }) => {
        if (alive && typeof data === 'number') setN(data)
      })
      .then(undefined, () => undefined)
    return () => {
      alive = false
    }
  }, [fn, orgId])
  return n
}

/**
 * "My volunteer hours" (update 28): staff volunteer too. This opens their own
 * volunteer page — made for them the first time — where they can log hours for
 * work that isn't a shift and see their totals and signed letter. `available`
 * is false until update 28 has been run (the level column arrives with the RPC).
 */
export function useMyVolunteerHours() {
  const { membership } = useStaff()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const orgId = membership?.orgId ?? ''
  const available = Boolean(orgId && membership?.level) && !missing

  const open = async () => {
    if (!orgId || busy) return
    setBusy(true)
    setError(null)
    try {
      const token = await myStaffVolunteerPage(orgId)
      navigate(`/volunteer/hours/${token}`)
    } catch (e) {
      const o = e as { code?: string; message?: string }
      // The function isn't in the database after all: hide the way in rather than show an error.
      if (o?.code === 'PGRST202' || /could not find the function/i.test(o?.message ?? '')) setMissing(true)
      else setError(errMessage(e))
      setBusy(false)
    }
  }
  return { available, open, busy, error }
}
