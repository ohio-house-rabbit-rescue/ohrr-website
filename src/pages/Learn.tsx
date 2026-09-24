import { useCareArticles } from '../lib/data'
import { PageHero, Section, LiveNote, LinkCard, H2 } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { CHRS_SITE, HRS_SITE } from '../lib/constants'
import { CARE_DISCLAIMER } from '../data/careArticles'

function dedupe<T extends { title: string; externalUrl?: string | null }>(list: T[]): T[] {
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const keep = new Set<T>()
  const seen = new Set<string>()
  for (const a of [...list].sort((x, y) => Number(!!x.externalUrl) - Number(!!y.externalUrl))) {
    const k = key(a.title)
    if (seen.has(k)) continue
    seen.add(k)
    keep.add(a)
  }
  return list.filter((a) => keep.has(a))
}

export default function Learn() {
  const { articles: all, source } = useCareArticles()
  // Learn shows care guides; the Give / Adopt / About pages live at /info/<slug>.
  // The live list and the bundled one can carry the same guide under two slugs
  // (one OHRR's own page, one a link to the source) — show each title once,
  // preferring the guide that opens on this site.
  const articles = all && dedupe(all.filter((a) => (a.section ?? 'care') === 'care'))

  return (
    <>
      <PageHero
        title="Rabbit care"
        subtitle="Good care means happier rabbits — and fewer surrenders. Articles straight from OHRR, plus rabbit-savvy vets across Ohio."
        doors={[
          { to: '/help', icon: 'help', h: 'Bunny Help', p: 'Ask about something your bunny is doing' },
          { to: '/learn/vets', icon: 'phone', h: 'Rabbit-savvy vets', p: 'Across Ohio, including emergency care' },
          { to: '/learn/breeds', icon: 'search', h: 'What kind of bunny do I have?', p: 'Ears, size and coat' },
        ]}
      />
      <PresentedBy surface="care-library" />
      <Section>
        <div>
          <H2 id="articles">Articles on bunny care</H2>
          <LiveNote source={source} />
          {articles === null ? (
            <p className="mt-6 text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) =>
                a.externalUrl ? (
                  <LinkCard
                    key={a.slug}
                    href={a.externalUrl}
                    h={a.title}
                    p={a.summary}
                    cta={`Read on ${a.externalSource ?? 'their site'} →`}
                  />
                ) : (
                  <LinkCard key={a.slug} to={`/learn/${a.slug}`} h={a.title} p={a.summary} cta="Read this guide →" />
                ),
              )}
            </div>
          )}
        </div>

        <div className="mt-12">
          <H2>More resources</H2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <LinkCard
              href={CHRS_SITE}
              icon="book"
              h="Rabbit Care and Behavior Booklet"
              p='The Columbus House Rabbit Society has produced an excellent resource for the care of your rabbit. Go to the CHRS site, click on "Rabbit Care", and download the booklet.'
              cta="Visit columbusrabbit.org →"
            />
            <LinkCard
              href={HRS_SITE}
              icon="book"
              h="House Rabbit Society Rabbit Care Guide"
              p="For additional information, go to the national House Rabbit Society's rabbit care guide."
              cta="Visit rabbit.org →"
            />
          </div>
          <p className="mt-6 text-sm text-slate-600">
            We give our buns all the love, treats and PetMeds they need! Thank you to PetMeds for helping us
            care for our bunnies.
          </p>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-slate-600">{CARE_DISCLAIMER}</p>
      </Section>
    </>
  )
}
