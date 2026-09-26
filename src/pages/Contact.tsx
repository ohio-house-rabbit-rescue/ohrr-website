import { Link } from 'react-router-dom'
import { PageHero, Section, btn, ext, Card, H2, VisitNote, NoDropOffNote } from '../components/ui'
import { OHRR, MAILING_LIST } from '../lib/constants'
import { useOrgProfile } from '../lib/orgProfile'
import { ContactForm } from './Forms'

// OHRR is volunteer-run: email first, a message form, and how visiting works.
// No street address (see OHRR in lib/constants) — it goes out with an
// appointment or a volunteer shift.
export default function Contact() {
  const org = useOrgProfile()
  return (
    <>
      <PageHero
        title="Contact us"
        subtitle="OHRR is run entirely by volunteers, so email is the way to reach us — someone will reply as soon as they can."
        doors={[
          { href: OHRR.emailHref, icon: 'mail', h: 'Email us', p: OHRR.email },
          { href: '#message', icon: 'help', h: 'Send a message', p: 'Right here, no email app needed' },
          { href: '#visit', icon: 'clock', h: 'Hours and visiting', p: 'The Adoption Center and Hop Shop' },
        ]}
      />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div id="message">
            <ContactForm />
          </div>

          <div className="space-y-4">
            <Card>
              <h2 id="visit" className="font-display text-lg font-extrabold text-brand-blue">Hours and visiting</h2>
              {org.notice && (
                <p className="mt-2 rounded-xl bg-brand-orange-50 px-3 py-2 text-sm font-bold text-brand-orange-ink">{org.notice}</p>
              )}
              <p className="mt-2 text-base font-semibold text-slate-700">Adoption Center &amp; Hop Shop: {org.hours}</p>
              <VisitNote className="mt-3" />
              <NoDropOffNote className="mt-3" />
            </Card>

            <Card>
              <h2 className="font-display text-lg font-extrabold text-brand-blue">Email</h2>
              <p className="mt-1 text-sm text-slate-600">Adoptions, surrenders, volunteering, group visits</p>
              <p className="text-base">
                <a href={OHRR.emailHref} className="font-bold text-brand-blue">
                  {OHRR.email}
                </a>
              </p>
              <p className="mt-3 text-sm text-slate-600">Media inquiries and interviews</p>
              <p className="text-base">
                <a href={OHRR.marketingEmailHref} className="font-bold text-brand-blue">
                  {OHRR.marketingEmail}
                </a>
              </p>
            </Card>
          </div>
        </div>

        <H2 className="mt-12">Social media</H2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={OHRR.facebook} {...ext} className={btn.blue}>
            Facebook
          </a>
          <a href={OHRR.instagram} {...ext} className={btn.blue}>
            Instagram
          </a>
          <Link to={MAILING_LIST} className={btn.outline}>
            Get emails from OHRR
          </Link>
        </div>
        <p className="mt-8 text-xs text-slate-600">
          Ohio House Rabbit Rescue is a 501(c)(3) nonprofit · EIN {OHRR.ein}
        </p>
      </Section>
    </>
  )
}
