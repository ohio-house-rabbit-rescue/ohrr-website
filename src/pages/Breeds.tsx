// /learn/breeds — "What kind of bunny do I have?" (desktop edition of the
// app's guide): three questions narrow the breed cards; /learn/breeds/:slug
// is one breed. Facts from each breed's Wikipedia article; photos from
// Wikimedia Commons, credited at the foot of the page.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHero, Section, Card, btn, H2 } from '../components/ui'
import { BREEDS, BREED_PHOTO_CREDITS, COAT_LABEL, SIZE_LABEL, findBreed, type BreedCoat, type BreedEars, type BreedSize } from '../data/breeds'

type Pick<T extends string> = T | 'any'

const chip = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-bold transition ${active ? 'bg-brand-blue text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`

function Pills<T extends string>({ options, value, onChange }: { options: { key: Pick<T>; label: string }[]; value: Pick<T>; onChange: (v: Pick<T>) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)} aria-pressed={value === o.key} className={chip(value === o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Credits() {
  return (
    <details className="mt-12 text-xs text-slate-600">
      <summary className="cursor-pointer font-bold text-slate-600">Photo credits &amp; sources</summary>
      <p className="mt-2">Breed facts follow each breed’s Wikipedia article and the ARBA recognised-breeds list (checked 2026-09-21). Photos are freely licensed Wikimedia Commons images:</p>
      <ul className="mt-2 space-y-1">
        {BREED_PHOTO_CREDITS.map((c) => (
          <li key={c.slug}>
            <a href={c.source} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue underline">
              {c.author}
            </a>{' '}
            ·{' '}
            {c.licenseUrl ? (
              <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {c.license}
              </a>
            ) : (
              c.license
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}

export function BreedGuide() {
  const [ears, setEars] = useState<Pick<BreedEars>>('any')
  const [size, setSize] = useState<Pick<BreedSize>>('any')
  const [coat, setCoat] = useState<Pick<BreedCoat>>('any')
  const matches = useMemo(
    () => BREEDS.filter((b) => (ears === 'any' || b.ears === ears) && (size === 'any' || b.size === size) && (coat === 'any' || b.coat === coat)),
    [ears, size, coat],
  )
  const filtering = ears !== 'any' || size !== 'any' || coat !== 'any'

  return (
    <>
      <PageHero title="What kind of bunny do I have?" subtitle="Answer three questions and see the breeds that fit. Most rabbits are a mix — and that’s fine." />
      <Section>
        <Card className="max-w-3xl border-brand-orange/20 bg-brand-orange-50/50">
          <p className="text-base leading-relaxed text-slate-700">
            <span className="font-bold text-ink">Most rescue rabbits are mixed breed.</span> If your bunny doesn’t match one card exactly, that’s normal — care is the same for every rabbit. This guide is for curiosity, not paperwork.
          </p>
        </Card>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Ears</p>
            <div className="mt-2">
              <Pills<BreedEars> options={[{ key: 'any', label: 'Not sure' }, { key: 'lop', label: 'Hang down (lop)' }, { key: 'upright', label: 'Stand up' }]} value={ears} onChange={setEars} />
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Grown weight</p>
            <div className="mt-2">
              <Pills<BreedSize> options={[{ key: 'any', label: 'Not sure' }, ...(Object.keys(SIZE_LABEL) as BreedSize[]).map((k) => ({ key: k, label: SIZE_LABEL[k] }))]} value={size} onChange={setSize} />
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Coat</p>
            <div className="mt-2">
              <Pills<BreedCoat> options={[{ key: 'any', label: 'Not sure' }, ...(Object.keys(COAT_LABEL) as BreedCoat[]).map((k) => ({ key: k, label: COAT_LABEL[k] }))]} value={coat} onChange={setCoat} />
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <H2>{filtering ? `${matches.length} breed${matches.length === 1 ? ' fits' : 's fit'}` : `${BREEDS.length} breeds`}</H2>
          {filtering && (
            <button type="button" onClick={() => { setEars('any'); setSize('any'); setCoat('any') }} className="text-sm font-bold text-brand-blue">
              Clear
            </button>
          )}
        </div>
        {matches.length === 0 ? (
          <p className="mt-4 text-slate-600">No recognised breed matches all three answers — which usually means a mix. Try “Not sure” on one of them.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {matches.map((b) => (
              <Link key={b.slug} to={`/learn/breeds/${b.slug}`} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="aspect-square w-full bg-slate-100">
                  <img src={b.photo} alt={b.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="font-display text-base font-extrabold text-ink">{b.name}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {b.ears === 'lop' ? 'Lop ears' : 'Upright ears'} · {SIZE_LABEL[b.size]}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Card className="mt-12 max-w-3xl">
          <p className="font-display text-lg font-extrabold text-brand-blue">Adopting? Breed matters less than you think.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">Temperament comes from the individual rabbit, not the breed. Meet the rabbits at the Adoption Center and let one pick you.</p>
          <Link to="/adopt" className={`${btn.orange} mt-4`}>
            See who’s waiting
          </Link>
        </Card>
        <Credits />
      </Section>
    </>
  )
}

export function BreedDetail() {
  const { slug } = useParams()
  const b = findBreed(slug)
  if (!b) {
    return (
      <>
        <PageHero title="Breed not found" subtitle="" />
        <Section>
          <Link to="/learn/breeds" className={btn.blue}>
            All breeds
          </Link>
        </Section>
      </>
    )
  }
  const similar = BREEDS.filter((o) => o.slug !== b.slug && o.ears === b.ears && (o.size === b.size || o.coat === b.coat)).slice(0, 4)
  return (
    <>
      <PageHero title={b.name} subtitle={`${b.ears === 'lop' ? 'Lop ears' : 'Upright ears'} · ${COAT_LABEL[b.coat]} · ${SIZE_LABEL[b.size]}`} />
      <Section>
        <Link to="/learn/breeds" className="text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
          ← What kind of bunny do I have?
        </Link>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
            <img src={b.photo} alt={b.name} className="aspect-[4/3] w-full object-cover" />
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">How to tell</p>
              <p className="mt-1 text-base leading-relaxed text-slate-700">{b.look}</p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Grown weight</p>
              <p className="mt-1 text-base text-slate-700">{b.weight}</p>
            </div>
            {b.colours && (
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Colours</p>
                <p className="mt-1 text-base text-slate-700">{b.colours}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Where it comes from</p>
              <p className="mt-1 text-base leading-relaxed text-slate-700">{b.origin}</p>
            </div>
            <p className="text-xs text-slate-600">
              Facts from{' '}
              <a href={b.source} target="_blank" rel="noopener noreferrer" className="underline">
                Wikipedia
              </a>{' '}
              (checked 2026-09-21).
            </p>
          </div>
        </div>
        <Card className="mt-10 max-w-3xl border-brand-orange/20 bg-brand-orange-50/50">
          <p className="text-base leading-relaxed text-slate-700">
            Every breed needs the same things: unlimited hay, a rabbit-savvy vet, a spay or neuter, and room to run. See{' '}
            <Link to="/learn" className="font-semibold text-brand-blue">
              Rabbit care
            </Link>
            .
          </p>
        </Card>
        {similar.length > 0 && (
          <div className="mt-12">
            <H2>Easily confused with</H2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              {similar.map((o) => (
                <Link key={o.slug} to={`/learn/breeds/${o.slug}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                  <img src={o.photo} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{o.name}</span>
                    <span className="block text-xs text-slate-600">{SIZE_LABEL[o.size]}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <Credits />
      </Section>
    </>
  )
}
