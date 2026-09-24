import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { PageHero, Section, btn, ext, H2, Card, Callout, IconTile } from '../components/ui'
import { APP_URL } from '../lib/constants'

// What the app does that only a phone can, then what it shares with this site.
const APP_ONLY = [
  { h: 'My Bunny', p: 'Your own rabbits, with vet visits, medicine and nail-trim reminders that go straight into your phone calendar. It stays on your phone.' },
  { h: 'Works offline', p: 'Care guides, the vet list and Bunny Help open without a signal once you have used them.' },
  { h: 'Camera and share sheet', p: 'Send a found-rabbit report or a Happy Tail with a photo from the camera, and share a rabbit straight to Facebook or Instagram.' },
  { h: 'For OHRR volunteers', p: 'Scan an item, the till and the BunFest door — the phone-side staff tools.' },
]
const FEATURES = [
  { h: 'Adoptable rabbits', p: 'The same live list as this site, with photos and each rabbit’s story.' },
  { h: 'Bunny Help', p: 'Type what’s wrong (“not eating”, “hiding”) and get OHRR’s own guidance, ranked by how urgent it is.' },
  { h: 'Care guides and rabbit-savvy vets', p: 'The same articles and vet list, laid out for a phone.' },
  { h: 'Events, including Midwest BunFest', p: 'Dates, venues, and the full BunFest companion: schedule, map, vendors, rescues.' },
  { h: 'Volunteering', p: 'Book a shift, answer a call for help, and see your own hours.' },
  { h: 'Happy Tails, news and ways to give', p: 'Adoption stories, announcements, and every way to support the bunnies.' },
]

export default function GetApp() {
  const [qr, setQr] = useState<string | null>(null)

  // The QR code is generated right here in the browser (no outside image service).
  useEffect(() => {
    let active = true
    QRCode.toDataURL(APP_URL, { width: 288, margin: 1, color: { dark: '#0669ac', light: '#ffffff' } })
      .then((url) => {
        if (active) setQr(url)
      })
      .catch(() => {
        if (active) setQr(null)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <PageHero
        title="Get the OHRR app"
        subtitle="A year-round companion for rabbit lovers: adoptable rabbits, care guides, rabbit-savvy vets, events, volunteering, ways to give and announcements — on your phone."
      />
      <Section>
        {/* Phone users are one tap away */}
        <div className="flex flex-wrap items-center gap-3">
          <a href={APP_URL} {...ext} className={`${btn.orange} !px-7 !py-3 !text-base`}>
            Open the app
          </a>
          <span className="text-sm text-slate-700">{APP_URL.replace('https://', '')}</span>
        </div>

        <div className="mt-12 grid items-start gap-10 md:grid-cols-2">
          <div>
            <H2>What the app is</H2>
            <p className="mt-3 text-base leading-relaxed text-slate-700">
              The OHRR app is a free web app that runs in your phone's browser — nothing to buy, no account
              needed. It shows the same live information as this website, laid out for a phone, and it
              updates the moment OHRR staff make a change. It is for anyone who has a rabbit, wants one, or
              helps the rescue: adopters, volunteers, supporters, and Midwest BunFest visitors.
            </p>
            <h3 className="mt-6 font-display text-lg font-extrabold text-brand-blue">Only in the app</h3>
            <ul className="mt-3 space-y-2.5">
              {APP_ONLY.map((f) => (
                <li key={f.h} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="text-brand-orange">●</span>
                  <span>
                    <strong>{f.h}</strong> — {f.p}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 font-display text-lg font-extrabold text-brand-blue">Shared with this website</h3>
            <ul className="mt-3 space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f.h} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="text-brand-orange">●</span>
                  <span>
                    <strong>{f.h}</strong> — {f.p}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-slate-500">
              App Store and Google Play versions are planned. No account is needed, and anything you keep in My
              Bunny stays on your phone — see our{' '}
              <Link to="/privacy" className="font-semibold text-brand-blue">
                privacy policy
              </Link>
              .
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border-4 border-white shadow-2xl md:border-8">
            <IconTile name="device" size="fill" />
          </div>
        </div>

        <div className="mt-14 grid items-start gap-6 md:grid-cols-3">
          <Callout className="text-center">
            <h2 className="font-display text-lg font-extrabold text-brand-blue">On a computer? Scan this</h2>
            <p className="mt-2 text-sm text-slate-700">
              Point your phone's camera at the code and tap the link that appears.
            </p>
            <div className="mx-auto mt-4 flex h-[288px] w-[288px] max-w-full items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
              {qr ? (
                <img src={qr} alt={`QR code that opens ${APP_URL}`} width={264} height={264} />
              ) : (
                <span className="text-sm text-slate-600">{APP_URL}</span>
              )}
            </div>
          </Callout>

          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Add it to your home screen — iPhone</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Open the app in Safari.</li>
              <li>Tap the Share button (the square with an arrow pointing up).</li>
              <li>Scroll down and tap "Add to Home Screen".</li>
              <li>Tap "Add". The OHRR icon appears with your other apps.</li>
            </ol>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-extrabold text-brand-blue">Add it to your home screen — Android</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Open the app in Chrome.</li>
              <li>Tap the menu (the three dots in the top corner).</li>
              <li>Tap "Add to Home screen" (on some phones, "Install app").</li>
              <li>Tap "Add". The OHRR icon appears with your other apps.</li>
            </ol>
          </Card>
        </div>
      </Section>
    </>
  )
}
