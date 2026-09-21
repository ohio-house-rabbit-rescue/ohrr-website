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
    href: WISH_LIST_PAGE,
    cta: 'See the wish list',
    secondary: { href: AMAZON_WISH_LIST, label: 'Open the Amazon list' },
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

export default function Give() {
  return (
    <>
      <PageHero
        title="Ways to give"
        subtitle={`Every gift is tax-deductible — OHRR is a 501(c)(3) nonprofit (EIN ${OHRR.ein}). Here is every way to support the bunnies.`}
      />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WAYS.map((w) => (
            <Card key={w.h} className="flex flex-col overflow-hidden">
              {w.image && (
                <div className="-mx-5 -mt-5 mb-4 aspect-[4/3] border-b border-black/5 bg-white">
                  <img
                    src={w.image}
                    alt={w.imageAlt ?? w.h}
                    loading="lazy"
                    className={`h-full w-full ${w.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                  />
                </div>
              )}
              <h3 className="font-display text-lg font-extrabold text-brand-blue">{w.h}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{w.p}</p>
              {w.extra && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{w.extra}</p>}
              <div className="mt-4 flex flex-wrap gap-2 pt-1">
                {w.href.startsWith('/') ? (
                  <Link to={w.href} className={btn.orange}>
                    {w.cta}
                  </Link>
                ) : (
                  <a href={w.href} {...(w.href.startsWith('mailto:') ? {} : ext)} className={btn.orange}>
                    {w.cta}
                  </a>
                )}
                {w.secondary && (
                  <a
                    href={w.secondary.href}
                    {...(w.secondary.href.startsWith('mailto:') ? {} : ext)}
                    className={btn.outline}
                  >
                    {w.secondary.label}
                  </a>
                )}
              </div>
            </Card>
          ))}
          <Card className="flex flex-col">
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Shop the Hop Shop</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Pellets, hay, litter, hidey houses, treats, toys and bunny apparel at the Adoption Center,
              Saturdays and Sundays noon – 4:00 pm. Profits support OHRR.
            </p>
            <div className="mt-4 pt-1">
              <Link to="/hop-shop" className={btn.blue}>
                About the Hop Shop
              </Link>
            </div>
          </Card>
        </div>

        <Callout className="mt-10">
          <p className="text-sm leading-relaxed text-slate-700">
            Thank you for your contribution to OHRR! Please remember that OHRR is a 501(c)(3) organization
            (EIN {OHRR.ein}). Your donation is tax deductible. Questions about giving? Email{' '}
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              {OHRR.email}
            </a>
            .
          </p>
        </Callout>
      </Section>
    </>
  )
}
