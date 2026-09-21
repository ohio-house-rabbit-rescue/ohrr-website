import { useCareArticles } from '../lib/data'
import { PageHero, Section, LiveNote, LinkCard, H2 } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { CHRS_SITE, HRS_SITE } from '../lib/constants'
import { CARE_DISCLAIMER } from '../data/careArticles'

// Shown as the featured cards at the top, so they are left out of the article grid.
const FEATURED = new Set(['bunny-living-space', 'tips-for-catching-a-stray'])

export default function Learn() {
  const { articles: all, source } = useCareArticles()
  // Learn shows care guides; the Give / Adopt / About pages live at /info/<slug>.
  const articles = all && all.filter((a) => (a.section ?? 'care') === 'care')

  return (
    <>
      <PageHero
        title="Rabbit care"
        subtitle="Good care means happier rabbits — and fewer surrenders. Articles straight from OHRR, plus rabbit-savvy vets across Ohio."
      />
      <PresentedBy surface="care-library" />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LinkCard
            to="/learn/vets"
            icon="phone"
            h="Find a rabbit-savvy vet"
            p="OHRR's list of vets for rabbit care across Ohio — Central Ohio, Cincinnati, Dayton, Toledo and Northeast Ohio — including 24/7 exotics emergency care and low-cost spay/neuter."
            cta="See the vet list →"
          />
          <LinkCard
            to="/learn/bunny-living-space"
            icon="book"
            h="Bunny Living Space"
            p="Ready to adopt? What to include in your bunny's space, our housing requirements, and tips before you bring them home."
            cta="Read more →"
          />
          <LinkCard
            to="/learn/tips-for-catching-a-stray"
            icon="book"
            h="Tips for Catching a Stray"
            p="Found a rabbit outdoors? How to tell if it is domestic, who to call, and how to catch it safely."
            cta="Read more →"
          />
        </div>

        <div className="mt-12">
          <H2>Articles on bunny care</H2>
          <LiveNote source={source} />
          {articles === null ? (
            <p className="mt-6 text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.filter((a) => !FEATURED.has(a.slug)).map((a) =>
                a.externalUrl ? (
                  <LinkCard
                    key={a.slug}
                    href={a.externalUrl}
                    h={a.title}
                    p={a.summary}
                    cta={`Read on ${a.externalSource ?? 'their site'} →`}
                  />
                ) : (
                  <LinkCard key={a.slug} to={`/learn/${a.slug}`} h={a.title} p={a.summary} cta="Read more →" />
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

        <p className="mt-8 text-xs leading-relaxed text-slate-400">{CARE_DISCLAIMER}</p>
      </Section>
    </>
  )
}
