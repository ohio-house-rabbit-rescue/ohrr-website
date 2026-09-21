import { Link } from 'react-router-dom'
import { PageHero, Section, btn, ext, H2, Card, Callout, LinkCard } from '../components/ui'
import { APPLY, BE_THE_VOICE_PDF, CAPITAL_PLEDGE_PDF, BUNFEST_SITE, OHRR } from '../lib/constants'

// Text from the live About Us pages: Mission and Vision, Background, Volunteer Family,
// and the Ohio House Rabbit Adoption Center (captured 2026-09-17).

const GOALS = [
  'Host and sponsor the annual Midwest BunFest in Columbus, Ohio – a multi-state educational exposition and fundraiser.',
  'Continue a successful Capital Campaign to fund the Ohio House Rabbit Adoption Center: a rescue, education, and adoption facility in Columbus, Ohio.',
  'Build both our membership and volunteer base through community outreach and special events.',
  'Obtain grants, corporate funding, and individual contributions to support educational programs, build capacity, and fund the Capital Campaign.',
  'Build relationships and collaborations with other animal rescue organizations, local businesses and corporations.',
  'Develop educational resources and programming on the proper care of rabbits as indoor companions.',
]

const FAMILY = [
  {
    name: 'Beverly May',
    role: 'Founding Director and Shelter Manager',
    bio: 'Bev has loved and parented rabbits for nearly 30 years. She saw a need for a rabbit rescue in central Ohio and in 2009 founded Ohio House Rabbit Rescue. She manages the OHRR Adoption Center and all of its volunteers, and oversees the care of all our adoptable bunnies, volunteer training, and our adoption program. She has bunnies of her own and makes room for foster bunnies as needed.',
  },
  {
    name: 'Pat Barron',
    role: 'Chair of the OHRR Board of Directors and Co-Chair of Midwest BunFest',
    bio: 'Pat manages all of the behind-the-scenes projects for OHRR. She facilitates group visits to the center, adoption and fundraising events throughout the year, and all things Midwest BunFest. Given any downtime Pat also volunteers in the Hop Shop. She has bunnies of her own and opens her home to foster bunnies as needed.',
  },
  {
    name: 'Kim Banks',
    role: 'Board Member and Adoption Coordinator',
    bio: 'Kim has been part of the OHRR family since the very beginning. She spends most of her time at the Adoption Center assisting potential adopters and caring for the bunnies. She is our resident bunny matchmaker, facilitating most of our bunny bonding sessions, delivers most of our bunnies to their forever homes, cares for our special-needs bunnies, and helps with events throughout the year. Kim has three bunnies of her own as well as two dogs, a cat, and a tarantula.',
  },
  {
    name: 'Adrienne Lang',
    role: 'Volunteer since 2011',
    bio: 'Adrienne has helped with Buncare at the rescue, bunny field rescues, and so much more. She is always brainstorming improvements to the center and our events, and coordinates our rescue partners each year at Midwest BunFest. Adrienne has had house rabbits since 2002 and is our resident expert on any litters that come to the rescue.',
  },
  {
    name: 'Mary Beth Parisi',
    role: 'Board Member and Co-Chair of Midwest BunFest',
    bio: 'Mary Beth has assisted with our website, marketing, fundraisers, and much more. She currently oversees the Midwest BunFest website and assists with many aspects of BunFest. She has been a bunny mom since 2007.',
  },
  {
    name: 'Shanleigh Brown',
    role: 'Volunteer since 2014',
    bio: 'Shanleigh started out fostering through OHRR and, like many of our foster parents, became a "foster failure," adopting her foster bunny. She is now a mother to four bunnies, all adopted through OHRR, and still fosters as needed. She spends most of her time doing bunny field rescues, maintaining our social media accounts, and overseeing Midwest BunFest marketing.',
  },
  {
    name: 'Tracy Wiczer',
    role: 'Volunteer since 2014',
    bio: 'Tracy volunteers every week doing Buncare, frequently transports bunnies to and from the vet, and assists with most of our bunny field rescues. She coordinates the Chillaxabun Lounge at Midwest BunFest and opens her home to bunnies with special medical needs or nowhere else to go. Tracy has eight bunnies of her own, two chinchillas, and a frequent flow of foster bunnies.',
  },
  {
    name: 'Katie Wolfe & Julie Wolfe',
    role: 'Volunteers since 2014',
    bio: 'Katie and Julie found OHRR when they were looking for a friend for their bunny, Foo Foo. They do Buncare every week, assist in most of our bunny field rescues, photograph all of our adoptable bunnies, and help with vet transportation. Katie maintains the adoption board at the center and Julie manages the OHRR and Midwest BunFest websites. They are mothers to three bunnies, all adopted from OHRR or CHRS.',
  },
  {
    name: 'Kim Eplin',
    role: 'Volunteer since 2013',
    bio: 'Kim regularly assists with Buncare throughout the week and focuses most of her weekend hours on adoption coordination. She also helps with vet transportation, our special-needs bunnies, and fundraising events. Kim fosters from time to time, is a mom to two OHRR bunnies, and also rescues cats in her spare time.',
  },
  {
    name: 'Nancy Betz',
    role: 'Board Member',
    bio: 'Nancy manages our internship program through The Ohio State University and oversees our education sessions each year at Midwest BunFest. She also assists with fundraising and adoption events throughout the year and fosters for us as needed.',
  },
]

export default function About() {
  return (
    <>
      <PageHero
        title="About OHRR"
        subtitle="A rabbit-specific rescue in Central Ohio, founded in 2009, operating the Ohio House Rabbit Adoption Center in Columbus."
      />
      <Section>
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <H2>Mission and vision</H2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
              <p>
                <strong>Our mission</strong> is to operate the Ohio House Rabbit Adoption Center, rescue
                abandoned pet rabbits, offer a robust adoption program, and provide educational resources
                and programming on the proper care of rabbits as indoor companions.
              </p>
              <p>
                <strong>Our vision:</strong> Ohio House Rabbit Rescue envisions a community where all pet
                rabbits live indoors as companions and have access to a proper diet, habitat, and regular
                veterinary care for the duration of their life.
              </p>
            </div>

            <H2 className="mt-12">Background</H2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
              <p>
                Ohio House Rabbit Rescue (OHRR) was <strong>founded in 2009</strong> when longtime rabbit
                owner Beverly May saw the need for a rabbit-specific rescue in Central Ohio. After rescuing
                nine abandoned rabbits, May realized that not all domestic rabbits in the community were as
                lucky. In fact, every year in Central Ohio alone, <strong>over 900 rabbits</strong> are
                offered for surrender at animal shelters or rescues that are already at full capacity.
                Rabbits not placed in a shelter are frequently released outdoors, which is a death sentence
                for the fragile prey animal.
              </p>
              <p>
                OHRR seeks a solution to this animal welfare problem by establishing and operating the Ohio
                House Rabbit Adoption Center, a facility that provides temporary housing and care for 25–30
                rabbits at a time.
              </p>
              <p>
                OHRR is comprised of a Board of Directors and diverse teams of volunteers, all working to
                operate the center. Two of the volunteer team members have extensive experience establishing
                and running a successful not-for-profit; others have backgrounds in marketing, communications,
                development, corporate strategic planning, education, animal sciences, interpretive work,
                event planning and journalism. OHRR is funded through donations, memberships, grants, special
                events, and partnerships with businesses and organizations. OHRR does not receive government
                funds.
              </p>
            </div>
            <h3 className="mt-6 font-display text-lg font-extrabold text-brand-blue">Major goals</h3>
            <ul className="mt-3 space-y-2">
              {GOALS.map((g) => (
                <li key={g} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="text-brand-orange">●</span>
                  <span>
                    {g.includes('Midwest BunFest') ? (
                      <>
                        Host and sponsor the annual{' '}
                        <a href={BUNFEST_SITE} {...ext} className="font-semibold text-brand-blue">
                          Midwest BunFest
                        </a>{' '}
                        in Columbus, Ohio – a multi-state educational exposition and fundraiser.
                      </>
                    ) : (
                      g
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <H2 className="mt-12">The Ohio House Rabbit Adoption Center</H2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
              <p>
                OHRR leases a 4,073 square-foot property spread across 18 rooms of varying sizes. Most of
                these rooms house adoptable rabbits — enough space for 25 to 30 rabbits in 4-foot-by-4-foot
                enclosures, which meets House Rabbit Society national standards and provides an excellent
                environment for the bunnies during their stay.
              </p>
              <p>
                The center also has a room for basic veterinary care, an intake room for new rabbits, two
                rooms for a rabbit play area, two small kitchens, a laundry room, and a combination library
                and meeting room for programs and events. At the entrance there is space for a rabbit supply
                store — the Hop Shop — where rabbit owners can buy high-quality supplies.
              </p>
              <p>
                The Adoption Center is funded through donations, store sales and other rabbit-related
                services, grants, special fundraising events and partnerships with businesses and
                organizations. OHRR's <em>Be the Voice</em> campaign raises funds to purchase the Adoption
                Center; donors at all levels are recognized.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={BE_THE_VOICE_PDF} {...ext} className={btn.outline}>
                Be the Voice (PDF)
              </a>
              <a href={CAPITAL_PLEDGE_PDF} {...ext} className={btn.outline}>
                Giving levels & pledge form (PDF)
              </a>
            </div>
          </div>

          <aside className="space-y-4">
            <Callout className="!p-6">
              <h2 className="font-display text-lg font-extrabold text-brand-blue">Visit us</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {OHRR.street}
                <br />
                {OHRR.cityStateZip}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{OHRR.landmark}</p>
              <p className="mt-3 text-sm text-slate-700">
                Hop Shop &amp; Adoption Center: <strong>{OHRR.hours}</strong>
                <br />
                {OHRR.hoursNote}
              </p>
              <p className="mt-3 text-sm">
                <a href={OHRR.phoneHref} className="font-semibold text-brand-blue">
                  {OHRR.phone}
                </a>
              </p>
              <p className="mt-1 text-sm">
                <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
                  {OHRR.email}
                </a>
              </p>
              <p className="mt-1 text-sm">
                <a href={OHRR.mapsHref} {...ext} className="font-semibold text-brand-blue">
                  Directions
                </a>
              </p>
              <p className="mt-4 text-xs text-slate-400">501(c)(3) nonprofit · EIN {OHRR.ein}</p>
            </Callout>
            <LinkCard to="/contact" icon="mail" h="Contact us" p="Address, hours, email, phone, social media and media inquiries." cta="Contact →" />
            <LinkCard to="/hop-shop" icon="bag" h="Hop Shop" p="Rabbit food, supplies and toys at the Adoption Center. Profits support OHRR." cta="Hop Shop →" />
            <LinkCard to="/partners" icon="star" h="Partners" p="The businesses and organizations that support OHRR and Midwest BunFest." cta="Partners →" />
            <LinkCard to="/surrender" icon="mappin" h="Found a rabbit? Need to surrender?" p="Our admissions policy, the surrender forms, and how field rescues work." cta="Admissions →" />
            <LinkCard to="/news" icon="sparkles" h="News" p="Announcements and fundraisers from OHRR, plus the mailing list." cta="News →" />
          </aside>
        </div>

        <H2 className="mt-16">Our volunteer family</H2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Thank you to all of our faithful Adoption Center and Midwest BunFest volunteers!
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FAMILY.map((f) => (
            <Card key={f.name}>
              <h3 className="font-display text-lg font-extrabold text-brand-blue">{f.name}</h3>
              <p className="text-sm font-semibold text-slate-500">{f.role}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.bio}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <Link to={APPLY} className={btn.orange}>
            Adopt a rabbit
          </Link>
        </div>
      </Section>
    </>
  )
}
