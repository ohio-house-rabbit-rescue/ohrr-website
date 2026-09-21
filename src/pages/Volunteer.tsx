import { useVolunteerOpps } from '../lib/data'
import { PageHero, Section, LiveNote, btn, ext, H2, Card, Callout } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { Link } from 'react-router-dom'
import { OHRR, CHRS_TIPLINE } from '../lib/constants'

interface Position {
  title: string
  summary: string
  requirements: string[]
  location: string
  signup: { label: string; href: string; external: boolean; to?: string }
  note?: string
}

// Verbatim requirements from https://ohiohouserabbitrescue.org/support-ohrr/volunteer/
const POSITIONS: Position[] = [
  {
    title: 'Bunny Socialization',
    summary:
      'Many of our bunnies come from situations where they experienced little human contact or were mistreated. They need to learn to trust people again — this is where you come in. Volunteers sit in with the bunnies and help get them ready for adoption. To allow the maximum number of people to volunteer, please sign up for NO MORE than two 1-hour socialization shifts PER MONTH. Additional hours for service credit are not available at this time.',
    requirements: [
      'Must be at least 6 years old. Children 10 and under must be accompanied by an adult.',
      'Ability to focus on and interact with individual bunnies in 15-minute intervals.',
      'If you are a parent accompanying a child, you must sign up for a volunteer slot also.',
    ],
    location: 'OHRR Adoption Center',
    signup: { label: 'Pick a socialization shift', href: '/book/bunny-socialization', to: '/book/bunny-socialization', external: false },
    note: `This opportunity is open to groups. To schedule a group visit, email ${OHRR.email}.`,
  },
  {
    title: 'Buncare Volunteer',
    summary:
      'Buncare volunteers help keep our bunnies happy and healthy: sweeping/cleaning, feeding pellets and hay, expanding/unexpanding pens, changing litter boxes and much more. If you are volunteering to earn service hours, please volunteer to socialize instead — do not sign up for Buncare to earn service hours.',
    requirements: [
      'Must be at least 18 years old.',
      'Must be dependable and trustworthy.',
      'Must be willing to volunteer for at least two hours every two weeks for at least a year.',
      'Must have volunteered for Bunny Socialization at least twice, on two separate days.',
      `Must have completed the 2-hour Buncare Orientation. To sign up for orientation, email Bev at ${OHRR.email}.`,
    ],
    location: 'OHRR Adoption Center',
    signup: { label: 'Pick a Buncare shift', href: '/book/buncare-shift', to: '/book/buncare-shift', external: false },
    note: 'Please sign up at least two hours before your shift so we can make sure someone is at the Adoption Center to let you in.',
  },
  {
    title: 'Vet Delivery & Pick-up',
    summary:
      'Our bunnies visit the vet frequently for check-ups, spays/neuters and more. Volunteers pick up bunnies from the Adoption Center in the morning and drop them at the vet, and/or pick them up from the vet in the evening and return them to the Adoption Center. Bunnies typically stay at the vet all day, so you can sign up for drop-offs, pick-ups, or both — as your schedule allows.',
    requirements: [
      "Must have a car and valid driver's license.",
      'Must have volunteered for bunny socialization at least twice or participated in an "interview" at the Adoption Center.',
    ],
    location: 'Between the OHRR Adoption Center and Norton Road Veterinary Hospital or MedVet Hilliard (the vet depends on the needs of the bunny).',
    signup: { label: 'Email to join the vet-run list', href: OHRR.emailHref, external: false },
    note: `Email ${OHRR.email} and we will add you to our email thread for future veterinary appointment needs.`,
  },
  {
    title: 'Bunny Field Rescuer',
    summary:
      'Many of the bunnies at our Adoption Center are rescued by our volunteers. We get many calls and emails about domestic bunnies abandoned outdoors. This is an on-call position: some weeks volunteers rescue a bunny almost every day, some months there are none. No training is required — you will learn what you need at your first rescue.',
    requirements: [
      'This is an outdoor position. Be willing to be outdoors for extended periods, exposed to the elements.',
      'This is an active position. It may occasionally involve running, climbing, crawling, etc. Please be honest about your limits.',
      "Must have a car and valid driver's license.",
      'Must be at least 18 years old.',
    ],
    location: 'Varies (typically in the city of Columbus).',
    signup: { label: 'Email the CHRS Help Line', href: `mailto:${CHRS_TIPLINE}`, external: false },
    note: `Contact the CHRS Help Line at ${CHRS_TIPLINE} and ask to be added to the Columbus Rabbit Field Rescue group. On Facebook, Columbus Rabbit Field Rescue is where stray reports are shared and rescues are coordinated; membership requests are reviewed by the group admins.`,
  },
]

const OTHER_NEEDS = [
  'Event & Fundraising Volunteer',
  'Graphic Designer',
  'Adoption Coordinator',
  'Hop Shop Volunteer',
  'Veterinary Care',
  'Photographer',
  'Web Designer',
  'Grant Writer',
  'Marketing',
]

const CAT: Record<string, string> = {
  socialization: 'Socialization',
  'vet-transport': 'Vet transport',
  events: 'Events',
}

export default function Volunteer() {
  const opps = useVolunteerOpps()
  const isLive = !!opps && opps.length > 0

  return (
    <>
      <PageHero
        title="Volunteer"
        subtitle="Whether you want to get up close with the bunnies or work behind the scenes, we have an opportunity for you. We welcome volunteers of all ages and backgrounds."
      />
      <PresentedBy surface="volunteer" />
      <Section>
        <p className="max-w-3xl text-slate-600">
          Some volunteers come to us knowing everything about bunnies and some start off knowing nothing at
          all. We truly are one big, happy volunteer family and we would love to have you join us.
        </p>

        <H2 className="mt-10">Available volunteer positions</H2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {POSITIONS.map((p) => (
            <Card key={p.title} className="flex flex-col">
              <h3 className="font-display text-lg font-extrabold text-brand-blue">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.summary}</p>
              <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">Requirements</p>
              <ul className="mt-1.5 space-y-1.5">
                {p.requirements.map((r) => (
                  <li key={r} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-brand-orange">●</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-bold text-slate-700">Location:</span> {p.location}
              </p>
              {p.note && <p className="mt-2 text-sm text-slate-600">{p.note}</p>}
              <div className="mt-4">
                {p.signup.to ? (
                  <Link to={p.signup.to} className={btn.orange}>
                    {p.signup.label}
                  </Link>
                ) : (
                  <a href={p.signup.href} {...(p.signup.external ? ext : {})} className={btn.orange}>
                    {p.signup.label}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <H2>Other volunteer needs</H2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OTHER_NEEDS.map((n) => (
              <li key={n} className="flex gap-2.5 text-sm text-slate-700">
                <span className="text-brand-orange">●</span> {n}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-slate-600">
            Please{' '}
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              contact us
            </a>{' '}
            if you would like more information on any of the above opportunities or think you may be able to
            help OHRR in any other way.
          </p>
        </div>

        {isLive && (
          <div className="mt-12">
            <H2>Open shifts</H2>
            <LiveNote source="live" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {opps!.map((o) => (
                <Card key={o.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-extrabold text-ink">{o.title}</h3>
                    <span className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-bold text-brand-blue">
                      {CAT[o.category] ?? o.category}
                    </span>
                    {o.spots && (
                      <span className="text-xs font-bold text-brand-orange-dark">{o.spots}</span>
                    )}
                  </div>
                  {o.when_text && <p className="mt-1 text-sm text-slate-600">{o.when_text}</p>}
                  {o.where_text && <p className="text-sm text-slate-500">{o.where_text}</p>}
                  {o.detail && <p className="mt-1.5 text-sm text-slate-600">{o.detail}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        <Callout className="mt-12 text-center">
          <h2 className="font-display text-xl font-extrabold text-brand-blue">Group visits</h2>
          <p className="mt-2 text-slate-700">
            Bunny Socialization is open to groups. To schedule a group visit, email{' '}
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              {OHRR.email}
            </a>
            .
          </p>
        </Callout>
      </Section>
    </>
  )
}
