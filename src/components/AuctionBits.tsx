// Small pieces the silent-auction pages share: the item photo (real photos
// only; a neutral block with the item's initial otherwise), chips, the public
// form field style (44 px tall, 16 px text, label above) and the bar at the
// top of the catalog that says whether this person is registered.
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { btn } from './ui'
import { money, sessionLabel, type AuctionItem, type Catalog, type RememberedBidder } from '../lib/auctionClient'
import { MY_BIDS_PATH, REGISTER_PATH, biddingOffered } from '../lib/auctionSite'

export function ItemPhoto({ item, className = 'aspect-[4/3]' }: { item: Pick<AuctionItem, 'title' | 'photo_url'>; className?: string }) {
  return (
    <div className={`w-full overflow-hidden bg-slate-100 ${className}`}>
      {item.photo_url ? (
        <img src={item.photo_url} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-4xl font-black text-slate-300" role="img" aria-label={`${item.title} (no photo yet)`}>
          {item.title.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}
    </div>
  )
}

export function Chip({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'orange' | 'slate' | 'green' | 'red' }) {
  const t = {
    blue: 'bg-brand-blue-50 text-brand-blue',
    orange: 'bg-brand-orange-50 text-brand-orange-ink',
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-800',
    red: 'bg-red-50 text-red-700',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold ${t}`}>{children}</span>
}

export function SessionChip({ session }: { session: AuctionItem['session'] }) {
  return <Chip>{sessionLabel(session)}</Chip>
}

/** "Sold" / "Sold for $80" on a won item. */
export function SoldChip({ item }: { item: AuctionItem }) {
  if (item.status !== 'won') return null
  return <Chip tone="slate">{item.won_kind === 'buy_now' && item.current_bid_cents != null ? `Sold for ${money(item.current_bid_cents)}` : 'Sold'}</Chip>
}

// Public form inputs: 44 px tall, 16 px text, dark on white.
export const field =
  'mt-1 block w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-base font-semibold text-slate-700">
      {label}
      {hint && <span className="ml-1 font-normal text-slate-600">({hint})</span>}
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${field} ${props.className ?? ''}`} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${field} ${props.className ?? ''}`} />
}

export function ErrorText({ children }: { children?: ReactNode }) {
  return children ? (
    <p role="alert" className="text-base font-semibold text-red-700">
      {children}
    </p>
  ) : null
}

/**
 * Where this person stands, at the top of the catalog and the item page:
 * registered (their number and a way to their bids), able to register, or
 * bidding not open yet.
 */
export function BidderBar({ catalog, remembered, next }: { catalog: Catalog | null; remembered: RememberedBidder | null; next?: string }) {
  if (remembered) {
    return (
      <p className="text-base text-slate-700">
        You’re registered as <strong className="text-ink">Bidder #{remembered.bidder_no}</strong>
        {remembered.name ? ` (${remembered.name})` : ''}.{' '}
        <Link to={MY_BIDS_PATH} className="font-bold text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
          Your bids
        </Link>
      </p>
    )
  }
  if (biddingOffered(catalog)) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link to={next ? `${REGISTER_PATH}?next=${encodeURIComponent(next)}` : REGISTER_PATH} className={btn.orange}>
          Register to bid
        </Link>
        <p className="text-base text-slate-700">Takes a minute: your name, email and a card that is only charged if you win.</p>
      </div>
    )
  }
  return <p className="text-base text-slate-600">Bidding opens online before BunFest; on the day, see the auction table.</p>
}
