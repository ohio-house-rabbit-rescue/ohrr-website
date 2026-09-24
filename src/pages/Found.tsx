// /found — "Found a rabbit?" (website mirror of the app's FoundRabbit page):
// report it, domestic or wild, how to catch a stray, the Columbus field-rescue
// path, and what to do if you need to surrender. OHRR's wording throughout;
// OHRR is reached by email only — the vet's and the wildlife centre's contacts
// are theirs to show.
import { Link } from 'react-router-dom'
import { PageHero, Section, Card, H2, LinkCard, btn, ext } from '../components/ui'
import HurtNote from '../components/HurtNote'
import { foundContacts, wildOrDomestic, reportDetails, catchSteps, babiesWarning, fieldRescue, admissions } from '../data/found'

export default function Found() {
  return (
    <>
      <PageHero
        title="Found a rabbit?"
        subtitle="A domestic rabbit outdoors can’t survive on its own. Here’s how to help — and what to do if you need to surrender one."
        doors={[
          { to: '/found/report', icon: 'camera', h: 'Report a found rabbit', p: 'With a photo, in a couple of minutes' },
          { href: '#wild', icon: 'help', h: 'Domestic or wild?', p: 'How to tell, and who helps wild rabbits' },
          { href: '#catch', icon: 'info', h: 'Catching a stray', p: 'How to do it safely' },
        ]}
      />
      <Section>
        {/* One column, in the order a finder needs it (a tall box beside a short one read as a mistake) */}
        <div className="grid max-w-3xl gap-4">
          {/* Fast path: who to contact */}
          <Card className="border-brand-orange/30 bg-brand-orange-50/60">
            <h2 className="font-display text-xl font-extrabold text-ink">Report it</h2>
            <p className="mt-2 text-base leading-relaxed text-slate-700">
              In Columbus, stray reports go to the CHRS Help Line — they coordinate the Columbus Rabbit Field Rescue
              volunteers.
            </p>
            <div className="mt-4">
              <Link to="/found/report" className={btn.orange}>
                Report it here — with a photo
              </Link>
            </div>
            <p className="mt-4 text-base text-slate-700">However you report it, include:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base text-slate-700">
              {reportDetails.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`mailto:${foundContacts.ohrrEmail}?subject=Stray%20domestic%20rabbit`} className={btn.outline}>
                Email OHRR
              </a>
              <a href={`mailto:${foundContacts.chrsHelpLine}?subject=Stray%20domestic%20rabbit%20report`} className={btn.outline}>
                Email the CHRS Help Line
              </a>
            </div>
            <p className="mt-3 break-words text-sm leading-relaxed text-slate-600">
              CHRS Help Line:{' '}
              <a href={`mailto:${foundContacts.chrsHelpLine}`} className="font-semibold text-brand-blue">
                {foundContacts.chrsHelpLine}
              </a>
              <br />
              OHRR:{' '}
              <a href={`mailto:${foundContacts.ohrrEmail}`} className="font-semibold text-brand-blue">
                {foundContacts.ohrrEmail}
              </a>
            </p>
          </Card>

          <div className="space-y-4">
            <HurtNote />
            {/* Domestic or wild */}
            <Card>
              <h2 id="wild" className="font-display text-xl font-extrabold text-ink">{wildOrDomestic.heading}</h2>
              <p className="mt-2 text-base leading-relaxed text-slate-700">{wildOrDomestic.text}</p>
              <p className="mt-2 text-base leading-relaxed text-slate-700">
                {wildOrDomestic.wildNote}{' '}
                <a href={wildOrDomestic.wildUrl} {...ext} className="font-semibold text-brand-blue underline decoration-brand-blue/30 underline-offset-2">
                  Ohio Wildlife Center
                </a>
              </p>
            </Card>
          </div>
        </div>

        {/* Catch steps */}
        <H2 id="catch" className="mt-12">Catching a stray</H2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {catchSteps.map((s, i) => (
            <Card key={s.title} className="flex gap-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-base font-black text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-extrabold text-ink">{s.title}</h3>
                <p className="mt-1 text-base leading-relaxed text-slate-700">{s.text}</p>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-base leading-relaxed text-amber-900">
          <p>
            <strong className="font-bold">Babies:</strong> {babiesWarning}
          </p>
        </div>
        <div className="mt-5">
          <Link to="/learn/tips-for-catching-a-stray" className={btn.blue}>
            Read OHRR’s full Tips for Catching a Stray
          </Link>
        </div>

        {/* Field rescue */}
        <H2 className="mt-12">Columbus field rescue</H2>
        <Card className="mt-4">
          <p className="text-base leading-relaxed text-slate-700">{fieldRescue.text}</p>
          <p className="mt-3 text-base leading-relaxed text-slate-700">Want to be one of the rescuers?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/volunteer" className={btn.blue}>
              Become a Bunny Field Rescuer
            </Link>
            <a href={`mailto:${foundContacts.chrsHelpLine}?subject=Columbus%20Rabbit%20Field%20Rescue%20Group`} className={btn.outline}>
              Email the CHRS Help Line to join
            </a>
          </div>
        </Card>

        {/* Need to surrender */}
        <H2 className="mt-12">Need to surrender a rabbit?</H2>
        <Card className="mt-4 space-y-3">
          <p className="text-base leading-relaxed text-slate-700">{admissions.intro}</p>
          <p className="text-base leading-relaxed text-slate-700">{admissions.noSpace}</p>
          <p className="text-base leading-relaxed text-slate-700">{admissions.funding}</p>
          <p className="rounded-xl bg-brand-blue-50 px-4 py-3 text-base font-semibold text-brand-blue">{admissions.contactFirst}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a href={`mailto:${foundContacts.ohrrEmail}?subject=Rabbit%20surrender%20inquiry`} className={btn.blue}>
              Email OHRR
            </a>
            <Link to="/surrender" className={btn.outline}>
              How surrender works, step by step
            </Link>
          </div>
        </Card>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {admissions.forms.map((f) => (
            <LinkCard key={f.url} to={f.url} icon="book" h={f.title} p={f.text} cta="Open the form →" />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={admissions.policyUrl} {...ext} className={btn.outline}>
            Admissions Policy (PDF)
          </a>
          <a href={admissions.surrenderPolicyUrl} {...ext} className={btn.outline}>
            Surrender &amp; Relinquishment Policy (PDF)
          </a>
        </div>
      </Section>
    </>
  )
}
