// /tails/:id — one Happy Tail in full, printable (website mirror of the app's
// TailDetail; the app's share-card and follow buttons are app features).
import { Link, useParams } from 'react-router-dom'
import { PageHero, Section, Card, LiveNote, PrintButton, btn } from '../components/ui'
import { BunnyPhoto, StatusPill } from '../components/tailbits'
import { useHappyTails } from '../lib/tails'

export default function TailDetail() {
  const { id } = useParams()
  const { items, source, loading } = useHappyTails()
  const t = items.find((x) => x.id === id)

  if (!t && loading) {
    return (
      <>
        <PageHero title="Happy Tails" />
        <Section>
          <p className="text-base text-slate-600">Loading…</p>
        </Section>
      </>
    )
  }

  if (!t) {
    return (
      <>
        <PageHero title="Story not found" subtitle="That story may have been taken down, or the link is incomplete." />
        <Section>
          <Link to="/tails" className={btn.blue}>
            Back to Happy Tails
          </Link>
        </Section>
      </>
    )
  }

  const meta = [t.family && `With the ${t.family} family`, t.since].filter(Boolean).join(' · ')

  return (
    <>
      <PageHero title={t.bunny} subtitle={meta || undefined} />
      <Section>
        <Link to="/tails" className="no-print inline-block text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
          ← All Happy Tails
        </Link>

        <article className="mt-5 grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5">
              <BunnyPhoto name={t.bunny} photo={t.photo} />
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={t.status} />
              {t.bonded && <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Bonded pair</span>}
            </div>

            <p className="mt-4 text-lg leading-relaxed text-slate-700">{t.summary}</p>

            {/* Looking-for-a-home bunnies get a path straight to adoption */}
            {t.status === 'looking' && (
              <Link to="/adopt" className={`${btn.orange} no-print mt-4`}>
                Meet {t.bunny} &amp; adoptable rabbits
              </Link>
            )}

            {t.timeline.length > 0 && (
              <Card className="mt-6">
                <h2 className="font-display text-xl font-extrabold text-ink">{t.bunny}’s journey</h2>
                <ul className="mt-4 space-y-5">
                  {t.timeline.map((e, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-brand-blue" />
                        {i < t.timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden />}
                      </div>
                      <div className="min-w-0 pb-1">
                        {e.date && <p className="text-sm font-bold text-slate-600">{e.date}</p>}
                        {e.status && <StatusPill status={e.status} className="mt-1" />}
                        <p className="mt-1.5 whitespace-pre-line text-base leading-relaxed text-slate-700">{e.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="no-print mt-6 flex flex-wrap gap-3">
              <PrintButton label="Print this story" />
              <Link to="/tails/share" className={btn.blue}>
                Share your bunny’s story
              </Link>
            </div>
            <LiveNote source={source} />
          </div>
        </article>
      </Section>
    </>
  )
}
