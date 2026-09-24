// One Bunny Help topic (/help/:slug): what to do, the emergency or see-a-vet
// banner, and the next steps — OHRR's care article, the vet list, the Hop
// Shop. Ported from the OHRR app's features/bunnyhelp/pages/HelpTopic.tsx.
// (The app's "save as a health note" lives in My Bunny, on the phone.)
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHero, Section, Card, H2, LinkCard, btn, ext } from '../components/ui'
import { useCareTopics, useLearnSlugs, learnHref } from '../lib/bunnyhelp/useTopics'
import { CategoryChip, Disclaimer, EmergencyCard, NotReviewedLine, UrgencyChip, AlertIcon } from '../lib/bunnyhelp/ui'
import { RESOURCES_URL } from '../lib/bunnyhelp/types'

export default function HelpTopic() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { topics, loading } = useCareTopics()
  const learnSlugs = useLearnSlugs()
  const topic = topics.find((t) => t.slug === slug)
  const q = params.get('q') ?? ''
  const back = q ? `/help?q=${encodeURIComponent(q)}` : '/help'

  if (!topic) {
    return (
      <>
        <PageHero title="Bunny Help" subtitle={loading ? 'Loading…' : 'That topic isn’t here — it may have been renamed.'} />
        <Section>
          {!loading && (
            <Link to="/help" className={btn.blue}>
              Browse Bunny Help
            </Link>
          )}
        </Section>
      </>
    )
  }

  const urgentVet = topic.show_vets || topic.urgency === 'emergency' || topic.urgency === 'vet-today'
  const learnTo = learnHref(topic.article_slug, learnSlugs)

  return (
    <>
      <PageHero title={topic.title} subtitle={topic.summary || undefined} />
      <Section>
        <div className="flex flex-wrap items-center gap-3">
          <Link to={back} className={btn.outline}>
            ← Bunny Help
          </Link>
          <UrgencyChip urgency={topic.urgency} />
          <CategoryChip category={topic.category} />
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {topic.urgency === 'emergency' && <EmergencyCard />}

            {topic.urgency === 'vet-today' && (
              <Card className="border-red-200 bg-red-50/60">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                    <AlertIcon size={22} />
                  </span>
                  <h2 className="font-display text-lg font-extrabold text-ink">See a vet today</h2>
                </div>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  Rabbits are exotic pets — see OHRR's list of rabbit-savvy vets across Ohio, including 24/7 emergency
                  care.
                </p>
                <Link to="/learn/vets" className={`${btn.blue} mt-4 bg-red-600 hover:bg-red-700`}>
                  Find a rabbit-savvy vet
                </Link>
              </Card>
            )}

            <Card>
              <H2 className="!text-xl">What to do</H2>
              <div className="mt-4">
                <WhatToDoBlock body={topic.what_to_do} />
              </div>
              <div className="mt-4">
                <NotReviewedLine topic={topic} />
              </div>
            </Card>

            <Disclaimer />
          </div>

          <aside className="space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Next steps</p>
            {learnTo ? (
              <LinkCard to={learnTo} icon="book" h="Read OHRR’s care article" p="In the Rabbit care section of this site." cta="Read the article →" />
            ) : (
              <LinkCard href={RESOURCES_URL} icon="book" h="OHRR’s care resources" p="The full guides on ohiohouserabbitrescue.org." cta="Open the resources →" />
            )}
            {urgentVet && (
              <LinkCard to="/learn/vets" icon="phone" h="Find a rabbit-savvy vet" p="OHRR’s vet directory — Ohio vets for rabbit care, including 24/7 exotics emergency care." cta="See the vet list →" />
            )}
            {topic.hopshop_note && (
              <LinkCard to="/hop-shop" icon="bag" h="Hop Shop" p={topic.hopshop_note} cta="Visit the Hop Shop →" />
            )}
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="font-display text-base font-extrabold text-brand-blue">Keep a health timeline</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Add your bunny to My Bunny in the OHRR app to keep a dated health timeline — handy at the vet.
              </p>
              <Link to="/app" className="mt-2 inline-block text-sm font-bold text-brand-orange">
                Get the app →
              </Link>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Sources: OHRR’s care guides on{' '}
              <a href={RESOURCES_URL} {...ext} className="font-semibold text-brand-blue">
                ohiohouserabbitrescue.org
              </a>
              .
            </p>
          </aside>
        </div>
      </Section>
    </>
  )
}

// Keeps the import list above tidy; the renderer lives with the other Bunny Help UI.
import { WhatToDo as WhatToDoBlock } from '../lib/bunnyhelp/ui'
