import { Link } from 'react-router-dom'
import { PageHero, Section, btn, ext, Card, Callout } from '../components/ui'
import {
  DONATE,
  WORKPLACE,
  KROGER_POST,
  KROGER_REWARDS,
  WISH_LIST_PAGE,
  AMAZON_WISH_LIST,
  MERCH_STORE,
  BUNFEST_MERCH,
  LICENSE_PLATE,
  BECOME_SUPPORTER,
  ONLINE_AFFILIATES,
  HOST_FUNDRAISER,
  LEGACY_FUND,
  SPAY_IT_FORWARD,
  OHRR,
} from '../lib/constants'

interface Way {
  h: string
  p: string
  extra?: string
  href: string
  cta: string
  secondary?: { href: string; label: string }
  // OHRR's own artwork for this channel, bundled under public/img/news/ (never hotlinked);
  // alt text is the live-site post title. 'contain' keeps logos/artwork uncropped.
  image?: string
  imageAlt?: string
  imageFit?: 'cover' | 'contain'
}

// Every way to give on the current OHRR site, in plain English, each with a button
// to the live-site page where the action actually happens.
const WAYS: Way[] = [
  {
    h: 'Donate online',
    p: 'A one-time or monthly gift is the most direct way to fund vet care, food, and the Adoption Center. OHRR is a 501(c)(3), so your donation is tax deductible.',
    href: DONATE,
    cta: 'Donate now',
  },
  {
    h: 'Workplace giving & matching gifts',
    p: 'Many supporters give through their employer — Chase, Battelle, IBM, Verizon, Nordstrom, Nationwide, and via United Way. Sometimes that gift (or one you make directly to OHRR) can be matched by your employer, multiplying the impact for the bunnies.',
    href: WORKPLACE,
    cta: 'Workplace donations',
  },
  {
    h: 'Kroger Community Rewards',
    p: "Link OHRR to your Kroger account and Kroger donates to us every time you shop. It takes less than a minute and costs you nothing — you'll see our name towards the bottom of your receipt.",
    extra: 'If you live outside Columbus, pick a Columbus store as your main store and OHRR still receives the benefit.',
    href: KROGER_POST,
    cta: 'How to link your card',
    secondary: { href: KROGER_REWARDS, label: 'Go to Kroger Community Rewards' },
    image: '/img/news/kroger-community-rewards.jpg',
    imageAlt: 'Link OHRR to your Kroger Community Rewards',
    imageFit: 'contain',
  },
  {
    h: 'Amazon Wish List',
    p: 'Buy hay, litter, cleaning supplies, pens, litter boxes and bunny-safe toys from our wish list and have them shipped straight to the Adoption Center.',
    // Opens Amazon itself — the rescue gets residuals from the visit (sponsor, 2026-09-21).
    href: AMAZON_WISH_LIST,
    cta: 'Open the Amazon Wish List',
    secondary: { href: WISH_LIST_PAGE, label: 'The full list, and what to drop off' },
  },
  {
    h: 'OHRR merch store',
    p: 'T-shirts, sweatshirts and more in our Bonfire store, including the "Beach Bunny Vibes" and "They Still Talk About You" designs. Proceeds support our adoption activities.',
    href: MERCH_STORE,
    cta: 'Shop OHRR merch',
    image: '/img/news/beach-bunny-vibes.jpg',
    imageAlt: 'Beach Bunny Vibes – New OHRR Merch Fundraiser!',
    imageFit: 'contain',
  },
  {
    h: 'Midwest BunFest 2026 merchandise',
    p: 'Midwest BunFest 2026 "Binky On!" merchandise — choose your color and style in the Midwest BunFest Bonfire store.',
    href: BUNFEST_MERCH,
    cta: 'Shop BunFest merch',
    image: '/img/news/bunfest-2026-shirts.png',
    imageAlt: 'Midwest BunFest Merchandise',
    imageFit: 'contain',
  },
  {
    h: 'OHRR license plate — Drive for the Bunnies',
    p: 'Ohio drivers can order the official Ohio House Rabbit Rescue logo plate, featuring a Dutch rabbit. The logo plate is $25 a year on top of your normal fees ($15 comes to OHRR, $10 goes to the BMV); a personalized 6-character plate is $50 more a year. Order online at bmv.ohio.gov (OPLATES → "Choose logo plate" → "OH HSE RABBIT RESCUE") or in person at the BMV; plates arrive in about 20 business days.',
    href: LICENSE_PLATE,
    cta: 'License plate instructions',
    image: '/img/news/license-plate-drive-for-the-bunnies.jpg',
    imageAlt: 'Drive for the Bunnies – Get Your OHRR License Plate Today!',
    imageFit: 'cover',
  },
  {
    h: 'Become a Supporter — it\'s free',
    p: 'Fill out a short form to become an OHRR Supporter. There is no cost, and you will receive updates on our progress and how you can help.',
    href: BECOME_SUPPORTER,
    cta: 'Become a Supporter',
  },
  {
    h: 'Online affiliates',
    p: 'Shop through OHRR\'s links and a portion comes back to the bunnies — Small Pet Select (coupon code OHRR for free shipping and a donation), Cats Rabbits and More (donate a Cottontail Cottage), Bunny Approved, ResQthreads, Pawlee\'s Treat Co., Binky Bunny, Black Horse, Bissell Partners for Pets, Goodshop and Goodsearch.',
    href: ONLINE_AFFILIATES,
    cta: 'See the affiliate links',
  },
  {
    h: 'Host a fundraiser',
    p: 'Yard sales, bake sales, door-to-door sales, beer/wine tastings, coin drives, benefit concerts, sporting events, wish-list drives — supporters have done them all. Email us with your idea.',
    href: HOST_FUNDRAISER,
    cta: 'Fundraiser ideas',
    secondary: { href: OHRR.emailHref, label: `Email ${OHRR.email}` },
  },
  {
    h: 'See what your gift does',
    p: 'Rabbits adopted, rabbits taken in, spays and neuters, vet bills paid, volunteer hours — the year in numbers, updated by OHRR.',
    href: '/impact',
    cta: 'Our impact',
  },
  {
    h: 'OHRR Legacy Fund',
    p: 'Help secure the long-term future of OHRR: name OHRR as a beneficiary in your will, trust, IRA, retirement plan or life insurance; give appreciated stock, bonds or mutual funds; or make a charitable distribution from your IRA. Planned gifts and annual gifts of $1,000 or more make you a Rescue Rabbit Guardian, with recognition on the OHRR website and at the Adoption Center.',
    href: LEGACY_FUND,
    cta: 'About the Legacy Fund',
    image: '/img/news/rescue-rabbit-guardians-legacy-fund.png',
    imageAlt: 'Thanks to Our Rescue Rabbit Guardians!',
    imageFit: 'contain',
  },
  {
    h: 'Spay It Forward',
    p: 'Columbus Humane, in partnership with OHRR, launched Spay It Forward — low-cost spay and neuter services for rabbit rescues. Your donation directly supports affordable surgeries and a healthier future for rabbits in our community.',
    href: SPAY_IT_FORWARD,
    cta: 'About Spay It Forward',
  },
]

const TOP = ['Donate online', 'See what your gift does', 'OHRR Legacy Fund']
const SHOP = ['Kroger Community Rewards', 'Amazon Wish List', 'OHRR merch store', 'Midwest BunFest 2026 merchandise', 'Online affiliates']

function Row({ w }: { w: Way }) {
  const internal = w.href.startsWith('/')
  const secondaryInternal = w.secondary?.href.startsWith('/')
  return (
    <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 max-w-2xl">
        <h3 className="font-display text-lg font-extrabold text-ink">{w.h}</h3>
        <p className="mt-1 text-base text-slate-700">{w.p}</p>
        {w.extra && <p className="mt-1 text-base text-slate-700">{w.extra}</p>}
        {w.secondary &&
          (secondaryInternal ? (
            <Link to={w.secondary.href} className="mt-1 inline-block text-base font-semibold text-brand-blue">
              {w.secondary.label}
            </Link>
          ) : (
            <a
              href={w.secondary.href}
              {...(w.secondary.href.startsWith('mailto:') ? {} : ext)}
              className="mt-1 inline-block break-all text-base font-semibold text-brand-blue"
            >
              {w.secondary.label}
            </a>
          ))}
      </div>
      {internal ? (
        <Link to={w.href} className={`${btn.outline} shrink-0`}>
          {w.cta}
        </Link>
      ) : (
        <a href={w.href} {...ext} className={`${btn.outline} shrink-0`}>
          {w.cta}
        </a>
      )}
    </li>
  )
}

export default function Give() {
  const by = (names: string[]) => names.map((n) => WAYS.find((w) => w.h === n)).filter((w): w is Way => !!w)
  const top = by(TOP)
  const shop = by(SHOP)
  const more = WAYS.filter((w) => !TOP.includes(w.h) && !SHOP.includes(w.h))
  const donate = top[0]

  return (
    <>
      <PageHero
        title="Ways to give"
        subtitle="Every gift goes to the bunnies: vet care, food, and the Adoption Center. OHRR is a 501(c)(3), so your donation is tax deductible."
      />
      <Section>
        {donate && (
          <Card className="border-2 border-brand-orange/60 bg-brand-orange-50/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl font-black text-ink">{donate.h}</h2>
                <p className="mt-2 text-base text-slate-700">{donate.p}</p>
                <p className="mt-1 text-sm text-slate-700">Opens OHRR’s donation page in a new tab.</p>
              </div>
              <a href={donate.href} {...ext} className={`${btn.orange} shrink-0 !px-7 !py-3 !text-base`}>
                {donate.cta}
              </a>
            </div>
          </Card>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {top.slice(1).map((w) => (
            <Card key={w.h}>
              <h2 className="font-display text-lg font-extrabold text-ink">{w.h}</h2>
              <p className="mt-1 text-base text-slate-700">{w.p}</p>
              <div className="mt-4">
                {w.href.startsWith('/') ? (
                  <Link to={w.href} className={btn.blue}>
                    {w.cta}
                  </Link>
                ) : (
                  <a href={w.href} {...ext} className={btn.blue}>
                    {w.cta}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-black text-ink">Give while you shop</h2>
        <p className="mt-1 text-base text-slate-700">Costs you nothing extra — a share comes to the bunnies.</p>
        <ul className="mt-2 divide-y divide-slate-200">
          {shop.map((w) => (
            <Row key={w.h} w={w} />
          ))}
        </ul>

        <h2 className="mt-12 font-display text-2xl font-black text-ink">More ways to help</h2>
        <ul className="mt-2 divide-y divide-slate-200">
          {more.map((w) => (
            <Row key={w.h} w={w} />
          ))}
        </ul>

        <Callout className="mt-10">
          <p className="text-base text-slate-700">
            Thank you for your contribution to OHRR! OHRR is a 501(c)(3) organization (EIN {OHRR.ein}); your donation
            is tax deductible. Questions about giving? Email{' '}
            <a href={OHRR.emailHref} className="break-all font-semibold text-brand-blue">
              {OHRR.email}
            </a>
            .
          </p>
        </Callout>
      </Section>
    </>
  )
}
