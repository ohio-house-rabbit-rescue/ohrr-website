import { Link } from 'react-router-dom'
import { PageHero, Section, btn, ext, Card, ContactRow, H2 } from '../components/ui'
import { OHRR, APPLY, MAILING_LIST } from '../lib/constants'

export default function Contact() {
  return (
    <>
      <PageHero title="Contact us" subtitle="The OHRR Adoption Center and Hop Shop in Columbus, Ohio." />
      <Section>
        <ContactRow />

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
            <p className="mt-2 text-base font-semibold text-slate-700">{OHRR.hours}</p>
            <p className="mt-1 text-sm text-slate-600">{OHRR.hoursNote}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={APPLY} {...ext} className={btn.orange}>
                Adoption application
              </a>
              <Link to="/hop-shop" className={btn.outline}>
                About the Hop Shop
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Contact information</h3>
            <p className="mt-2 text-sm text-slate-600">Phone</p>
            <p className="text-base">
              <a href={OHRR.phoneHref} className="font-bold text-brand-blue">
                {OHRR.phone}
              </a>
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
          <a href={MAILING_LIST} {...ext} className={btn.outline}>
            Join the OHRR mailing list
          </a>
        </div>
        <p className="mt-8 text-xs text-slate-400">
          Ohio House Rabbit Rescue is a 501(c)(3) nonprofit · EIN {OHRR.ein}
        </p>
      </Section>
    </>
  )
}
