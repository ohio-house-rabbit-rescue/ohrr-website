import { Link, useParams } from 'react-router-dom'
import { Section, Card, btn, ext } from '../components/ui'
import { Icon } from '../components/icons'
import { useRescues, initials } from '../lib/rescues'
import { externalHref } from '../lib/format'
import { RescueContact } from './Rescues'

function H({ children }: { children: string }) {
  return <h2 className="font-display text-xl font-extrabold text-ink">{children}</h2>
}

// /rescues/:id — one rescue's page: name, place, contact rows people can tap,
// and a few more rescues to look at. Website twin of ohrr-app/src/pages/PartnerDetail.tsx.

export default function RescueDetail() {
  const { id } = useParams()
  const { items: rescues, loading } = useRescues()
  const rescue = rescues.find((r) => r.id === id)

  if (!rescue && loading) {
    return (
      <Section>
        <p className="text-sm text-slate-600">Loading…</p>
      </Section>
    )
  }
  if (!rescue) {
    return (
      <Section className="text-center">
        <h1 className="font-display text-2xl font-black text-ink">Rescue not found</h1>
        <p className="mt-2 text-base text-slate-700">It may have been removed from the directory.</p>
        <Link to="/rescues" className={`${btn.blue} mt-5`}>
          Find a Rescue
        </Link>
      </Section>
    )
  }

  const r = rescue
  // The host's own phone is never shown, so it doesn't count as a contact detail.
  const hasContact = Boolean(r.address || (r.phone && !r.host) || r.email || r.url)
  const others = rescues.filter((x) => x.id !== r.id && !x.host).slice(0, 4)

  return (
    <Section>
      <Link to="/rescues" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
        <Icon name="arrowLeft" size={16} /> Find a Rescue
      </Link>

      <div className="mt-5 flex items-start gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-blue-50 font-display text-2xl font-black text-brand-blue"
        >
          {initials(r.name)}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-black leading-tight text-ink md:text-4xl">{r.name}</h1>
          {r.location && (
            <p className="mt-1.5 flex items-center gap-1.5 text-base text-slate-600">
              <Icon name="mappin" size={16} className="shrink-0 text-slate-500" /> {r.location}
              {r.region && <span className="text-slate-500">· {r.region}</span>}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.host && (
              <span className="inline-flex items-center rounded-full bg-brand-orange-50 px-2.5 py-0.5 text-sm font-bold text-brand-orange-ink">
                Host of Midwest BunFest
              </span>
            )}
            {r.atBunfest && !r.host && (
              <span className="inline-flex items-center rounded-full bg-brand-orange-50 px-2.5 py-0.5 text-sm font-bold text-brand-orange-ink">
                At BunFest this year
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1fr]">
        <div>
          <H>Contact</H>
          <Card className="mt-3">
            {hasContact ? (
              <RescueContact r={r} />
            ) : (
              <p className="text-base text-slate-700">We don't have published contact details for this rescue yet.</p>
            )}
          </Card>
          {r.url && (
            <a href={externalHref(r.url)} {...ext} className={`${btn.outline} mt-3 w-full`}>
              Visit website <Icon name="external" size={14} className="ml-1.5" />
            </a>
          )}
        </div>

        {r.blurb && (
          <div>
            <H>About</H>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700">{r.blurb}</p>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="mt-12">
          <H>More rescue partners</H>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {others.map((o) => (
              <Link
                key={o.id}
                to={`/rescues/${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-display text-sm font-black text-slate-600"
                >
                  {initials(o.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-extrabold text-ink">{o.name}</span>
                  {o.location && <span className="block text-sm text-slate-600">{o.location}</span>}
                </span>
                <Icon name="chevron" size={18} className="shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}
