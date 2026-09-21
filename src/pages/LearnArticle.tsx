import { Link, useParams } from 'react-router-dom'
import { useCareArticles } from '../lib/data'
import { PageHero, Section, LiveNote, btn, ext, PrintButton, ArticleBody, Callout } from '../components/ui'
import { CARE_DISCLAIMER } from '../data/careArticles'

export default function LearnArticle() {
  const { slug } = useParams()
  const { articles, source } = useCareArticles()

  if (articles === null) {
    return (
      <>
        <PageHero title="Rabbit care" />
        <Section>
          <p className="text-sm text-slate-500">Loading…</p>
        </Section>
      </>
    )
  }

  const a = articles.find((x) => x.slug === slug)
  const section = a?.section ?? 'care'
  const back = section === 'give' ? { to: '/give', label: '← Ways to give' } : section === 'adopt' ? { to: '/adopt', label: '← Adopt' } : section === 'about' ? { to: '/about', label: '← About' } : { to: '/learn', label: '← All care articles' }
  if (!a) {
    return (
      <>
        <PageHero title="Page not found" subtitle="That page isn't here — it may have been renamed." />
        <Section>
          <Link to="/learn" className={btn.blue}>
            Back to rabbit care
          </Link>
        </Section>
      </>
    )
  }

  return (
    <>
      <PageHero title={a.title} subtitle={a.summary} />
      <Section className="print-urls">
        <div className="no-print flex flex-wrap items-center gap-3">
          <Link to={back.to} className={btn.outline}>
            {back.label}
          </Link>
          <PrintButton label="Print this page" />
        </div>
        <LiveNote source={source} />
        <p className="print-only font-display text-2xl font-black">{a.title}</p>

        <div className="mt-8 grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            {a.body ? <ArticleBody body={a.body} /> : <p className="text-slate-600">{a.summary}</p>}
            {a.externalUrl && (
              <a href={a.externalUrl} {...ext} className={`${btn.blue} mt-6`}>
                Read the full article on {a.externalSource ?? 'their site'}
              </a>
            )}
            {a.sourceUrl && (
              <p className="mt-8 text-xs text-slate-400">
                Adapted from the article on{' '}
                <a href={a.sourceUrl} {...ext} className="font-semibold text-slate-500">
                  ohiohouserabbitrescue.org
                </a>
                .
              </p>
            )}
          </div>
          <aside className="space-y-4">
            {a.tip && (
              <Callout className="!p-6">
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">Tip</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{a.tip}</p>
              </Callout>
            )}
            <div className="no-print rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="font-display text-base font-extrabold text-brand-blue">Need a vet?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Rabbits are exotic pets — see OHRR's list of rabbit-savvy vets across Ohio, including 24/7 emergency care.
              </p>
              <Link to="/learn/vets" className="mt-2 inline-block text-sm font-bold text-brand-orange">
                Vet directory →
              </Link>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">{CARE_DISCLAIMER}</p>
          </aside>
        </div>
      </Section>
    </>
  )
}
