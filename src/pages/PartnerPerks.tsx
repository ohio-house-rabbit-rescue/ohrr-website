import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSponsors } from '../lib/data'
import type { Sponsor } from '../lib/types'
import { PageHero, Section, btn, ext, Card, SponsorLogo } from '../components/ui'
import { TIER_LABEL } from '../lib/constants'
import { hostOf, externalHref } from '../lib/format'

function PerkCard({ s }: { s: Sponsor }) {
  const [show, setShow] = useState(false)
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3">
        <SponsorLogo name={s.name} logoUrl={s.logoUrl} className="h-12 max-w-[140px] text-xl" />
        <div className="min-w-0">
          <h3 className="font-display text-base font-extrabold text-ink">{s.name}</h3>
          <p className="text-xs font-semibold text-slate-600">{TIER_LABEL[s.tier]}</p>
        </div>
      </div>
      <p className="mt-4 font-display text-lg font-extrabold text-brand-blue">{s.perkTitle}</p>
      {s.perkDetail && (
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{s.perkDetail}</p>
      )}
      {s.perkCode && (
        <div className="mt-4">
          {show ? (
            <p className="text-sm text-slate-600">
              Code:{' '}
              <span className="select-all rounded-lg bg-brand-orange-50 px-2.5 py-1 font-display text-base font-black tracking-wider text-brand-orange-dark">
                {s.perkCode}
              </span>
            </p>
          ) : (
            <button type="button" onClick={() => setShow(true)} className={btn.outline}>
              Show code
            </button>
          )}
        </div>
      )}
      {s.website && (
        <a href={externalHref(s.website)} {...ext} className="mt-3 text-sm font-semibold text-brand-blue">
          {hostOf(s.website)}
        </a>
      )}
    </Card>
  )
}

export default function PartnerPerks() {
  const sponsors = useSponsors()
  const perks = (sponsors ?? []).filter((s) => s.perkTitle && s.perkTitle.trim())

  return (
    <>
      <PageHero title="Partner perks" subtitle="Offers our partners extend to the OHRR community." />
      <Section>
        {sponsors === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : perks.length === 0 ? (
          <Card className="text-center">
            <p className="font-display text-lg font-extrabold text-brand-blue">
              No partner perks are available right now — check back soon.
            </p>
            <Link to="/partners" className={`${btn.blue} mt-4`}>
              Our Partners
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((s) => (
              <PerkCard key={s.id} s={s} />
            ))}
          </div>
        )}
        <div className="mt-10">
          <Link to="/partners" className="text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
            ← Our Partners
          </Link>
        </div>
      </Section>
    </>
  )
}
