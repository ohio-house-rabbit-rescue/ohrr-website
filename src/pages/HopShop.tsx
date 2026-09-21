import { Link } from 'react-router-dom'
import { useHopShopProducts } from '../lib/data'
import { PageHero, Section, btn, ext, H2, Card, Callout, LiveNote } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { formatPrice } from '../lib/format'
import { OHRR, WISH_LIST_PAGE } from '../lib/constants'

const PRODUCTS = [
  'Pellets',
  'Hay',
  'Litter',
  'Hidey houses (Cottontail Cottages and Maze Havens)',
  'Treats',
  'Supplements',
  'Critical Care',
  'Bunny-safe toys',
  'Grooming brushes',
  'Bunny-related apparel, accessories, art',
  '… and more!',
]

export default function HopShop() {
  const products = useHopShopProducts()

  return (
    <>
      <PageHero
        title="The Hop Shop"
        subtitle="Did you know OHRR has its very own shop where you can purchase food, supplies and toys? The profits go to support OHRR."
      />
      <PresentedBy surface="hop-shop" />
      <Section>
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-base leading-relaxed text-slate-700">
              The Hop Shop is located at the OHRR Adoption Center and is open during adoption-center hours. Not
              only will you be able to purchase healthy and safe products for your bunny, but the profits go to
              support OHRR!
            </p>

            <H2 className="mt-10">Products for purchase</H2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {PRODUCTS.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="text-brand-orange">●</span> {p}
                </li>
              ))}
            </ul>

            {products && products.length > 0 && (
              <div className="mt-12">
                <H2>On the shelf now</H2>
                <LiveNote source="live" />
                <p className="mt-2 text-sm text-slate-500">Buy at the Adoption Center counter. Counts change as things sell.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {products.map((p) => (
                    <Card key={p.id} className={`flex gap-4 ${p.in_stock === false ? 'opacity-60' : ''}`}>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 font-display text-2xl font-black text-brand-blue">
                          {p.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-display text-base font-extrabold text-ink">{p.name}</h3>
                          {p.price_cents > 0 && <span className="text-sm font-bold text-brand-orange-dark">{formatPrice(p.price_cents)}</span>}
                        </div>
                        {p.description && <p className="mt-1.5 text-sm text-slate-600">{p.description}</p>}
                        {p.in_stock === false && <p className="mt-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Sold out — ask at the counter</p>}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              <Card>
                <h3 className="font-display text-lg font-extrabold text-brand-blue">Setting up a bunny space?</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Many of the items in our Bunny Living Space guide are available in the Hop Shop. If we're
                  out of stock, we can tell you where they can typically be purchased.
                </p>
                <Link to="/learn/bunny-living-space" className="mt-2 inline-block text-sm font-bold text-brand-orange">
                  Bunny Living Space →
                </Link>
              </Card>
              <Card>
                <h3 className="font-display text-lg font-extrabold text-brand-blue">Donate supplies instead</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Our wish list has the cleaning supplies, bunny supplies and toys the Adoption Center uses
                  every day.
                </p>
                <a href={WISH_LIST_PAGE} {...ext} className="mt-2 inline-block text-sm font-bold text-brand-orange">
                  See the wish list →
                </a>
              </Card>
            </div>
          </div>

          <aside>
            <Callout className="!p-6">
              <h2 className="font-display text-lg font-extrabold text-brand-blue">Hop Shop hours</h2>
              <p className="mt-3 text-base font-semibold text-slate-700">{OHRR.hours}</p>
              <p className="mt-1 text-sm text-slate-600">{OHRR.hoursNote}</p>
              <h2 className="mt-5 font-display text-lg font-extrabold text-brand-blue">Address</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                OHRR Adoption Center and Hop Shop
                <br />
                {OHRR.street}
                <br />
                {OHRR.cityStateZip}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{OHRR.landmark}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={OHRR.mapsHref} {...ext} className={btn.blue}>
                  Get directions
                </a>
                <a href={OHRR.phoneHref} className={btn.outline}>
                  Call {OHRR.phone}
                </a>
              </div>
            </Callout>
          </aside>
        </div>
      </Section>
    </>
  )
}
