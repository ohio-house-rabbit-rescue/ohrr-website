// /bunfest/silent-auction — the Midwest BunFest silent auction catalog, now
// with online bidding (update 35): each card shows the running bid and links
// to its own page, where people bid or Buy Now. Until update 35 has been run
// on the database the page falls back to the plain raffle_items read and is a
// preview, exactly as before. Raffle prizes (Scan an item) stay at the bottom.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRafflePrizes } from '../lib/data'
import type { RafflePrize } from '../lib/types'
import { PageHero, Section, btn, Card, Callout, PrintButton } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { formatPrice } from '../lib/format'
import { bidLine, closesIn, money, recallBidder, type AuctionItem } from '../lib/auctionClient'
import { itemPath, shipLine, useCatalog, useDocTitle, useServerNow } from '../lib/auctionSite'
import { BidderBar, Chip, ItemPhoto, SessionChip, SoldChip } from '../components/AuctionBits'

const EVENT_SLUG = 'midwest-bunfest-2026'

type SessionFilter = 'all' | 'morning' | 'afternoon'

const chip = (active: boolean) =>
  `inline-flex min-h-11 items-center rounded-full px-4 py-2 text-base font-bold transition ${
    active ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
  }`

function ItemCard({ item, now, preview }: { item: AuctionItem; now: string; preview: boolean }) {
  const won = item.status === 'won'
  return (
    <Link
      to={itemPath(item.id)}
      className={`block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md ${won ? 'opacity-80' : ''}`}
    >
      <ItemPhoto item={item} />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-extrabold text-ink">{item.title}</h3>
          <SessionChip session={item.session} />
          <SoldChip item={item} />
        </div>
        {item.donated_by && <p className="mt-0.5 text-base font-semibold text-slate-600">Donated by {item.donated_by}</p>}
        {/* Before update 35 there is no bidding data: value only */}
        {!preview && <p className="mt-2 text-base font-bold text-ink">{bidLine(item)}</p>}
        <p className="mt-0.5 text-base text-slate-600">
          {typeof item.value_cents === 'number' && <>Value {money(item.value_cents)}</>}
          {!preview && <>{typeof item.value_cents === 'number' ? ' · ' : ''}{shipLine(item)}</>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!won && item.buy_now_cents != null && <Chip tone="orange">Buy now {money(item.buy_now_cents)}</Chip>}
          {item.is_open && item.closes_at && <Chip tone="green">{closesIn(item.closes_at, now)}</Chip>}
        </div>
        <span className="mt-3 inline-block text-base font-bold text-brand-blue">{won ? 'See the item →' : item.is_open ? 'Bid on this →' : 'Details →'}</span>
      </div>
    </Link>
  )
}

function PrizeCard({ prize }: { prize: RafflePrize }) {
  const drawn = prize.status === 'drawn'
  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${drawn ? 'opacity-60' : ''}`}>
      <div className="aspect-square w-full bg-slate-100">
        {prize.photoUrl ? (
          <img src={prize.photoUrl} alt={prize.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl font-black text-slate-300">{prize.title.slice(0, 1)}</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-extrabold text-ink">{prize.title}</h3>
          {drawn && <Chip tone="slate">Drawn</Chip>}
        </div>
        {prize.donatedBy && <p className="mt-0.5 text-sm font-semibold text-slate-600">Donated by {prize.donatedBy}</p>}
        {typeof prize.valueCents === 'number' && <p className="mt-1 text-sm text-slate-600">Value: {formatPrice(prize.valueCents)}</p>}
        {prize.description && <p className="mt-1.5 text-sm text-slate-600">{prize.description}</p>}
      </div>
    </div>
  )
}

// The ticket-raffle prizes staff scanned in (published raffle_prizes). Renders
// nothing until there is at least one.
function RafflePrizes() {
  const prizes = useRafflePrizes(EVENT_SLUG)
  if (!prizes || prizes.length === 0) return null
  const left = prizes.filter((p) => p.status !== 'drawn').length
  return (
    <div className="mt-14">
      <h2 className="font-display text-2xl font-black text-ink">Raffle prizes</h2>
      <p className="mt-1 text-base text-slate-600">
        {left === prizes.length ? `${prizes.length} prize${prizes.length === 1 ? '' : 's'} to be drawn.` : `${left} of ${prizes.length} still to be drawn.`} Tickets are sold at the raffle table.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {prizes.map((p) => (
          <PrizeCard key={p.id} prize={p} />
        ))}
      </div>
    </div>
  )
}

export default function SilentAuction() {
  useDocTitle('Silent Auction')
  const { catalog, source } = useCatalog()
  const now = useServerNow(catalog?.now)
  const [session, setSession] = useState<SessionFilter>('all')
  const [availableOnly, setAvailableOnly] = useState(false)
  const remembered = recallBidder()

  const items = catalog?.items ?? null
  const intro = catalog?.settings?.intro_text?.trim() || null
  const note = catalog?.settings?.bidding_enabled ? catalog.settings.bidding_note?.trim() || null : null

  const list = (items ?? [])
    .filter((i) => session === 'all' || i.session === session || i.session === 'all-day')
    .filter((i) => !availableOnly || i.status !== 'won')
  // Available items first, then sold — keeping the staff's sort order within each group.
  const ordered = [...list.filter((i) => i.status !== 'won'), ...list.filter((i) => i.status === 'won')]
  const bidding = Boolean(catalog?.settings?.bidding_enabled)

  return (
    <>
      <PageHero
        title="Silent Auction"
        parent={{ to: '/bunfest', label: 'Midwest BunFest' }}
        subtitle={
          bidding
            ? 'Bid online on the items up for silent auction at Midwest BunFest 2026, or Buy Now where a price is shown.'
            : 'A preview of the items that will be up for silent auction at Midwest BunFest 2026.'
        }
      />
      <PresentedBy surface="silent-auction" />
      <Section>
        <div className="no-print mb-6">
          <BidderBar catalog={catalog} remembered={remembered} />
        </div>

        {(intro || note) && (
          <Callout className="mb-8 space-y-3">
            {intro && <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{intro}</p>}
            {note && <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{note}</p>}
          </Callout>
        )}

        {items === null ? (
          <p className="text-base text-slate-600">Loading…</p>
        ) : items.length === 0 ? (
          <Card className="text-center">
            <p className="font-display text-lg font-extrabold text-brand-blue">Auction items will be posted here as BunFest gets closer.</p>
            <Link to="/bunfest" className={`${btn.blue} mt-4`}>
              About Midwest BunFest
            </Link>
          </Card>
        ) : (
          <>
            <div className="no-print flex flex-wrap items-center gap-2">
              {(
                [
                  ['all', 'All'],
                  ['morning', 'Morning'],
                  ['afternoon', 'Afternoon'],
                ] as [SessionFilter, string][]
              ).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setSession(key)} className={chip(session === key)} aria-pressed={session === key}>
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => setAvailableOnly((v) => !v)} className={`${chip(availableOnly)} ml-auto`} aria-pressed={availableOnly}>
                Available only
              </button>
            </div>
            {ordered.length === 0 ? (
              <p className="mt-6 text-base text-slate-600">No items match that filter.</p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ordered.map((i) => (
                  <ItemCard key={i.id} item={i} now={now} preview={source === 'preview'} />
                ))}
              </div>
            )}
          </>
        )}

        <RafflePrizes />

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link to="/bunfest" className="text-base font-bold text-brand-blue hover:text-brand-blue-dark">
            ← Midwest BunFest
          </Link>
          <PrintButton label="Print the list" />
        </div>
      </Section>
    </>
  )
}
