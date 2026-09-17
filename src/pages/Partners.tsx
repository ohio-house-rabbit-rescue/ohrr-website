import { Link } from 'react-router-dom'
import { useSponsors } from '../lib/data'
import type { Sponsor, SponsorTier } from '../lib/types'
import { PageHero, Section, btn, ext, H2, Card, Callout, LinkCard, SponsorLogo } from '../components/ui'
import { OHRR, SPONSOR_TIERS, TIER_LABEL } from '../lib/constants'
import { hostOf, externalHref } from '../lib/format'

// Bigger cards for higher tiers: grid columns, logo height, name and text size.
const LAYOUT: Record<SponsorTier, { grid: string; logo: string; name: string; text: string }> = {
  presenting: { grid: 'grid gap-4', logo: 'h-20 text-4xl', name: 'text-2xl', text: 'text-base' },
  program: { grid: 'grid gap-4 md:grid-cols-2', logo: 'h-14 text-2xl', name: 'text-xl', text: 'text-sm' },
  community: { grid: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3', logo: 'h-10 text-lg', name: 'text-lg', text: 'text-sm' },
  friend: { grid: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4', logo: 'h-8 text-base', name: 'text-base', text: 'text-xs' },
}

function SponsorCard({ s }: { s: Sponsor }) {
  const l = LAYOUT[s.tier]
  const presenting = s.tier === 'presenting'
  return (
    <Card className={presenting ? 'flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8' : ''}>
      <div className={presenting ? 'flex shrink-0 items-center sm:w-56 sm:justify-center' : 'flex items-center'}>
        <SponsorLogo name={s.name} logoUrl={s.logoUrl} className={`${l.logo} max-w-[220px]`} />
      </div>
      <div className={presenting ? 'min-w-0 flex-1' : 'mt-3'}>
        <h3 className={`font-display font-extrabold text-brand-blue ${l.name}`}>{s.name}</h3>
        {s.blurb && <p className={`mt-1.5 leading-relaxed text-slate-600 ${l.text}`}>{s.blurb}</p>}
        {s.website &&
          (presenting ? (
            <a href={externalHref(s.website)} {...ext} className={`${btn.outline} mt-4`}>
              Visit {hostOf(s.website)}
            </a>
          ) : (
            <a href={externalHref(s.website)} {...ext} className="mt-2 inline-block text-sm font-semibold text-brand-blue">
              {hostOf(s.website)}
            </a>
          ))}
      </div>
    </Card>
  )
}

export default function Partners() {
  const sponsors = useSponsors()
  const tiers = SPONSOR_TIERS.map((tier) => ({ tier, list: (sponsors ?? []).filter((s) => s.tier === tier) })).filter(
    (g) => g.list.length > 0,
  )

  return (
    <>
      <PageHero
        title="Our Partners"
        subtitle="The businesses and organizations that support Ohio House Rabbit Rescue and Midwest BunFest."
      />
      <Section>
        {sponsors === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : tiers.length === 0 ? (
          <Card className="text-center">
            <p className="font-display text-lg font-extrabold text-brand-blue">
              Our BunFest 2026 partners will be announced here.
            </p>
          </Card>
        ) : (
          <div className="space-y-12">
            {tiers.map(({ tier, list }) => (
              <div key={tier}>
                <H2>{TIER_LABEL[tier]}</H2>
                <div className={`mt-5 ${LAYOUT[tier].grid}`}>
                  {list.map((s) => (
                    <SponsorCard key={s.id} s={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <LinkCard
            to="/partners/perks"
            icon="ticket"
            h="Partner perks"
            p="Offers our partners extend to the OHRR community."
            cta="See partner perks →"
          />
        </div>

        <Callout className="mt-8 text-center">
          <h2 className="font-display text-xl font-extrabold text-brand-blue">
            Interested in sponsoring OHRR or Midwest BunFest?
          </h2>
          <p className="mt-2 text-slate-700">
            We'd love to talk. Email{' '}
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              {OHRR.email}
            </a>{' '}
            or see the other{' '}
            <Link to="/give" className="font-semibold text-brand-blue">
              ways to give
            </Link>
            .
          </p>
        </Callout>
      </Section>
    </>
  )
}
