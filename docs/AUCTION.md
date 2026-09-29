# Silent auction: online bidding, Buy Now, cards, pickup and shipping

How the auction works across the app, the website and the BunFest site, and
the steps OHRR takes to switch it on. Written 2026-09-30.

## The short version

- Bidders **register once** (name, email, pickup or shipping) and **save a card**
  with Stripe. OHRR never sees the card number; Stripe keeps it and gives us
  two ids.
- They **bid** online until the item's session closes. A bid in the last few
  minutes pushes that item's close out ("going once", 5 minutes by default).
- **Buy Now** charges the saved card at once and ends bidding on that item.
- When a session closes, staff press **Close & charge now**; every high
  bidder's card is charged. A declined card is flagged so staff can charge it
  again, offer the item to the next bidder, or take payment at the desk.
- **Pickup or shipping**: a flat fee per item, set by staff; pickup-only items
  have no fee. Staff mark items picked up or shipped (with a tracking number)
  and the bidder sees it on their private page.
- **Receipts** come from Stripe by email. Refunds are made in Stripe's
  dashboard; a refund shows up here by itself.
- Paper bidders on the day: staff record the winner at the desk ("Record a
  table sale") and take cash or card there as before.

## Where the pieces live

| Piece | Where |
|---|---|
| Catalog, items, bids, bidders, sales | Supabase (update 35: `ohrr-app/supabase/migrations/20260930100000_silent_auction_bidding.sql`) |
| Payment server (holds Stripe's secret key) | this repo, `functions/api/auction/*` + `server/auction/*`, deployed with the website as Cloudflare Pages Functions at `https://ohrr-website.pages.dev/api/auction/*` |
| Shared client code | app `src/features/auction/client.ts` + `CardSetup.tsx`; website and BunFest `src/lib/auctionClient.ts` + `src/components/CardSetup.tsx` (copies; keep in sync) |
| Public pages | app `/bunfest/auction`, `/bunfest/auction/:id`, `/register`, `/me`; website `/bunfest/silent-auction/…`; BunFest `/auction/…` |
| Staff | item prices and the setup panel on the existing Silent Auction screens; the **Auction desk** (app `/staff/auction-desk`, website `/staff/auction/desk`) |

Money is stored in cents. Nothing about a card is stored except Stripe's
customer id, payment-method id, the card brand and the last four digits.

## Switching it on (OHRR's steps, in order)

1. **Run update 35** in Supabase → SQL Editor (the file above; safe to run
   twice).
2. **Stripe account.** Sign up at stripe.com as Ohio House Rabbit Rescue
   (EIN, bank account for payouts). Activate the account. Then:
   - Developers → API keys: copy the **Publishable key** (`pk_live_…`) and the
     **Secret key** (`sk_live_…`).
   - Developers → Webhooks → Add endpoint: URL
     `https://ohrr-website.pages.dev/api/auction/webhook`; events
     `setup_intent.succeeded`, `payment_intent.succeeded`,
     `payment_intent.payment_failed`, `charge.refunded`. Copy the **Signing
     secret** (`whsec_…`).
   - Settings → Business → Customer emails: turn on emails for successful
     payments (receipts).
   - Settings → Public details: the statement descriptor people see on their
     card statement (e.g. "OHRR AUCTION").
3. **Cloudflare secrets.** Workers & Pages → `ohrr-website` → Settings →
   Variables and Secrets → Add (type **Secret**), for Production:
   - `STRIPE_SECRET_KEY` = the `sk_live_…` key
   - `STRIPE_WEBHOOK_SECRET` = the `whsec_…` secret
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Project Settings → API keys →
     the secret/service-role key
   Then Deployments → Retry (or push any commit) so the server picks them up.
   Check `https://ohrr-website.pages.dev/api/auction/health`: it should show
   `stripe: true, stripe_mode: "live", webhook: true, supabase: true`.
4. **In the app or website, Staff → Silent Auction → Set up:** paste the
   **publishable** key, set the morning/afternoon close times, the "going
   once" minutes, the default bid step, and the pickup/shipping notes. Give
   each item its starting bid, Buy Now price (optional) and shipping fee (or
   pickup only). Then switch **Online bidding** on (optionally with an
   opening time).

### Do a dry run first (recommended)

Stripe has a **test mode** with the same screens. Use the `pk_test_` /
`sk_test_` keys and a test-mode webhook secret in steps 2–4, register with a
test card (`4242 4242 4242 4242`, any future date, any CVC; `4000 0025 0000
3155` needs the bank check; `4000 0000 0000 9995` is declined), bid, buy,
close and charge, refund. When it all works, replace the three secrets and
the publishable key with the live ones. Test-mode payments are not real
money and test receipts are not emailed.

## Costs and rules to know

- **Stripe fees.** Standard US card pricing applies (2.9% + 30¢ per successful
  card charge as published at stripe.com/pricing on 2026-09-29). Stripe's
  nonprofit discount requires at least 80% of the account's volume to be
  tax-deductible donations and Stripe says auction payments do not count, so
  don't plan on it for this account.
- **App stores.** Physical items bought in an app may be paid for outside the
  stores' in-app purchase systems (Apple guideline 3.1.3(e); Google Play
  excludes online auctions and physical goods from Play Billing).
- **Ohio sales tax.** Sales by a 501(c)(3) are exempt only up to six selling
  days a year (R.C. 5739.02(B)(9)). How an online auction that is open for a
  week counts is for OHRR's treasurer to confirm with the Department of
  Taxation before the auction opens.
- **Outbid alerts.** Bidders see their standing on their private page and on
  each item; automatic "you've been outbid" emails need the email-sending
  account still on OHRR's to-do list.
- **Cloudflare free plan:** Functions get 100,000 requests a day; the auction
  uses a handful per bid.

## Local development of the server

```
cp .dev.vars.example .dev.vars   # fill in TEST keys; never commit it
npm run build && npx wrangler pages dev
```
Then the API is at `http://127.0.0.1:8788/api/auction/*`. Type-check it with
`npx tsc -p functions/tsconfig.json --noEmit`.

## How the server paths work

| Path | Who | What |
|---|---|---|
| `POST register` | public | makes the bidder, a Stripe customer and a SetupIntent → `{ bidder, client_secret }` |
| `POST card-saved` | public | after Stripe's form: reads the saved card from Stripe, marks the bidder ready |
| `POST new-card` | public | a fresh card form for an existing bidder |
| `POST buy-now` | public | `auction_begin_sale('buy_now')` (locks the item) then charges; a failure voids the sale so the item is back on sale |
| `POST pay` | public | a winner pays a declined sale on the card they have now |
| `POST complete` | public | after the bank's extra check: records how the payment ended |
| `POST charge` | staff (Bearer token) | `{org_id,event}` close & charge, `{sale_id}` retry, `{offer_next_sale_id}` next bidder |
| `POST webhook` | Stripe | signed confirmations; every handler is safe to repeat |
| `GET health` | anyone | which secrets are set (never their values) |

Charges use an idempotency key per sale attempt so a retried request can't
charge twice, and a sale whose payment already succeeded is never charged
again.
