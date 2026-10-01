// /bunfest/silent-auction/:id — one auction item: every photo (PhotoGallery,
// cover first, in the order staff set) and the story, the running bid, and the
// bid box. A registered bidder (this browser remembers them) bids here or uses
// Buy Now; anyone else is sent to register first. The page reads the catalog
// every 15 s while bidding is on, so the current bid and the countdown keep up.
// While the Silent Auction is switched off (Staff → Features) visitors get the
// "isn't open" page and signed-in staff the page under "Hidden from the public".
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHero, Section, Card, btn, PrintButton } from '../components/ui'
import { Spinner } from '../lib/staff'
import { supabase, errMessage } from '../lib/supabase'
import {
  auctionApi,
  bidLine,
  closesIn,
  dollarsToCents,
  fetchItemBids,
  fmtWhen,
  money,
  placeBid,
  shippingFor,
  whyClosed,
  type AuctionItem,
  type BidRow,
  type Bidder,
  type Catalog,
} from '../lib/auctionClient'
import {
  CATALOG_PATH,
  MY_BIDS_PATH,
  REGISTER_PATH,
  itemPath,
  settleCharge,
  shipLine,
  useAuctionGate,
  useAuctionItemPhotos,
  useCatalog,
  useDocTitle,
  useMyPage,
  useServerNow,
} from '../lib/auctionSite'
import { AuctionGate, BidderBar, Chip, ErrorText, ItemPhoto, SessionChip, SoldChip, TextInput } from '../components/AuctionBits'
import PhotoGallery from '../components/PhotoGallery'

const centsToInput = (c: number) => (c / 100).toFixed(2).replace(/\.00$/, '')

function BidBox({
  item,
  catalog,
  now,
  bidder,
  token,
  preview,
  onChanged,
}: {
  item: AuctionItem
  catalog: Catalog
  now: string
  bidder: Bidder | null
  token: string
  /** Before update 35: no bidding data at all, so only the "not open" line. */
  preview: boolean
  onChanged: () => Promise<void>
}) {
  const closed = whyClosed(item, catalog.settings, now)
  const [amount, setAmount] = useState(centsToInput(item.next_min_cents))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [confirmBuy, setConfirmBuy] = useState(false)
  const [bought, setBought] = useState<string | null>(null)

  // A new high bid moves the floor: follow it unless the person has typed more.
  useEffect(() => {
    setAmount((a) => {
      const typed = dollarsToCents(a)
      return typed != null && typed >= item.next_min_cents ? a : centsToInput(item.next_min_cents)
    })
  }, [item.next_min_cents])

  const step = item.increment_cents
  const quick = [1, 2, 5].map((n) => item.next_min_cents + n * step)
  const shipping = shippingFor(item, bidder)
  const pk = catalog.settings?.stripe_publishable_key ?? null

  const submitBid = async (e: FormEvent) => {
    e.preventDefault()
    const cents = dollarsToCents(amount)
    setError(null)
    setDone(null)
    if (cents == null) {
      setError('Enter an amount in dollars.')
      return
    }
    setBusy(true)
    try {
      const r = await placeBid(supabase, token, item.id, cents)
      setDone(`Your bid of ${money(r.item.current_bid_cents)} is in. You are the high bidder (Bidder #${bidder?.bidder_no ?? ''}).`)
      await onChanged()
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const buyNow = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const r = await auctionApi.buyNow(token, item.id)
      const s = await settleCharge(r, token, pk)
      if (s.ok) setBought(`It’s yours. ${s.message}`)
      else setError(s.message)
      setConfirmBuy(false)
      await onChanged()
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (preview) {
    return (
      <Card className="space-y-2">
        {typeof item.value_cents === 'number' && <p className="font-display text-2xl font-black text-ink">Value {money(item.value_cents)}</p>}
        <p className="text-base font-semibold text-slate-700">Online bidding is not open yet. On the day, see the auction table.</p>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="font-display text-2xl font-black text-ink">{bidLine(item)}</p>
        {item.status !== 'won' && (
          <p className="mt-1 text-base text-slate-700">
            {item.high_bidder_no != null && (
              <>
                Bidder #{item.high_bidder_no} is high{bidder && bidder.bidder_no === item.high_bidder_no ? ' — that’s you' : ''}.{' '}
              </>
            )}
            Next bid at least <strong className="text-ink">{money(item.next_min_cents)}</strong> (steps of {money(step)}).
          </p>
        )}
        {item.closes_at && (
          <p className="mt-1 text-base text-slate-700">
            {item.status !== 'won' && item.is_open ? (
              <>
                <Chip tone="green">{closesIn(item.closes_at, now)}</Chip> <span className="ml-1">Closes {fmtWhen(item.closes_at)} Eastern.</span>
              </>
            ) : (
              <>Bidding closed {fmtWhen(item.closes_at)} Eastern.</>
            )}
          </p>
        )}
        <p className="mt-1 text-base text-slate-700">
          {shipLine(item)}
          {bidder?.fulfil === 'ship' && item.ship_fee_cents != null && ' — you chose shipping, so that is added if you win.'}
          {bidder?.fulfil === 'ship' && item.ship_fee_cents == null && ' — this item can only be picked up at BunFest.'}
        </p>
      </div>

      {bought && (
        <div role="status" aria-live="polite" className="rounded-xl bg-emerald-50 p-4 text-base font-semibold text-emerald-800">
          {bought}{' '}
          <Link to={MY_BIDS_PATH} className="font-bold text-brand-blue underline underline-offset-4">
            See your wins
          </Link>
        </div>
      )}

      {closed ? (
        !bought && <p className="text-base font-semibold text-slate-700">{closed}</p>
      ) : !bidder ? (
        <div className="no-print space-y-2">
          <Link to={`${REGISTER_PATH}?next=${encodeURIComponent(itemPath(item.id))}`} className={btn.orange}>
            Register to bid
          </Link>
          <p className="text-base text-slate-600">Your name, email and a card that is only charged if you win. Then you come straight back here.</p>
        </div>
      ) : bidder.is_blocked ? (
        <p className="text-base font-semibold text-slate-700">Bidding is not available for this registration. Please see the auction desk.</p>
      ) : !bidder.card_ready ? (
        <p className="text-base font-semibold text-slate-700">
          Please{' '}
          <Link to={MY_BIDS_PATH} className="font-bold text-brand-blue underline underline-offset-4">
            add a card
          </Link>{' '}
          before bidding.
        </p>
      ) : (
        <div className="no-print space-y-4">
          <form onSubmit={submitBid} className="space-y-3">
            <label className="block text-base font-semibold text-slate-700">
              Your bid ($)
              <TextInput type="number" inputMode="decimal" min={centsToInput(item.next_min_cents)} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-xs" />
            </label>
            <div className="flex flex-wrap gap-2">
              {quick.map((c) =>
                item.buy_now_cents != null && c >= item.buy_now_cents ? null : (
                  <button key={c} type="button" onClick={() => setAmount(centsToInput(c))} className={btn.outline} aria-label={`Bid ${money(c)}`}>
                    {money(c)}
                  </button>
                ),
              )}
            </div>
            <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
              {busy ? 'Working…' : 'Place bid'}
            </button>
          </form>

          {item.buy_now_cents != null && (
            <div className="border-t border-slate-200 pt-4">
              {confirmBuy ? (
                <div className="space-y-2 rounded-xl bg-brand-orange-50 p-4">
                  <p className="text-base font-semibold text-ink">
                    Buy now for {money(item.buy_now_cents)}
                    {shipping > 0 && <> + {money(shipping)} shipping = {money(item.buy_now_cents + shipping)}</>}?
                  </p>
                  <p className="text-base text-slate-700">Your card ending {bidder.card_last4 ?? '…'} is charged right away and the item is yours.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void buyNow()} className={`${btn.orange} disabled:opacity-60`}>
                      {busy ? 'Charging…' : `Yes, charge ${money(item.buy_now_cents + shipping)}`}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setConfirmBuy(false)} className={btn.outline}>
                      Not now
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={busy} onClick={() => setConfirmBuy(true)} className={btn.blue}>
                  Buy now for {money(item.buy_now_cents)}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {done && (
        <p role="status" aria-live="polite" className="rounded-xl bg-emerald-50 p-3 text-base font-semibold text-emerald-800">
          {done}
        </p>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  )
}

function History({ bids, myNo }: { bids: BidRow[] | null; myNo: number | null }) {
  if (!bids) return null
  return (
    <div className="mt-8">
      <h2 className="font-display text-xl font-extrabold text-ink">Bids so far</h2>
      {bids.length === 0 ? (
        <p className="mt-1 text-base text-slate-600">No bids yet.</p>
      ) : (
        <table className="mt-2 w-full max-w-lg text-base">
          <thead>
            <tr className="text-left text-sm font-bold uppercase tracking-wide text-slate-600">
              <th className="py-1 pr-3">Amount</th>
              <th className="py-1 pr-3">Bidder</th>
              <th className="py-1">When</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b, i) => (
              <tr key={`${b.at}-${i}`} className={`border-t border-slate-100 ${b.is_high ? 'font-bold text-ink' : 'text-slate-700'}`}>
                <td className="py-1.5 pr-3">
                  {money(b.amount_cents)}
                  {b.kind === 'buy_now' && ' (Buy Now)'}
                  {b.kind === 'desk' && ' (at the table)'}
                </td>
                <td className="py-1.5 pr-3">
                  {b.bidder_no != null ? `#${b.bidder_no}` : 'Table'}
                  {myNo != null && b.bidder_no === myNo && <span className="ml-1 text-brand-blue">(you)</span>}
                </td>
                <td className="py-1.5">{fmtWhen(b.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function SilentAuctionItem() {
  const { id = '' } = useParams()
  const { catalog, source, reload } = useCatalog()
  const gate = useAuctionGate(catalog)
  const now = useServerNow(catalog?.now)
  const { remembered, token, page, reload: reloadMe } = useMyPage(undefined, 0)
  const [bids, setBids] = useState<BidRow[] | null>(null)

  const item = catalog?.items.find((i) => i.id === id) ?? null
  // Every photo, in the order staff set; the first is the cover.
  const photos = useAuctionItemPhotos(item)
  useDocTitle(item?.title ?? 'Silent Auction')

  // Only for an item the catalog has, and only while the page may be shown.
  const known = Boolean(item)
  const loadBids = useCallback(async () => {
    if (!id || source !== 'live' || !known || !gate.show) return
    try {
      setBids(await fetchItemBids(supabase, id))
    } catch {
      setBids(null)
    }
  }, [id, source, known, gate.show])
  useEffect(() => {
    void loadBids()
  }, [loadBids])
  const open = Boolean(item?.is_open)
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => void loadBids(), 15000)
    return () => clearInterval(t)
  }, [open, loadBids])

  const changed = async () => {
    await Promise.all([reload(), loadBids(), reloadMe()])
  }

  if (!catalog) {
    return (
      <AuctionGate gate={gate}>
        <Section>
          <Spinner label="Opening the item…" />
        </Section>
      </AuctionGate>
    )
  }
  if (!item) {
    return (
      <AuctionGate gate={gate}>
        <PageHero title="Silent Auction" parent={{ to: '/bunfest', label: 'Midwest BunFest' }} />
        <Section>
          <Card className="max-w-xl space-y-3">
            <p className="font-display text-lg font-extrabold text-ink">We can’t find that item.</p>
            <p className="text-base text-slate-700">It may have been taken out of the auction.</p>
            <Link to={CATALOG_PATH} className={btn.blue}>
              All auction items
            </Link>
          </Card>
        </Section>
      </AuctionGate>
    )
  }

  const bidder = page?.bidder ?? null
  return (
    <AuctionGate gate={gate}>
      <PageHero title={item.title} parent={{ to: CATALOG_PATH, label: 'Silent Auction' }} />
      <Section>
        <div className="no-print mb-6">
          <BidderBar catalog={catalog} remembered={remembered} next={itemPath(item.id)} />
        </div>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {photos.length > 0 ? (
              <PhotoGallery photos={photos} alt={item.title} />
            ) : (
              <ItemPhoto item={item} className="aspect-[4/3] rounded-2xl ring-1 ring-black/5" />
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SessionChip session={item.session} />
              <SoldChip item={item} />
              {item.status !== 'won' && item.buy_now_cents != null && <Chip tone="orange">Buy now {money(item.buy_now_cents)}</Chip>}
            </div>
            {item.donated_by && <p className="mt-3 text-base font-semibold text-slate-700">Donated by {item.donated_by}</p>}
            {typeof item.value_cents === 'number' && <p className="mt-1 text-base text-slate-700">Value {money(item.value_cents)}</p>}
            {item.description && <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700">{item.description}</p>}
            <History bids={bids} myNo={bidder?.bidder_no ?? remembered?.bidder_no ?? null} />
          </div>
          <div className="lg:col-span-2">
            <BidBox key={`${item.id}-${bidder?.id ?? 'anon'}`} item={item} catalog={catalog} now={now} bidder={bidder} token={token} preview={source === 'preview'} onChanged={changed} />
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link to={CATALOG_PATH} className="text-base font-bold text-brand-blue hover:text-brand-blue-dark">
            ← All auction items
          </Link>
          <PrintButton />
        </div>
      </Section>
    </AuctionGate>
  )
}
