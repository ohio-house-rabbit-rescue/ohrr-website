import { useSearchParams } from 'react-router-dom'
import { useVets } from '../lib/data'
import type { Vet } from '../lib/types'
import { PageHero, Section, LiveNote, ext, PrintButton, H2 } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import {
  VET_REGIONS,
  VETS_DISCLAIMER,
  AFTER_HOURS_NOTE,
  BHRS_VET_LIST,
  CHRS_VET_LIST,
  HRS_FIND_A_VET,
} from '../data/vets'

function telHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '').slice(-10)}`
}

function mapsHref(v: Vet): string {
  const q = [v.name, v.address, v.city].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

function VetCard({ v }: { v: Vet }) {
  const hasStreet = v.address && !/^in-home/i.test(v.address)
  return (
    <div className="print-break-inside-avoid rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-extrabold text-ink">{v.name}</h3>
        {v.isEmergency && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
            24/7 emergencies
          </span>
        )}
        {v.isLowCostSpay && (
          <span className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-bold text-brand-blue">
            Low-cost spay/neuter
          </span>
        )}
        {v.givesRhdv2 && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
            RHDV2 vaccine
          </span>
        )}
      </div>
      {v.doctors && <p className="mt-1 text-sm font-semibold text-slate-500">{v.doctors}</p>}
      {v.notes && <p className="mt-1.5 text-sm text-slate-600">{v.notes}</p>}
      {v.givesRhdv2 && v.rhdv2Note && <p className="mt-1.5 text-sm text-slate-600">RHDV2 vaccine: {v.rhdv2Note}</p>}
      {(v.address || v.city) && (
        <p className="mt-2 text-sm text-slate-700">
          {v.address}
          {v.address && v.city ? <br /> : null}
          {v.city}
          {hasStreet && (
            <>
              {' '}
              <a href={mapsHref(v)} {...ext} className="no-print font-semibold text-brand-blue">
                (map)
              </a>
            </>
          )}
        </p>
      )}
      <p className="mt-2 space-x-3 text-sm">
        {v.phone && (
          <a href={telHref(v.phone)} className="font-bold text-brand-blue">
            {v.phone}
          </a>
        )}
        {v.phone2 && (
          <a href={telHref(v.phone2)} className="font-bold text-brand-blue">
            {v.phone2}
          </a>
        )}
      </p>
      {v.email && (
        <p className="mt-1 text-sm">
          <a href={`mailto:${v.email}`} className="font-semibold text-brand-blue">
            {v.email}
          </a>
        </p>
      )}
      {v.website && (
        <p className="mt-1 text-sm">
          <a href={v.website} {...ext} className="font-semibold text-brand-blue">
            {hostOf(v.website)}
          </a>
        </p>
      )}
    </div>
  )
}

export default function Vets() {
  const { vets, source } = useVets()
  const [params, setParams] = useSearchParams()
  const onlyRhdv2 = params.get('rhdv2') === '1'
  const all = vets ?? []
  const rhdv2Count = all.filter((v) => v.givesRhdv2).length
  const list = onlyRhdv2 ? all.filter((v) => v.givesRhdv2) : all
  const medvet = all.find((v) => /medvet hilliard/i.test(v.name))
  const regions = [
    ...VET_REGIONS.filter((r) => list.some((v) => v.region === r)),
    ...Array.from(new Set(list.map((v) => v.region))).filter((r) => !(VET_REGIONS as readonly string[]).includes(r)),
  ]

  return (
    <>
      <PageHero
        title="Rabbit-savvy vets in Ohio"
        subtitle="Rabbits are exotic pets with different needs than dogs or cats. These vets are available for rabbit care."
      />
      <PresentedBy surface="find-a-vet" />
      <Section>
        <div className="no-print flex flex-wrap items-center gap-3">
          <PrintButton label="Print the vet list" />
          {rhdv2Count > 0 && (
            <button
              type="button"
              aria-pressed={onlyRhdv2}
              onClick={() => setParams(onlyRhdv2 ? {} : { rhdv2: '1' }, { replace: true })}
              className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
                onlyRhdv2 ? 'bg-emerald-700 text-white' : 'border border-emerald-700/40 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              {onlyRhdv2 ? 'Showing vets that give the RHDV2 vaccine — show all' : `Vets that give the RHDV2 vaccine (${rhdv2Count})`}
            </button>
          )}
        </div>
        <p className="print-only font-display text-2xl font-black">Ohio House Rabbit Rescue — Vets for rabbit care</p>

        {/* After-hours emergencies */}
        <div className="print-break-inside-avoid mt-6 rounded-3xl border-2 border-red-200 bg-red-50 p-6 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-wider text-red-700">After-hours emergencies</p>
          <p className="mt-2 font-display text-xl font-extrabold text-ink">{AFTER_HOURS_NOTE}</p>
          {medvet && (
            <p className="mt-3 text-sm text-slate-700">
              <strong>{medvet.name}</strong>
              {medvet.address && (
                <>
                  {' '}
                  · {medvet.address}, {medvet.city}
                </>
              )}
              {medvet.phone && (
                <>
                  {' '}
                  ·{' '}
                  <a href={telHref(medvet.phone)} className="font-bold text-brand-blue">
                    {medvet.phone}
                  </a>
                </>
              )}
              {medvet.notes && <> · {medvet.notes}</>}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-600">
            Other vets marked <span className="font-bold text-red-700">24/7 emergencies</span> below also see rabbits
            after hours in their regions.
          </p>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-slate-600">{VETS_DISCLAIMER}</p>
        {vets !== null && <LiveNote source={source} />}

        {vets === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading…</p>
        ) : (
          regions.map((region) => (
            <div key={region} className="mt-10">
              <H2>{region}</H2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list
                  .filter((v) => v.region === region)
                  .map((v) => (
                    <VetCard key={v.id} v={v} />
                  ))}
              </div>
            </div>
          ))
        )}

        <div className="print-urls mt-12 rounded-3xl bg-brand-blue-50 p-6 sm:p-8">
          <h2 className="font-display text-xl font-extrabold text-brand-blue">More vet lists</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              <a href={BHRS_VET_LIST} {...ext} className="font-semibold text-brand-blue">
                Buckeye House Rabbit Society vet list
              </a>
            </li>
            <li>
              <a href={CHRS_VET_LIST} {...ext} className="font-semibold text-brand-blue">
                Columbus House Rabbit Society vet list
              </a>
            </li>
            <li>
              How do I find a rabbit-savvy vet?{' '}
              <a href={HRS_FIND_A_VET} {...ext} className="font-semibold text-brand-blue">
                The House Rabbit Society explains
              </a>
              .
            </li>
          </ul>
        </div>
      </Section>
    </>
  )
}
