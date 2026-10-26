// Which auction a page is showing (update 45): BunFest's Silent Auction at
// /bunfest/silent-auction, or the OHRR Online Auction at /auction — the same
// pages, told apart by this. The website's copy of the app's
// src/features/auction/event.tsx.
import { createContext, useContext, type ReactNode } from 'react'
import { AUCTION_EVENT, ONLINE_AUCTION_EVENT } from './auctionClient'
import { ONLINE_AUCTION_FLAG, SILENT_AUCTION_FLAG } from './settings'

export interface AuctionEvent {
  slug: string
  /** The online auction: one closing time, no sessions, no auction table. */
  online: boolean
  /** Where its pages live: base, base/register, base/me, base/:id. */
  base: string
  name: string
  subtitle: string
  home: { to: string; label: string }
  /** Its switch in Staff → Features. */
  flag: string
}

export const BUNFEST_AUCTION: AuctionEvent = {
  slug: AUCTION_EVENT,
  online: false,
  base: '/bunfest/silent-auction',
  name: 'Silent Auction',
  subtitle: 'Midwest BunFest 2026',
  home: { to: '/bunfest', label: 'Midwest BunFest' },
  flag: SILENT_AUCTION_FLAG,
}

export const ONLINE_AUCTION: AuctionEvent = {
  slug: ONLINE_AUCTION_EVENT,
  online: true,
  base: '/auction',
  name: 'Online Auction',
  subtitle: 'Ohio House Rabbit Rescue',
  home: { to: '/give', label: 'Ways to give' },
  flag: ONLINE_AUCTION_FLAG,
}

export const AUCTION_EVENTS = [BUNFEST_AUCTION, ONLINE_AUCTION]

export function auctionEventFor(slug: string | null | undefined): AuctionEvent {
  return AUCTION_EVENTS.find((e) => e.slug === slug) ?? BUNFEST_AUCTION
}

const Ctx = createContext<AuctionEvent>(BUNFEST_AUCTION)

export function AuctionEventProvider({ value, children }: { value: AuctionEvent; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** The auction this page is in (BunFest unless a provider says otherwise). */
export function useAuctionEvent(): AuctionEvent {
  return useContext(Ctx)
}

/** Its page paths. */
export function useAuctionPaths() {
  const ev = useAuctionEvent()
  return {
    catalog: ev.base,
    register: `${ev.base}/register`,
    me: `${ev.base}/me`,
    item: (id: string) => `${ev.base}/${id}`,
  }
}
