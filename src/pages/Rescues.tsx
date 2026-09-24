import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, Card, ext } from '../components/ui'
import { Icon } from '../components/icons'
import { useRescues, REGIONS, initials, telHref, mapsHref, stateName, type Rescue } from '../lib/rescues'
import { externalHref, hostOf } from '../lib/format'

// /rescues — "Find a Rescue": the same directory the app shows, searchable by
// name or state, with region and "At BunFest this year" filters. Website twin of
// ohrr-app/src/pages/Partners.tsx (mounted there at /rescues).

const AT_BUNFEST = 'At BunFest this year'

const badge = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold'

// Contact lines exactly as the app's detail shows them — address as text (with a
// map link), phone as tap-to-call, email as mailto, website as its domain. OHRR's
// own row (the host) shows email only: no phone number on the site.
export function RescueContact({ r, compact = false }: { r: Rescue; compact?: boolean }) {
  const link = 'font-semibold text-brand-blue hover:text-brand-blue-dark'
  const rows = [
    r.address && (
      <p key="address" className="flex items-start gap-2 text-sm text-slate-700">
        <Icon name="mappin" size={16} className="mt-0.5 shrink-0 text-brand-blue" />
        <span>
          {r.address}{' '}
          <a href={mapsHref(r)} {...ext} className={link}>
            (map)
          </a>
        </span>
      </p>
    ),
    r.phone && !r.host && (
      <p key="phone" className="flex items-center gap-2 text-sm">
        <Icon name="phone" size={16} className="shrink-0 text-brand-blue" />
        <a href={telHref(r.phone)} className={link}>
          {r.phone}
        </a>
      </p>
    ),
    r.email && (
      <p key="email" className="flex items-center gap-2 text-sm">
        <Icon name="mail" size={16} className="shrink-0 text-brand-blue" />
        <a href={`mailto:${r.email}`} className={`break-all ${link}`}>
          {r.email}
        </a>
      </p>
    ),
    r.url && (
      <p key="url" className="flex items-center gap-2 text-sm">
        <Icon name="external" size={16} className="shrink-0 text-brand-blue" />
        <a href={externalHref(r.url)} {...ext} className={`break-all ${link}`}>
          {hostOf(r.url)}
        </a>
      </p>
    ),
  ].filter(Boolean)
  if (rows.length === 0) return null
  return <div className={compact ? 'mt-3 space-y-1.5' : 'space-y-3'}>{rows}</div>
}

function RescueCard({ r }: { r: Rescue }) {
  return (
    <Card className={r.host ? 'ring-1 ring-brand-blue/30' : ''}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 font-display text-base font-black text-brand-blue"
        >
          {initials(r.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-extrabold leading-tight text-ink">
            <Link to={`/rescues/${r.id}`} className="hover:text-brand-blue">
              {r.name}
            </Link>
          </h3>
          {r.location && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
              <Icon name="mappin" size={14} className="shrink-0 text-slate-500" /> {r.location}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {r.host && <span className={`${badge} bg-brand-blue-50 text-brand-blue`}>Host</span>}
            {r.atBunfest && <span className={`${badge} bg-brand-orange-50 text-brand-orange-dark`}>At BunFest</span>}
            {r.region && <span className={`${badge} bg-slate-100 text-slate-600`}>{r.region}</span>}
          </div>
        </div>
      </div>
      <RescueContact r={r} compact />
      <Link to={`/rescues/${r.id}`} className="mt-3 inline-block text-sm font-bold text-brand-orange">
        Details →
      </Link>
    </Card>
  )
}

export default function Rescues() {
  const { items: rescues, loading } = useRescues()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<string>('All')
  const [state, setState] = useState<string>('')

  // "At BunFest this year" first when the directory knows who is coming, then the
  // regions actually present, in display order.
  const someAtBunfest = rescues.some((r) => r.atBunfest)
  const regionTabs = useMemo(
    () => ['All', ...(someAtBunfest ? [AT_BUNFEST] : []), ...REGIONS.filter((rg) => rescues.some((r) => r.region === rg))],
    [rescues, someAtBunfest],
  )

  // States present in the directory, by full name.
  const states = useMemo(
    () =>
      Array.from(new Set(rescues.map((r) => r.state?.toUpperCase()).filter((s): s is string => Boolean(s)))).sort(
        (a, b) => stateName(a).localeCompare(stateName(b)),
      ),
    [rescues],
  )

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rescues.filter((r) => {
      const inRegion = region === 'All' ? true : region === AT_BUNFEST ? r.atBunfest : r.region === region
      const inState = state ? (r.state ?? '').toUpperCase() === state : true
      const full = r.state ? stateName(r.state) : ''
      const hay = `${r.name} ${r.location} ${r.city ?? ''} ${r.state ?? ''} ${full} ${r.region ?? ''}`.toLowerCase()
      return inRegion && inState && (!q || hay.includes(q))
    })
  }, [query, region, state, rescues])

  const countLine = someAtBunfest
    ? `${rescues.filter((r) => r.atBunfest).length} rescues at BunFest this year, ${rescues.length} in the directory.`
    : `${rescues.length} rabbit rescues & humane organizations — find one near you.`

  return (
    <>
      <PageHero
        title="Find a Rescue"
        subtitle="Rabbit rescues across the country — search by name, state, or region."
      />
      <Section>
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : rescues.length === 0 ? (
          <Card className="text-center">
            <p className="font-display text-lg font-extrabold text-brand-blue">
              The rescue directory is being set up.
            </p>
            <p className="mt-2 text-base text-slate-700">
              Rescues appear here as OHRR staff add them. In the meantime, our{' '}
              <Link to="/learn/vets" className="font-semibold text-brand-blue">
                rabbit-savvy vet list
              </Link>{' '}
              and{' '}
              <Link to="/surrender" className="font-semibold text-brand-blue">
                found-a-rabbit page
              </Link>{' '}
              can help.
            </p>
          </Card>
        ) : (
          <>
            <p className="text-base text-slate-700">{countLine}</p>

            {/* Search + state filter */}
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20">
                <Icon name="search" size={20} className="shrink-0 text-slate-500" />
                <span className="sr-only">Search by name or state</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or state…"
                  className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="shrink-0 rounded-full p-1 text-slate-500 hover:text-slate-700"
                  >
                    <Icon name="x" size={18} />
                  </button>
                )}
              </label>
              {states.length > 0 && (
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="shrink-0">State</span>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-ink shadow-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                  >
                    <option value="">All states</option>
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {stateName(s)} ({s})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* Region / At BunFest filter */}
            {regionTabs.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by region">
                {regionTabs.map((t) => {
                  const on = region === t
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setRegion(t)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        on
                          ? t === AT_BUNFEST
                            ? 'bg-brand-orange text-white'
                            : 'bg-brand-blue text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            )}

            {list.length === 0 ? (
              <p className="mt-6 text-base text-slate-700">
                No rescues match that. Try a different name, state, or region.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {list.map((r) => (
                  <RescueCard key={r.id} r={r} />
                ))}
              </div>
            )}
          </>
        )}
      </Section>
    </>
  )
}
