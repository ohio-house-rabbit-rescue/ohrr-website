// /impact — the year in numbers (published rows from impact_years, the same
// table staff edit in the app or under Staff → Impact here). Printable, so
// it can go in a sponsor packet or a donor letter.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, Card, btn, PrintButton } from '../components/ui'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { OHRR } from '../lib/constants'

export interface ImpactYear {
  org_id: string
  year: number
  adopted: number | null
  taken_in: number | null
  spay_neuter: number | null
  vet_care_cents: number | null
  volunteer_hours: number | null
  fosters: number | null
  bunfest_attendance: number | null
  highlights: string[]
  note: string | null
  is_published: boolean
}

export const IMPACT_FIELDS: { key: keyof ImpactYear; label: string; hint: string; money?: boolean }[] = [
  { key: 'adopted', label: 'Rabbits adopted', hint: 'Adoptions completed in the year' },
  { key: 'taken_in', label: 'Rabbits taken in', hint: 'Rescues, Good Samaritan and owner surrenders admitted' },
  { key: 'spay_neuter', label: 'Spays & neuters', hint: 'Including Fix-a-Bun' },
  { key: 'vet_care_cents', label: 'Spent on vet care', hint: 'Dollars — enter without the $', money: true },
  { key: 'volunteer_hours', label: 'Volunteer hours', hint: 'From the app’s Hours tab, or your own count' },
  { key: 'fosters', label: 'Foster homes', hint: 'Households that fostered at least once' },
  { key: 'bunfest_attendance', label: 'BunFest attendance', hint: 'People through the door' },
]
export const fmtNumber = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }))
export const fmtMoney = (c: number | null | undefined) => (c == null ? '—' : `$${Math.round(c / 100).toLocaleString('en-US')}`)

export default function Impact() {
  const [years, setYears] = useState<ImpactYear[] | null>(null)
  const [pick, setPick] = useState<number | null>(null)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setYears([])
      return
    }
    supabase
      .from('impact_years')
      .select('*')
      .eq('is_published', true)
      .order('year', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as ImpactYear[]
        setYears(rows)
        setPick(rows[0]?.year ?? null)
      })
  }, [])
  const y = years?.find((r) => r.year === pick) ?? null

  return (
    <>
      <PageHero title="Our impact" subtitle="What your gifts, hours and adoptions added up to." />
      <Section>
        {years && years.length === 0 && (
          <Card className="max-w-xl">
            <p className="font-bold text-ink">This year’s numbers are being counted.</p>
            <p className="mt-1 text-sm text-slate-600">
              Ask us anything at{' '}
              <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
                {OHRR.email}
              </a>
              .
            </p>
          </Card>
        )}
        {years && years.length > 0 && (
          <div className="no-print flex flex-wrap items-center gap-2">
            {years.map((r) => (
              <button key={r.year} type="button" onClick={() => setPick(r.year)} className={pick === r.year ? btn.blue : btn.outline}>
                {r.year}
              </button>
            ))}
            <PrintButton label="Print this page" />
          </div>
        )}
        {y && (
          <div className="mt-8">
            <h2 className="font-display text-3xl font-black text-ink">{y.year}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {IMPACT_FIELDS.filter((f) => y[f.key] != null).map((f) => (
                <Card key={f.key} className="text-center">
                  <p className="font-display text-4xl font-black text-brand-blue">{f.money ? fmtMoney(y[f.key] as number) : fmtNumber(y[f.key] as number)}</p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-slate-500">{f.label}</p>
                </Card>
              ))}
            </div>
            {y.note && <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-700">{y.note}</p>}
            {y.highlights.length > 0 && (
              <div className="mt-8 max-w-2xl">
                <h3 className="font-display text-xl font-extrabold text-ink">Highlights</h3>
                <ul className="mt-3 space-y-2">
                  {y.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-base text-slate-700">
                      <span className="text-brand-orange">●</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="no-print mt-10 flex flex-wrap gap-2">
              <Link to="/give" className={btn.orange}>
                Give
              </Link>
              <Link to="/volunteer" className={btn.outline}>
                Volunteer
              </Link>
              <Link to="/partners" className={btn.outline}>
                Sponsor
              </Link>
            </div>
          </div>
        )}
      </Section>
    </>
  )
}
