import { Link } from 'react-router-dom'
import { useRabbits } from '../lib/data'
import type { Rabbit } from '../lib/types'
import { PageHero, Section, RabbitCard, LiveNote, btn, ext, H2, Card, Callout } from '../components/ui'
import { OhrrPhoto } from '../components/PhotoStrip'
import { ADOPTION_PHOTO } from '../data/ohrrPhotos'
import { APPLY, ADOPTION_POLICY_PDF, PETFINDER, ADOPT_A_PET, BUNNY_DATES_ARTICLE, OHRR, RABBIT_READY } from '../lib/constants'

// From the OHRR Adoption Policy (revised January 31, 2022).
const REQS = [
  'Rabbits live indoors, within your living space — never outside, in a garage, or in an unfinished basement.',
  'On the floor, in an enclosure with no wire flooring and at least 4 feet by 4 feet, or free range in a room — plus space and time for play and exercise.',
  'Limited, high-quality timothy pellets, unlimited grass hay, a daily salad of mixed fresh greens, and fresh water.',
  'All OHRR rabbits are spayed or neutered. Yearly wellness checks with a rabbit-experienced vet.',
]

const STEPS = [
  {
    h: '1. Read the Adoption Policy',
    p: 'It covers housing, diet, bonded pairs, vet care, fees ($60 single, $75 pair) and returns. Please review it before you apply.',
  },
  {
    h: '2. Complete the online Adoption Application',
    p: "You'll be contacted by email within 72 hours. If you don't hear back in that time, our system didn't receive it — please email us.",
  },
  {
    h: '3. A two-hour appointment',
    p: 'An adoption facilitator will talk through your application and set up a two-hour appointment where you can see how we house our bunnies, what we feed them, and then interact with and potentially adopt one of our rescue rabbits. Appointments are usually at 12:00 and 2:00 on Saturdays and Sundays.',
  },
  {
    h: '4. Homecoming',
    p: 'You have up to two weeks to set up housing and bunny-proof. Send photos of the habitat to your facilitator; once approved, schedule a pick-up, sign the adoption contract and pay the fee. Keep in touch during the first days and weeks — call, text or email anytime.',
  },
]

/**
 * A bonded pair is two records that must go home together ("Adopted together
 * with Pierce"); the list shows them as one card, named for both.
 */
function pairUp(list: Rabbit[]): Rabbit[] {
  const out: Rabbit[] = []
  const used = new Set<string>()
  for (const r of list) {
    if (used.has(r.id)) continue
    const mateName = (r.tags ?? []).map((t) => /adopted together with (.+)/i.exec(t)?.[1]?.trim()).find(Boolean)
    const mate = mateName ? list.find((o) => o.id !== r.id && o.name.toLowerCase() === mateName.toLowerCase()) : undefined
    if (mate) {
      used.add(mate.id)
      out.push({ ...r, name: `${r.name} & ${mate.name}` })
    } else {
      out.push(r)
    }
  }
  return out
}

export default function Adopt() {
  const { rabbits, source } = useRabbits(60)
  return (
    <>
      <PageHero
        title="Adopt a rabbit"
        subtitle="Meet the rabbits looking for homes at OHRR. Adoptions are by appointment on Saturdays and Sundays at our Columbus Adoption Center."
        doors={[
          { href: '#rabbits', icon: 'heart', h: 'Meet the rabbits', p: 'Everyone looking for a home right now' },
          { to: RABBIT_READY, icon: 'help', h: 'Is a rabbit right for us?', p: 'The two-minute check, before you decide' },
          { href: '#how', icon: 'info', h: 'How adopting works', p: 'The steps, and the application' },
        ]}
      />
      <Section>
        <H2 id="rabbits">Rabbits looking for homes</H2>
        <LiveNote source={source} />
        {rabbits === null ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-black/5">
                <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : rabbits.length === 0 ? (
          <p className="mt-6 text-slate-600">No rabbits to show right now — check back soon!</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pairUp(rabbits).map((r) => (
              <RabbitCard key={r.id} r={r} />
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-slate-600">
          OHRR's adoptable bunnies are also listed on{' '}
          <a href={PETFINDER} {...ext} className="font-semibold text-brand-blue">
            Petfinder
          </a>{' '}
          and{' '}
          <a href={ADOPT_A_PET} {...ext} className="font-semibold text-brand-blue">
            Adopt-A-Pet
          </a>
          .
        </p>

        <div className="mt-12">
          <div className="md:flex md:items-center md:justify-between md:gap-8">
            <div className="max-w-2xl">
              <H2 id="how">How adopting works</H2>
              <p className="mt-2 max-w-2xl text-slate-600">
                At OHRR, adoptions are done by appointment on Saturdays and Sundays. Here is the process,
                step by step.
              </p>
            </div>
            {/* The photo on the "Adoption Process for OHRR" post on the current home page */}
            <OhrrPhoto photo={ADOPTION_PHOTO} className="mt-5 max-w-sm md:mt-0 md:w-72 md:shrink-0" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {STEPS.map((s) => (
              <Card key={s.h}>
                <h3 className="font-display text-lg font-extrabold text-brand-blue">{s.h}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.p}</p>
              </Card>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={APPLY} className={btn.orange}>
              Start an adoption application
            </Link>
            <Link to="/adopt/policy" className={btn.blue}>
              Read the Adoption Policy
            </Link>
            <a href={ADOPTION_POLICY_PDF} {...ext} className={btn.outline}>
              Policy PDF
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-2 md:gap-0 md:divide-x md:divide-slate-200">
          <div className="md:pr-8">
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Still deciding?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Start with the honest version:{' '}
              <Link to={RABBIT_READY} className="font-semibold text-brand-blue">
                Is a rabbit right for us?
              </Link>{' '}
              and{' '}
              <Link to="/learn/cost-of-a-house-rabbit" className="font-semibold text-brand-blue">
                what a house rabbit really costs
              </Link>
              . Then try it for real: a family socialization shift at the Adoption Center is open to children 6 and up
              with an adult.
            </p>
            <div className="mt-3">
              <Link to="/book/bunny-socialization" className={btn.blue}>
                Book a socialization shift
              </Link>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Or email{' '}
              <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
                {OHRR.email}
              </a>{' '}
              and we will set up an hour-long appointment where you can learn about being a bunny parent.
            </p>
          </div>
          <div className="md:pl-8">
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Free bunny matchmaking</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Want a friend for your current rabbit? Bring your bunny to the Adoption Center for a
              "bunny date" with up to three adoptable rabbits. Plan on 1–2 hours; our bonding expert
              runs the dates and coaches you on continuing the bonding at home.{' '}
              <Link to={BUNNY_DATES_ARTICLE} className="font-semibold text-brand-blue">
                What to expect at a bonding date
              </Link>
              .
            </p>
          </div>
        </div>

        <Callout className="mt-10">
          <h2 className="font-display text-xl font-extrabold text-brand-blue">Before you adopt</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {REQS.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm text-slate-700">
                <span className="text-brand-orange">●</span> {t}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={APPLY} className={btn.orange}>
              Start an adoption application
            </Link>
            <a href={OHRR.emailHref} className={btn.outline}>
              Email a question
            </a>
          </div>
        </Callout>
      </Section>
    </>
  )
}
