// /bunfest/silent-auction/me and /bunfest/silent-auction/me/:token — a
// bidder's own page: who they are, the card on file, their bids (high or
// outbid) and their wins with what they owe and how they get the item. The
// :token form is their private link — open it on any device and that device
// remembers them too. Reads every 15 s while open so an outbid shows up.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHero, Section, Card, btn, PrintButton } from '../components/ui'
import { Spinner } from '../lib/staff'
import { supabase, errMessage } from '../lib/supabase'
import CardSetup from '../components/CardSetup'
import {
  auctionApi,
  bidLine,
  closesIn,
  fmtWhen,
  money,
  rememberBidder,
  updateBidder,
  FULFIL_LABEL,
  PAYMENT_LABEL,
  type Address,
  type Fulfil,
  type MyPage,
  type Sale,
} from '../lib/auctionClient'
import {
  CATALOG_PATH,
  MY_BIDS_PATH,
  REGISTER_PATH,
  addressLine,
  cardLine,
  itemPath,
  settleCharge,
  useDocTitle,
  useMyPage,
  useServerNow,
} from '../lib/auctionSite'
import { Chip, ErrorText, Field, ItemPhoto, TextInput } from '../components/AuctionBits'

const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')

function DetailsForm({ page, token, onSaved, onCancel }: { page: MyPage; token: string; onSaved: () => Promise<void>; onCancel: () => void }) {
  const b = page.bidder
  const [name, setName] = useState(b.name)
  const [phone, setPhone] = useState(b.phone ?? '')
  const [fulfil, setFulfil] = useState<Fulfil>(b.fulfil)
  const [addr, setAddr] = useState<Address>({ line1: '', line2: '', city: '', state: 'OH', zip: '', ...(b.address ?? {}) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setA = (k: keyof Address) => (e: { target: { value: string } }) => setAddr((a) => ({ ...a, [k]: e.target.value }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const updated = await updateBidder(supabase, token, { name: name.trim(), phone: phone.trim(), fulfil, address: fulfil === 'ship' ? addr : null })
      rememberBidder(updated)
      await onSaved()
      onCancel()
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Your name">
        <TextInput required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>
      <Field label="Phone" hint="optional">
        <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
      </Field>
      <fieldset>
        <legend className="text-base font-semibold text-slate-700">If you win</legend>
        <div className="mt-2 space-y-2">
          {(
            [
              ['pickup', 'I’ll pick it up at BunFest'],
              ['ship', 'Ship it to me (items marked “Ships”)'],
            ] as [Fulfil, string][]
          ).map(([v, label]) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-3.5 py-2 text-base text-ink has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue-50">
              <input type="radio" name="fulfil" value={v} checked={fulfil === v} onChange={() => setFulfil(v)} className="h-5 w-5 accent-brand-blue" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {fulfil === 'ship' && (
        <div className="space-y-3">
          <Field label="Street address">
            <TextInput required value={addr.line1 ?? ''} onChange={setA('line1')} maxLength={120} />
          </Field>
          <Field label="Apartment, unit" hint="optional">
            <TextInput value={addr.line2 ?? ''} onChange={setA('line2')} maxLength={120} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City">
              <TextInput required value={addr.city ?? ''} onChange={setA('city')} maxLength={80} />
            </Field>
            <Field label="State">
              <select required value={addr.state ?? ''} onChange={setA('state')} className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink">
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ZIP">
              <TextInput required inputMode="numeric" value={addr.zip ?? ''} onChange={setA('zip')} maxLength={20} />
            </Field>
          </div>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className={btn.outline}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function WinCard({ sale, page, token, onChanged }: { sale: Sale; page: MyPage; token: string; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const item = sale.item
  const pk = page.settings?.stripe_publishable_key ?? null
  const tone = sale.payment_status === 'paid' || sale.payment_status === 'cash' ? 'green' : sale.payment_status === 'failed' ? 'red' : sale.payment_status === 'pending' ? 'orange' : 'slate'

  const payNow = async () => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const r = await auctionApi.pay(token, sale.sale_id)
      const s = await settleCharge(r, token, pk)
      if (s.ok) setMsg(s.message)
      else setError(s.message)
      await onChanged()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-wrap gap-4">
      {item && (
        <Link to={itemPath(item.id)} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
          <ItemPhoto item={item} className="h-full" />
        </Link>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-display text-lg font-extrabold text-ink">
          {item ? (
            <Link to={itemPath(item.id)} className="text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
              {item.title}
            </Link>
          ) : (
            'Item'
          )}{' '}
          <Chip tone={tone}>{PAYMENT_LABEL[sale.payment_status]}</Chip>
        </p>
        <p className="text-base text-slate-700">
          {sale.kind === 'buy_now' ? 'Buy Now' : 'Winning bid'} {money(sale.amount_cents)}
          {sale.ship_fee_cents > 0 && <> + shipping {money(sale.ship_fee_cents)}</>} = <strong className="text-ink">{money(sale.total_cents)}</strong>
        </p>
        {sale.payment_status === 'paid' && <p className="text-base text-slate-700">Paid {fmtWhen(sale.paid_at)}. Stripe emailed your receipt.</p>}
        {sale.payment_status === 'cash' && <p className="text-base text-slate-700">Paid at the auction desk.</p>}
        {sale.payment_status === 'failed' && (
          <p className="text-base font-semibold text-red-700">{sale.failure_message ?? 'Your card was declined.'} Add a new card below or pay again.</p>
        )}
        {sale.payment_status === 'pending' && <p className="text-base text-slate-700">Not charged yet.</p>}
        {(sale.payment_status === 'failed' || sale.payment_status === 'pending') && page.bidder.card_ready && (
          <button type="button" disabled={busy} onClick={() => void payNow()} className={`${btn.orange} no-print disabled:opacity-60`}>
            {busy ? 'Charging…' : `Pay ${money(sale.total_cents)} now`}
          </button>
        )}
        {(sale.payment_status === 'paid' || sale.payment_status === 'cash') && (
          <p className="text-base text-slate-700">
            {sale.fulfil === 'ship' ? (
              <>
                Shipping: {FULFIL_LABEL[sale.fulfil_status]}
                {sale.fulfil_status === 'shipped' && sale.shipped_at && <> {fmtWhen(sale.shipped_at)}</>}
                {sale.tracking && <> · Tracking {sale.tracking}</>}
                {sale.ship_address && <> · to {addressLine(sale.ship_address)}</>}
              </>
            ) : (
              <>
                Pickup at BunFest: {FULFIL_LABEL[sale.fulfil_status]}
                {page.settings?.pickup_note && <span className="block whitespace-pre-line">{page.settings.pickup_note}</span>}
              </>
            )}
          </p>
        )}
        {msg && (
          <p role="status" aria-live="polite" className="text-base font-semibold text-emerald-800">
            {msg}
          </p>
        )}
        <ErrorText>{error}</ErrorText>
      </div>
    </Card>
  )
}

// A bidder's own page stays open while the Silent Auction is switched off
// (Staff → Features): it shows only that person's bids and wins, and after
// BunFest winners still need to see what they owe.
export default function SilentAuctionMe() {
  useDocTitle('Your bids')
  return <MyBidsPage />
}

function MyBidsPage() {
  const { token: param } = useParams()
  const navigate = useNavigate()
  const { remembered, token, page, error, reload, forget } = useMyPage(param)
  const now = useServerNow(page?.now)
  const [editing, setEditing] = useState(false)
  const [cardSecret, setCardSecret] = useState<string | null>(null)
  const [cardBusy, setCardBusy] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Opened from the private link: remember it here, then keep the address clean.
  useEffect(() => {
    if (param && page) {
      rememberBidder(page.bidder)
      navigate(MY_BIDS_PATH, { replace: true })
    }
  }, [param, page, navigate])

  if (page === undefined) {
    return (
      <Section>
        <Spinner label="Opening your bids…" />
      </Section>
    )
  }

  if (!page) {
    return (
      <>
        <PageHero title="Your bids" parent={{ to: CATALOG_PATH, label: 'Silent Auction' }} />
        <Section>
          <Card className="max-w-xl space-y-3">
            <p className="font-display text-lg font-extrabold text-ink">{token ? 'We can’t find that registration.' : 'You haven’t registered on this device.'}</p>
            <p className="text-base leading-relaxed text-slate-700">
              {token
                ? 'The link may be from another year, or was typed wrongly. Register again and you get a new bidder number.'
                : 'Register once and this device remembers you. If you registered on another device, open your private link from that device’s “Your bids” page.'}
            </p>
            <ErrorText>{error}</ErrorText>
            <div className="flex flex-wrap gap-2">
              <Link to={REGISTER_PATH} className={btn.orange}>
                Register to bid
              </Link>
              <Link to={CATALOG_PATH} className={btn.outline}>
                Auction items
              </Link>
            </div>
          </Card>
        </Section>
      </>
    )
  }

  const b = page.bidder
  const pk = page.settings?.stripe_publishable_key ?? null
  const privateLink = `${window.location.origin}${MY_BIDS_PATH}/${b.access_token}`

  const changeCard = async () => {
    setCardBusy(true)
    setCardError(null)
    try {
      const r = await auctionApi.newCard(token)
      setCardSecret(r.client_secret)
    } catch (e) {
      setCardError(errMessage(e))
    } finally {
      setCardBusy(false)
    }
  }
  const cardSaved = async (setupIntentId: string) => {
    const { bidder } = await auctionApi.cardSaved(token, setupIntentId)
    rememberBidder(bidder)
    setCardSecret(null)
    await reload()
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(privateLink)
      setCopied(true)
    } catch {
      window.prompt('Copy this link:', privateLink)
    }
  }
  const notYou = () => {
    if (!window.confirm('Forget this registration on this device? You can register again as someone else.')) return
    forget()
    navigate(REGISTER_PATH)
  }

  const live = page.bids.filter((x) => x.is_high && x.item.status !== 'won')
  const outbid = page.bids.filter((x) => !x.is_high && x.item.status !== 'won')

  return (
    <>
      <PageHero title="Your bids" parent={{ to: CATALOG_PATH, label: 'Silent Auction' }} subtitle={`Bidder #${b.bidder_no} · ${b.name}`} />
      <Section>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Your bids</h2>
              {page.bids.length === 0 ? (
                <p className="mt-1 text-base text-slate-700">
                  No bids yet.{' '}
                  <Link to={CATALOG_PATH} className="font-bold text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
                    See the items
                  </Link>
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {[...live, ...outbid].map((x) => (
                    <li key={x.bid_id}>
                      <Card className="flex flex-wrap items-center gap-4">
                        <Link to={itemPath(x.item.id)} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                          <ItemPhoto item={x.item} className="h-full" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-lg font-extrabold">
                            <Link to={itemPath(x.item.id)} className="text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
                              {x.item.title}
                            </Link>
                          </p>
                          <p className="text-base text-slate-700">
                            You bid {money(x.amount_cents)} · {bidLine(x.item)}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-2">
                            {x.is_high ? <Chip tone="green">You’re the high bidder</Chip> : <Chip tone="red">Outbid</Chip>}
                            {x.item.is_open && x.item.closes_at && <Chip tone="slate">{closesIn(x.item.closes_at, now)}</Chip>}
                          </p>
                        </div>
                        {!x.is_high && x.item.is_open && (
                          <Link to={itemPath(x.item.id)} className={`${btn.orange} no-print`}>
                            Bid again
                          </Link>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Your wins</h2>
              {page.won.length === 0 ? (
                <p className="mt-1 text-base text-slate-700">Nothing yet. Items you win or buy now appear here with what you owe.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {page.won.map((s) => (
                    <li key={s.sale_id}>
                      <WinCard sale={s} page={page} token={token} onChanged={reload} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Card className="space-y-3">
              <h2 className="font-display text-xl font-extrabold text-ink">You</h2>
              {editing ? (
                <DetailsForm page={page} token={token} onSaved={reload} onCancel={() => setEditing(false)} />
              ) : (
                <>
                  <p className="text-base text-slate-700">
                    <strong className="text-ink">Bidder #{b.bidder_no}</strong> · {b.name}
                    <br />
                    {b.email}
                    {b.phone && (
                      <>
                        <br />
                        {b.phone}
                      </>
                    )}
                  </p>
                  <p className="text-base text-slate-700">
                    {b.fulfil === 'ship' ? <>Ship to {addressLine(b.address) || 'your address'}</> : 'Pick up at BunFest'}
                    {b.fulfil === 'pickup' && page.settings?.pickup_note && <span className="block whitespace-pre-line text-slate-600">{page.settings.pickup_note}</span>}
                    {b.fulfil === 'ship' && page.settings?.shipping_note && <span className="block whitespace-pre-line text-slate-600">{page.settings.shipping_note}</span>}
                  </p>
                  <button type="button" onClick={() => setEditing(true)} className={`${btn.outline} no-print`}>
                    Change
                  </button>
                </>
              )}
            </Card>

            <Card className="space-y-3">
              <h2 className="font-display text-xl font-extrabold text-ink">Card on file</h2>
              <p className="text-base text-slate-700">{cardLine(b)}. Charged only if you win or use Buy Now.</p>
              {cardSecret && pk ? (
                <div className="space-y-2">
                  <CardSetup publishableKey={pk} clientSecret={cardSecret} onSaved={cardSaved} buttonClassName={`${btn.orange} w-full disabled:opacity-60`} label="Save this card" />
                  <button type="button" onClick={() => setCardSecret(null)} className={btn.outline}>
                    Keep the old card
                  </button>
                </div>
              ) : (
                <button type="button" disabled={cardBusy || !pk} onClick={() => void changeCard()} className={`${btn.outline} no-print disabled:opacity-60`}>
                  {cardBusy ? 'One moment…' : b.card_ready ? 'Change card' : 'Add a card'}
                </button>
              )}
              {!pk && <p className="text-base text-slate-600">Cards can be changed once online bidding is open.</p>}
              <ErrorText>{cardError}</ErrorText>
            </Card>

            <Card className="no-print space-y-3">
              <h2 className="font-display text-xl font-extrabold text-ink">On another device</h2>
              <p className="text-base text-slate-700">Your private link opens this page anywhere. Keep it to yourself — anyone with it can bid as you.</p>
              <button type="button" onClick={() => void copyLink()} className={btn.outline}>
                {copied ? 'Copied' : 'Copy my private link'}
              </button>
            </Card>

            <p className="no-print text-base text-slate-700">
              Not {b.name.split(' ')[0]}?{' '}
              <button type="button" onClick={notYou} className="font-bold text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
                Register again
              </button>
            </p>
            {remembered === null && !param && <p className="text-base text-slate-600">This device does not remember you yet.</p>}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link to={CATALOG_PATH} className="text-base font-bold text-brand-blue hover:text-brand-blue-dark">
            ← All auction items
          </Link>
          <PrintButton />
        </div>
      </Section>
    </>
  )
}
