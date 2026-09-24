import { useVolunteerOpps } from '../lib/data'
import { PageHero, Section, btn, ext, H2, Card, Callout } from '../components/ui'
import PresentedBy from '../components/PresentedBy'
import { PhotoStrip } from '../components/PhotoStrip'
import { VOLUNTEER_PHOTOS } from '../data/ohrrPhotos'
import { Link } from 'react-router-dom'
import { OHRR, CHRS_TIPLINE } from '../lib/constants'
import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { listOpenCalls, type OpenCall } from '../lib/volunteers/callsApi'
import { remainingLabel, isFull, categoryLabel } from '../lib/volunteerOpps'
import { fmtClock, fmtDay } from '../lib/volunteers/calls'

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

/** Where each kind of shift is booked — the same path the typed list used. */
function signup(category: string, title: string): { to?: string; href?: string; label: string } {
  switch (category) {
    case 'socialization':
      return { to: '/book/bunny-socialization', label: 'Pick a socialization shift' }
    case 'buncare':
      return { to: '/book/buncare-shift', label: 'Pick a Buncare shift' }
    case 'vet-transport':
      return { href: `${OHRR.emailHref}?subject=${encodeURIComponent('Vet delivery & pick-up volunteer')}`, label: 'Email to join the vet-run list' }
    case 'field-rescue':
      return { href: `mailto:${CHRS_TIPLINE}`, label: 'Email the CHRS Help Line' }
    default:
      return { to: `/volunteer/interest?role=${encodeURIComponent(categoryLabel(category))}&item=${encodeURIComponent(title)}`, label: 'Sign up' }
  }
}

function SignupButton({ category, title, primary = true }: { category: string; title: string; primary?: boolean }) {
  const s = signup(category, title)
  const cls = primary ? btn.orange : btn.outline
  return s.to ? (
    <Link to={s.to} className={cls}>
      {s.label}
    </Link>
  ) : (
    <a href={s.href} className={cls}>
      {s.label}
    </a>
  )
}

export default function Volunteer() {
  const opps = useVolunteerOpps()
  const live = opps !== null && opps.length > 0

  return (
    <>
      <PageHero
        title="Volunteer"
        subtitle="Whether you want to get up close with the bunnies or work behind the scenes, we have an opportunity for you. We welcome volunteers of all ages and backgrounds."
        doors={[
          { to: '/volunteer/apply', icon: 'users', h: 'Apply to volunteer', p: 'New? Start here — OHRR reviews every application' },
          { href: '#shifts', icon: 'calendar', h: 'Pick a shift', p: 'Approved volunteers: socialization, Buncare and more' },
          { to: '/volunteer/hours', icon: 'clock', h: 'My volunteer page', p: 'What you’re signed up for, your hours, your letter' },
        ]}
      />
      <PresentedBy surface="volunteer" />
      <Section>
        <p className="max-w-2xl text-base text-slate-700">
          Some volunteers come to us knowing everything about bunnies and some start off knowing nothing at all. We
          truly are one big, happy volunteer family and we would love to have you join us.
        </p>
        <PhotoStrip photos={VOLUNTEER_PHOTOS} className="mt-6 max-w-3xl" />

        <OpenCalls />

        <H2 id="shifts" className="mt-10">Shifts and ways to help</H2>
        <p className="mt-2 text-base text-slate-700">
          New here?{' '}
          <Link to="/volunteer/apply" className="font-semibold text-brand-blue">
            Apply to volunteer
          </Link>{' '}
          first — OHRR reads every application. Once you’re approved, pick a shift with the same email and you’re booked,
          no account needed. Your hours are recorded when you check in, and your own volunteer page has them, with a
          signed hours letter whenever you need one.
        </p>
        {opps === null ? (
          <p className="mt-6 text-base text-slate-600">Loading…</p>
        ) : live ? (
          <div className="mt-6 space-y-4">
            {opps.map((o) => {
              const left = remainingLabel(o)
              const full = isFull(o)
              return (
                <Card key={o.id} className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
                  <div>
                    <span className="text-sm font-bold uppercase tracking-wider text-brand-blue">{categoryLabel(o.category)}</span>
                    <h3 className="mt-1 font-display text-xl font-extrabold text-ink">{o.title}</h3>
                    {(o.when_text || o.where_text) && (
                      <p className="mt-1 text-base text-slate-700">{[o.when_text, o.where_text].filter(Boolean).join(' · ')}</p>
                    )}
                    {left && <p className={`mt-2 text-base font-bold ${full ? 'text-slate-600' : 'text-brand-orange-ink'}`}>{left}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {!full && <SignupButton category={o.category} title={o.title} />}
                      {o.contact_email && (
                        <a href={`mailto:${o.contact_email}`} className="break-all text-base font-semibold text-brand-blue">
                          Questions? Email {o.contact_email}
                        </a>
                      )}
                    </div>
                  </div>
                  {o.detail && <p className="mt-3 whitespace-pre-line text-base text-slate-700 lg:mt-0">{o.detail}</p>}
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {POSITIONS.map((p) => (
              <Card key={p.title} className="flex flex-col">
                <h3 className="font-display text-xl font-extrabold text-ink">{p.title}</h3>
                <p className="mt-1.5 text-base text-slate-700">{p.summary}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.requirements.map((r) => (
                    <li key={r} className="flex gap-2 text-base text-slate-700">
                      <span className="text-brand-orange">●</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-base text-slate-700">
                  <span className="font-bold">Where:</span> {p.location}
                </p>
                {p.note && <p className="mt-2 text-base text-slate-700">{p.note}</p>}
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
        )}

        <div className="mt-12">
          <H2>Two more ways in</H2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="flex flex-col">
              <h3 className="font-display text-xl font-extrabold text-ink">Foster a rabbit</h3>
              <p className="mt-1.5 text-base text-slate-700">
                A few weeks with a rabbit in your home while they recover or wait for a family. Renters and students
                welcome — it is the easiest first step there is.
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-4">
                <Link to="/volunteer/foster" className={btn.orange}>
                  I’m interested
                </Link>
                <Link to="/info/foster-a-rabbit" className={btn.outline}>
                  What it involves
                </Link>
              </div>
            </Card>
            <Card className="flex flex-col">
              <h3 className="font-display text-xl font-extrabold text-ink">Help OHRR online</h3>
              <p className="mt-1.5 text-base text-slate-700">
                Good with Instagram, TikTok or short video? An hour a week posting from OHRR’s ready-made Share kit
                reaches the people the rescue is missing. Students: this counts as real experience.
              </p>
              <div className="mt-auto pt-4">
                <Link to="/volunteer/interest?role=Social%20media%20%26%20digital%20content" className={btn.blue}>
                  Count me in
                </Link>
              </div>
            </Card>
          </div>
        </div>

        <p className="mt-10 max-w-3xl text-base text-slate-700">
          OHRR also needs help with {OTHER_NEEDS.slice(0, -1).map((n) => n.toLowerCase()).join(', ')} and{' '}
          {OTHER_NEEDS[OTHER_NEEDS.length - 1].toLowerCase()}. If one of those is you,{' '}
          <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
            email {OHRR.email}
          </a>
          .
        </p>

        <Callout className="mt-10 text-center">
          <h2 className="font-display text-xl font-extrabold text-brand-blue">Group visits</h2>
          <p className="mt-2 text-base text-slate-700">
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

function OpenCalls() {
  const [calls, setCalls] = useState<OpenCall[]>([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    listOpenCalls()
      .then(setCalls)
      .catch(() => setCalls([]))
  }, [])
  if (calls.length === 0) return null
  return (
    <div className="mt-10">
      <H2>Help needed now</H2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {calls.map((c) => {
          const left = Math.max(0, c.places - c.taken)
          return (
            <Link key={c.slug} to={`/volunteer/call/${c.slug}`} className="block">
              <Card className="h-full border-brand-orange/40 transition hover:shadow-md">
                <h3 className="font-display text-lg font-extrabold text-brand-blue">{c.title}</h3>
                <p className="mt-1 text-base text-slate-700">
                  {fmtDay(c.on_date)} · {fmtClock(c.starts_at)}–{fmtClock(c.ends_at)}
                </p>
                {c.location && <p className="text-sm text-slate-500">{c.location}</p>}
                {c.summary && <p className="mt-1.5 text-sm text-slate-600">{c.summary}</p>}
                <p className="mt-3 text-base font-bold text-brand-orange-ink">
                  {left > 0 ? `${left} ${left === 1 ? 'place' : 'places'} left — sign up` : 'Full — thank you!'}
                </p>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
