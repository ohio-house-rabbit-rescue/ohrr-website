import { Link } from 'react-router-dom'
import { PageHero, Section, btn, ext, Card, ContactRow, H2 } from '../components/ui'
import { OHRR, APPLY, MAILING_LIST } from '../lib/constants'
import { useOrgProfile } from '../lib/orgProfile'
import { ContactForm } from './Forms'

export default function Contact() {
  const org = useOrgProfile()
  return (
    <>
      <PageHero title="Contact us" subtitle="The OHRR Adoption Center and Hop Shop in Columbus, Ohio." />
      <Section>
        <ContactRow />

        <div className="mt-8 max-w-2xl">
          <ContactForm />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">OHRR Adoption Center</h3>
            <p className="mt-2 text-base text-slate-700">
              {OHRR.street}
              <br />
              {OHRR.cityStateZip}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{OHRR.landmark}</p>
            <a href={OHRR.mapsHref} {...ext} className={`${btn.blue} mt-4`}>
              Get directions
            </a>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Hop Shop hours</h3>
            {org.notice && (
              <p className="mt-2 rounded-xl bg-brand-orange-50 px-3 py-2 text-sm font-bold text-brand-orange-dark">{org.notice}</p>
            )}
            <p className="mt-2 text-base font-semibold text-slate-700">{org.hopshop_hours}</p>
            <p className="mt-1 text-sm text-slate-600">{OHRR.hoursNote}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={APPLY} className={btn.orange}>
                Adoption application
              </Link>
              <Link to="/hop-shop" className={btn.outline}>
                About the Hop Shop
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Contact information</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              OHRR is run entirely by volunteers, so email is the way to reach us — someone will reply as soon as they can.
            </p>
            <p className="mt-3 text-sm text-slate-600">Email (adoptions, surrenders, volunteering, group visits)</p>
            <p className="text-base">
              <a href={OHRR.emailHref} className="font-bold text-brand-blue">
                {OHRR.email}
              </a>
            </p>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Marketing &amp; media</h3>
            <p className="mt-2 text-sm text-slate-600">
              For media inquiries, interviews, or additional information, please contact:
            </p>
            <p className="text-base">
              <a href={OHRR.marketingEmailHref} className="font-bold text-brand-blue">
                {OHRR.marketingEmail}
              </a>
            </p>
          </Card>
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
            Join the OHRR mailing list
          </Link>
        </div>
        <p className="mt-8 text-xs text-slate-400">
          Ohio House Rabbit Rescue is a 501(c)(3) nonprofit · EIN {OHRR.ein}
        </p>
      </Section>
    </>
  )
}
