// One adoptable rabbit, in full: photos, the facts, OHRR's own write-up and
// the way to apply. The list cards only have room for two lines of each story;
// this is where the rest lives. Same `rabbits` table the app reads.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRabbits } from '../lib/data'
import { APPLY, OHRR } from '../lib/constants'
import { Card, PrintButton, Section, btn } from '../components/ui'

export default function AdoptRabbit() {
  const { id } = useParams()
  const { rabbits } = useRabbits(200)
  const r = rabbits?.find((x) => x.id === id)
  const [shown, setShown] = useState(0)

  if (rabbits === null) {
    return (
      <Section>
        <p className="text-slate-600">Loading…</p>
      </Section>
    )
  }
  if (!r) {
    return (
      <Section>
        <h1 className="font-display text-3xl font-black text-ink">This rabbit may have found a home</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          They’re no longer on the list — plenty of others are still looking.
        </p>
        <Link to="/adopt" className={`${btn.blue} mt-6`}>
          See the rabbits looking for homes
        </Link>
      </Section>
    )
  }

  const photos = r.photos && r.photos.length > 0 ? r.photos : r.photo ? [r.photo] : []
  const facts = [r.age, r.sex, r.breed, r.size && `${r.size} size`].filter(Boolean).join(' · ')
  const goodToKnow = [
    r.spayedNeutered && 'Spayed / neutered',
    r.houseTrained && 'Litter-trained',
    (r.tags ?? []).some((t) => /special needs/i.test(t)) && 'Special needs',
    ...(r.tags ?? []).filter((t) => /together with/i.test(t)),
  ].filter(Boolean) as string[]

  return (
    <Section className="print-urls">
      <p className="no-print text-sm">
        <Link to="/adopt" className="font-semibold text-brand-blue">
          ← All the rabbits looking for homes
        </Link>
      </p>

      <div className="mt-4 grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5">
            {photos[shown] ? (
              <img src={photos[shown]} alt={`${r.name}, photo ${shown + 1}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-6xl font-black text-slate-300">
                {r.name.slice(0, 1)}
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="no-print mt-3 flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setShown(i)}
                  aria-label={`Show photo ${i + 1} of ${r.name}`}
                  aria-pressed={shown === i}
                  className={`h-20 w-20 overflow-hidden rounded-xl ring-2 ${shown === i ? 'ring-brand-blue' : 'ring-transparent'}`}
                >
                  <img src={p} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-4xl font-black text-ink">{r.name}</h1>
            {r.bonded && (
              <span className="rounded-full bg-brand-orange-50 px-3 py-1 text-sm font-bold text-brand-orange-ink">
                Bonded pair
              </span>
            )}
            {r.status && !/available|adoptable/i.test(r.status) && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">{r.status}</span>
            )}
          </div>
          {facts && <p className="mt-2 text-lg font-semibold text-slate-600">{facts}</p>}

          {goodToKnow.length > 0 && (
            <Card className="mt-5">
              <h2 className="font-display text-lg font-extrabold text-brand-blue">Good to know</h2>
              <ul className="mt-2 space-y-1.5 text-base text-slate-700">
                {goodToKnow.map((g) => (
                  <li key={g} className="flex gap-2">
                    <span className="text-brand-orange">●</span>
                    {g}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="no-print mt-6 flex flex-wrap gap-3">
            <Link to={`${APPLY}?rabbit=${encodeURIComponent(r.name)}`} className={btn.orange}>
              Apply to adopt {r.name}
            </Link>
            <PrintButton label="Print" />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Adoptions are by appointment on Saturdays and Sundays. Questions? Email{' '}
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              {OHRR.email}
            </a>
            .
          </p>
        </div>
      </div>

      {r.description && (
        <div className="mt-10 max-w-3xl">
          <h2 className="font-display text-2xl font-black text-ink">Meet {r.name}</h2>
          <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-slate-700">{r.description}</p>
        </div>
      )}
    </Section>
  )
}
