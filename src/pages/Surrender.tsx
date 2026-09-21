import { Link } from 'react-router-dom'
import { PageHero, Section, btn, ext, H2, Card, Callout } from '../components/ui'
import {
  OHRR,
  CHRS_TIPLINE,
  ADMISSIONS_POLICY_PDF,
  SURRENDER_POLICY_PDF,
  GOOD_SAMARITAN_FORM,
  OWNER_SURRENDER_FORM,
  OHIO_WILDLIFE_CENTER,
} from '../lib/constants'

export default function Surrender() {
  return (
    <>
      <PageHero
        title="Found a rabbit? Need to surrender?"
        subtitle="How admissions work at OHRR, the two surrender forms, and how field rescues of stray domestic rabbits are coordinated in Columbus."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">I found a rabbit outdoors</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              First, check whether it is a wild cottontail or a domestic rabbit — domestic rabbits cannot
              survive outdoors and need rescuing. In Columbus, contact the CHRS Help Line at{' '}
              <a href={`mailto:${CHRS_TIPLINE}`} className="font-semibold text-brand-blue">
                {CHRS_TIPLINE}
              </a>{' '}
              with the location, time of day, how long you have seen the rabbit, and its color and size. The
              Columbus Rabbit Field Rescue Facebook group is where stray reports are shared and rescues are
              coordinated; ask the Help Line to be added.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              For an injured wild rabbit, contact the{' '}
              <a href={OHIO_WILDLIFE_CENTER} {...ext} className="font-semibold text-brand-blue">
                Ohio Wildlife Center
              </a>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/learn/tips-for-catching-a-stray" className={btn.blue}>
                Tips for catching a stray
              </Link>
              <a href={`mailto:${CHRS_TIPLINE}`} className={btn.outline}>
                Email the CHRS Help Line
              </a>
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">I need to surrender a rabbit</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              If you are considering bringing a rabbit to OHRR, first email{' '}
              <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
                {OHRR.email}
              </a>{' '}
              to see if space is available. OHRR will also offer support and information to help you keep the
              rabbit, if that is an option. Then read the two policies below and complete the form that fits
              your situation.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={GOOD_SAMARITAN_FORM} className={btn.orange}>
                Good Samaritan rescue/surrender form
              </Link>
              <Link to={OWNER_SURRENDER_FORM} className={btn.orange}>
                Owner surrender form
              </Link>
            </div>
          </Card>
        </div>

        <H2 className="mt-12">Admissions policy, in brief</H2>
        <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-slate-700">
          <p>
            Ohio House Rabbit Rescue, Inc. is a <strong>restricted-admissions organization</strong>. If space is
            available, OHRR accepts rabbits rescued by OHRR staff or volunteers and rabbits rescued and then
            surrendered by a Good Samaritan. A very limited space is dedicated to rabbits surrendered by their
            owners.
          </p>
          <p>
            If OHRR does not have the space to admit a rabbit, it will offer a list of other organizations, with
            contact information, that may accept the rabbit. OHRR also uses a waiting list.
          </p>
          <p>
            OHRR is a private, nonprofit rabbit rescue and does not receive any tax dollars from the city or any
            government agency.
          </p>
          <p>
            Once a rabbit is accepted, the owner or Good Samaritan completes a surrender/relinquishment form and
            brings it on the day of surrender, along with the rabbit's food, litter, litter box, cage, exercise
            enclosure and bowls. The rabbit is assessed for behavior and health by a rabbit-experienced
            veterinarian, spayed or neutered, and placed in a foster home for recovery before becoming available
            for adoption. For all surrenders, OHRR requires a $40 donation for a single rabbit and $60 for a
            bonded pair, which helps cover spay/neuter, food, veterinary care, fostering and adoption costs.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={ADMISSIONS_POLICY_PDF} {...ext} className={btn.blue}>
            Admissions Policy (PDF)
          </a>
          <a href={SURRENDER_POLICY_PDF} {...ext} className={btn.blue}>
            Good Samaritan/Owner Surrender &amp; Relinquishment Policy (PDF)
          </a>
        </div>

        <Callout className="mt-12">
          <h2 className="font-display text-xl font-extrabold text-brand-blue">Want to help rescue strays?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Bunny Field Rescuer is an on-call volunteer role: outdoor, active, 18+, with a car and valid
            license. No training required. Contact the CHRS Help Line at{' '}
            <a href={`mailto:${CHRS_TIPLINE}`} className="font-semibold text-brand-blue">
              {CHRS_TIPLINE}
            </a>{' '}
            to join the Columbus Rabbit Field Rescue group.
          </p>
          <Link to="/volunteer" className={`${btn.blue} mt-4`}>
            Volunteer positions
          </Link>
        </Callout>
      </Section>
    </>
  )
}
