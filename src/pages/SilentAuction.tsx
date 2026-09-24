import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRaffleItems, useRafflePrizes } from '../lib/data'
import type { RaffleItem, RafflePrize } from '../lib/types'
import { PageHero, Section, btn, Card, Callout } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { formatPrice } from '../lib/format'

const EVENT_SLUG = 'midwest-bunfest-2026'

const SESSION_LABEL: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  'all-day': 'All day',
}

type SessionFilter = 'all' | 'morning' | 'afternoon'

const chip = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-bold transition ${
    active ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
  }`

function ItemCard({ item }: { item: RaffleItem }) {
  const [open, setOpen] = useState(false)
  const won = item.status === 'won'
  const session = SESSION_LABEL[item.session]
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="aspect-[4/3] w-full bg-slate-100">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl font-black text-slate-300">
            {item.title.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-extrabold text-ink">{item.title}</h3>
          {session && (
            <span className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-bold text-brand-blue">
              {session}
            </span>
          )}
          {won && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Won</span>
          )}
        </div>
        {item.donatedBy && <p className="mt-0.5 text-sm font-semibold text-slate-600">Donated by {item.donatedBy}</p>}
        {typeof item.valueCents === 'number' && (
          <p className="mt-1 text-sm text-slate-600">Value: {formatPrice(item.valueCents)}</p>
        )}
        {item.description && (
          <>
            <p className={`mt-1.5 text-sm text-slate-600 ${open ? '' : 'line-clamp-2'}`}>{item.description}</p>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mt-2 text-sm font-bold text-brand-orange"
            >
              {open ? 'Show less' : 'Details'}
            </button>
          </>
        )}
      </div>
    </div>
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
          {drawn && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Drawn</span>}
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
      <p className="mt-1 text-sm text-slate-600">
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
  const { items, intro } = useRaffleItems(EVENT_SLUG)
  const [session, setSession] = useState<SessionFilter>('all')
  const [availableOnly, setAvailableOnly] = useState(false)

  const list = (items ?? [])
    .filter((i) => session === 'all' || i.session === session || i.session === 'all-day')
    .filter((i) => !availableOnly || i.status !== 'won')
  // Available items first, then won — keeping the staff's sort order within each group.
  const ordered = [...list.filter((i) => i.status !== 'won'), ...list.filter((i) => i.status === 'won')]

  return (
    <>
      <PageHero
        title="Silent Auction"
        subtitle="A preview of the items that will be up for silent auction at Midwest BunFest 2026."
      />
      <PresentedBy surface="silent-auction" />
      <Section>
        {intro && (
          <Callout className="mb-8">
            <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{intro}</p>
          </Callout>
        )}

        {items === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <Card className="text-center">
            <p className="font-display text-lg font-extrabold text-brand-blue">
              Auction items will be posted here as BunFest gets closer.
            </p>
            <Link to="/bunfest" className={`${btn.blue} mt-4`}>
              About Midwest BunFest
            </Link>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                type="button"
                onClick={() => setAvailableOnly((v) => !v)}
                className={`${chip(availableOnly)} ml-auto`}
                aria-pressed={availableOnly}
              >
                Available only
              </button>
            </div>
            {ordered.length === 0 ? (
              <p className="mt-6 text-slate-600">No items match that filter.</p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ordered.map((i) => (
                  <ItemCard key={i.id} item={i} />
                ))}
              </div>
            )}
          </>
        )}

        <RafflePrizes />

        <div className="mt-10">
          <Link to="/bunfest" className="text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
            ← Midwest BunFest
          </Link>
        </div>
      </Section>
    </>
  )
}
