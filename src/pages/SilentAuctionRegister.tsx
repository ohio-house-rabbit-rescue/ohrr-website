// /bunfest/silent-auction/register?next=… — register to bid: name and
// contact, pickup or shipping (the address on its own step so no step has more
// than six fields), then Stripe's card form. The card goes straight to Stripe;
// OHRR only ever holds a customer id and the last four digits. Once the card
// is saved the browser remembers the bidder and goes back to `next` (the item
// they were looking at) or the catalog.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHero, Section, Card, btn, Callout } from '../components/ui'
import { Spinner } from '../lib/staff'
import { errMessage } from '../lib/supabase'
import CardSetup from '../components/CardSetup'
import { auctionApi, rememberBidder, recallBidder, type Address, type Fulfil } from '../lib/auctionClient'
import { CATALOG_PATH, MY_BIDS_PATH, biddingOffered, useCatalog, useDocTitle } from '../lib/auctionSite'
import { ErrorText, Field, TextInput } from '../components/AuctionBits'

type Step = 'details' | 'address' | 'card'

const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')

export default function SilentAuctionRegister() {
  useDocTitle('Register to bid')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const nextRaw = params.get('next') ?? ''
  // Only a page on this site; never another address.
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : CATALOG_PATH
  const { catalog } = useCatalog(0)
  const already = recallBidder()

  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [fulfil, setFulfil] = useState<Fulfil>('pickup')
  const [addr, setAddr] = useState<Address>({ line1: '', line2: '', city: '', state: 'OH', zip: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState<{ token: string; client_secret: string; bidder_no: number } | null>(null)

  if (!catalog) {
    return (
      <Section>
        <Spinner label="One moment…" />
      </Section>
    )
  }

  const settings = catalog.settings
  const pk = settings?.stripe_publishable_key ?? null
  if (!biddingOffered(catalog) || !pk) {
    return (
      <>
        <PageHero title="Register to bid" parent={{ to: CATALOG_PATH, label: 'Silent Auction' }} />
        <Section>
          <Card className="max-w-xl space-y-3">
            <p className="font-display text-lg font-extrabold text-ink">Bidding hasn’t opened yet.</p>
            <p className="text-base leading-relaxed text-slate-700">
              Online bidding opens before BunFest. Until then you can look through the items; on the day, the auction table takes bids
              too.
            </p>
            <Link to={CATALOG_PATH} className={btn.blue}>
              ← Back to the auction items
            </Link>
          </Card>
        </Section>
      </>
    )
  }

  if (already && !setup) {
    return (
      <>
        <PageHero title="Register to bid" parent={{ to: CATALOG_PATH, label: 'Silent Auction' }} />
        <Section>
          <Card className="max-w-xl space-y-3">
            <p className="font-display text-lg font-extrabold text-ink">You’re already registered as Bidder #{already.bidder_no}.</p>
            <p className="text-base leading-relaxed text-slate-700">This browser remembers you, so you can bid straight away.</p>
            <div className="flex flex-wrap gap-2">
              <Link to={next} className={btn.orange}>
                {next === CATALOG_PATH ? 'Go to the items' : 'Back to the item'}
              </Link>
              <Link to={MY_BIDS_PATH} className={btn.outline}>
                Your bids and card
              </Link>
            </div>
            <p className="text-base text-slate-600">
              Not you?{' '}
              <Link to={MY_BIDS_PATH} className="font-bold text-brand-blue underline underline-offset-4">
                Open “Your bids” and choose “Not you?”
              </Link>{' '}
              to register someone else.
            </p>
          </Card>
        </Section>
      </>
    )
  }

  const goOn = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (fulfil === 'ship' && step === 'details') {
      setStep('address')
      return
    }
    void register()
  }

  const register = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await auctionApi.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        fulfil,
        address: fulfil === 'ship' ? addr : null,
      })
      setSetup({ token: r.bidder.access_token, client_secret: r.client_secret, bidder_no: r.bidder.bidder_no })
      setStep('card')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const cardSaved = async (setupIntentId: string) => {
    if (!setup) return
    const { bidder } = await auctionApi.cardSaved(setup.token, setupIntentId)
    rememberBidder(bidder)
    navigate(next)
  }

  const stepNo = step === 'details' ? 1 : step === 'address' ? 2 : fulfil === 'ship' ? 3 : 2
  const steps = fulfil === 'ship' ? 3 : 2
  const setA = (k: keyof Address) => (e: { target: { value: string } }) => setAddr((a) => ({ ...a, [k]: e.target.value }))

  return (
    <>
      <PageHero title="Register to bid" parent={{ to: CATALOG_PATH, label: 'Silent Auction' }} subtitle="Your details once, then bid on anything in the auction." />
      <Section>
        <div className="grid gap-8 lg:grid-cols-5">
          <Card className="space-y-4 lg:col-span-3">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Step {stepNo} of {steps}
            </p>

            {step === 'details' && (
              <form onSubmit={goOn} className="space-y-4">
                <Field label="Your name">
                  <TextInput required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                </Field>
                <Field label="Email">
                  <TextInput required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
                </Field>
                <Field label="Phone" hint="optional">
                  <TextInput type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
                </Field>
                <fieldset>
                  <legend className="text-base font-semibold text-slate-700">If you win, how will you get your item?</legend>
                  <div className="mt-2 space-y-2">
                    {(
                      [
                        ['pickup', 'I’ll pick it up at BunFest'],
                        ['ship', 'Ship it to me (items marked “Ships”; the fee is added)'],
                      ] as [Fulfil, string][]
                    ).map(([v, label]) => (
                      <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-3.5 py-2 text-base text-ink has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue-50">
                        <input type="radio" name="fulfil" value={v} checked={fulfil === v} onChange={() => setFulfil(v)} className="h-5 w-5 accent-brand-blue" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {fulfil === 'pickup' && settings?.pickup_note && <p className="whitespace-pre-line text-base text-slate-700">{settings.pickup_note}</p>}
                {fulfil === 'ship' && settings?.shipping_note && <p className="whitespace-pre-line text-base text-slate-700">{settings.shipping_note}</p>}
                <ErrorText>{error}</ErrorText>
                <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
                  {busy ? 'One moment…' : fulfil === 'ship' ? 'Next: shipping address' : 'Next: save a card'}
                </button>
              </form>
            )}

            {step === 'address' && (
              <form onSubmit={goOn} className="space-y-4">
                <p className="font-display text-lg font-extrabold text-ink">Where should we ship?</p>
                <Field label="Street address">
                  <TextInput required autoComplete="address-line1" value={addr.line1 ?? ''} onChange={setA('line1')} maxLength={120} />
                </Field>
                <Field label="Apartment, unit" hint="optional">
                  <TextInput autoComplete="address-line2" value={addr.line2 ?? ''} onChange={setA('line2')} maxLength={120} />
                </Field>
                <Field label="City">
                  <TextInput required autoComplete="address-level2" value={addr.city ?? ''} onChange={setA('city')} maxLength={80} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="State">
                    <select required autoComplete="address-level1" value={addr.state ?? ''} onChange={setA('state')} className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink">
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="ZIP">
                    <TextInput required inputMode="numeric" autoComplete="postal-code" value={addr.zip ?? ''} onChange={setA('zip')} maxLength={20} />
                  </Field>
                </div>
                <ErrorText>{error}</ErrorText>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
                    {busy ? 'One moment…' : 'Next: save a card'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setStep('details')} className={btn.outline}>
                    Back
                  </button>
                </div>
              </form>
            )}

            {step === 'card' && setup && (
              <div className="space-y-4">
                <p className="font-display text-lg font-extrabold text-ink">You’re Bidder #{setup.bidder_no}. Now save a card.</p>
                <p className="text-base leading-relaxed text-slate-700">
                  Stripe holds the card. It is charged only if you win an item or use Buy Now — for the amount you bid plus shipping if you
                  chose it.
                </p>
                <CardSetup publishableKey={pk} clientSecret={setup.client_secret} onSaved={cardSaved} buttonClassName={`${btn.orange} w-full disabled:opacity-60`} label="Save card and start bidding" />
              </div>
            )}
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Callout className="!p-5">
              <p className="font-display text-lg font-extrabold text-ink">How it works</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-slate-700">
                <li>You get a bidder number. Other bidders see the number, never your name.</li>
                <li>A card is saved now and charged only if you win or use Buy Now.</li>
                <li>OHRR never sees your card number — Stripe keeps it.</li>
                <li>Every bid is a promise to pay if you win.</li>
              </ul>
            </Callout>
            {settings?.bidding_note && <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{settings.bidding_note}</p>}
            <p className="text-base">
              <Link to={CATALOG_PATH} className="font-bold text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
                ← Back to the auction items
              </Link>
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}
