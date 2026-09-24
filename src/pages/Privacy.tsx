import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, PrintButton, ext } from '../components/ui'
import { APP_URL, LIVE_SITE, OHRR } from '../lib/constants'

// Privacy policy for this website and the OHRR app (required by the App Store and
// Google Play; the store listings point here). Every statement describes how the
// two actually work today — check the code before changing a claim:
//   - hosting: Cloudflare Pages; database + staff sign-in: Supabase (both repos);
//   - no ad networks or tracking cookies; the only measurement is Cloudflare Web
//     Analytics (cookie-free), when OHRR switches it on in the Cloudflare dashboard;
//   - public forms → `submit_request` → the `requests` table (Staff → Inbox);
//     bookings → `bookings`; raffle reservations → `raffle_ticket_orders`;
//     volunteer hours → `bookings` check-ins + `volunteer_hours_entries`;
//   - My Bunny, follows, saved sessions, the optional profile: device only
//     (ohrr-app/src/features/mybunny/*, lib/follow.ts, savedSessions.ts, profile.ts);
//   - camera: My Bunny photos (native Camera plugin / <input capture>), and the
//     staff scanner + item photos (getUserMedia / file input) — only when tapped;
//   - notifications: local, scheduled on the device (@capacitor/local-notifications);
//     no push server;
//   - staff can delete their own account in the app (`delete_own_account`).
const UPDATED = 'September 22, 2026'
const APP_HOST = APP_URL.replace('https://', '')
const SITE_HOST = 'ohrr-website.pages.dev'

// Generous type for older readers, on screen and in print.
function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 font-display text-xl font-extrabold text-ink sm:text-2xl">{children}</h2>
}
function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-base leading-relaxed text-slate-700 md:text-lg">{children}</p>
}
function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-6 text-base leading-relaxed text-slate-700 md:text-lg">{children}</ul>
}
const a = 'font-semibold text-brand-blue hover:text-brand-blue-dark'

export default function Privacy() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        subtitle="How Ohio House Rabbit Rescue handles your information on this website and in the OHRR app — in plain English."
      />
      <Section className="print-urls">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Draft — pending OHRR board review · Last updated: {UPDATED}
        </p>
        <p className="print-only mt-2 font-display text-2xl font-black">Ohio House Rabbit Rescue — Privacy Policy</p>
        <div className="no-print mt-4">
          <PrintButton label="Print this policy" />
        </div>

        <div className="max-w-3xl print-break-inside-avoid">
          <P>
            <strong>The short version:</strong> you can use this website and the OHRR app without an account. We do
            not sell personal information. There are no advertising networks and no tracking cookies. Anything you
            keep in the app's <strong>My Bunny</strong> section stays on your own phone and is never sent to us. The
            only information we keep about you is what you type into a form, a booking or a raffle-ticket reservation
            — and we keep it so we can do what you asked.
          </P>

          <H>Who we are</H>
          <P>
            Ohio House Rabbit Rescue (OHRR), {OHRR.place}, is a 501(c)(3) nonprofit rabbit rescue (EIN {OHRR.ein}).
            Questions about this policy or your information: email{' '}
            <a href={OHRR.emailHref} className={a}>
              {OHRR.email}
            </a>
            .
          </P>

          <H>What this policy covers</H>
          <P>
            This policy covers this website ({SITE_HOST}) and the OHRR app — the web app at{' '}
            <a href={APP_URL} {...ext} className={a}>
              {APP_HOST}
            </a>{' '}
            and the Android and iPhone versions of it. All of them show the same information from OHRR's system, and
            what you enter in one is handled the same way.
          </P>
          <P>
            Our long-standing website,{' '}
            <a href={LIVE_SITE} {...ext} className={a}>
              ohiohouserabbitrescue.org
            </a>
            , and the pages we link to for donations, merchandise and the Amazon wish list are run separately. When
            you follow a link to one of them, that site's own policy applies.
          </P>

          <H>No account, no tracking</H>
          <UL>
            <li>
              No account or sign-in is needed to use this website or the public parts of the app. Only OHRR staff and
              volunteers sign in, to use the staff tools.
            </li>
            <li>We do not sell, rent or trade personal information.</li>
            <li>
              We do not use advertising networks or tracking cookies. To see how many people visit which pages we may
              use Cloudflare Web Analytics, which uses no cookies and does not identify individual visitors.
            </li>
            <li>
              The lettering on both is loaded from Google Fonts. Like loading any web page, that sends your device's
              standard request (including its IP address) to Google's font servers; no other information is shared.
            </li>
          </UL>

          <H>Information you choose to give us</H>
          <UL>
            <li>
              <strong>Forms.</strong> The adoption application, the foster and volunteer interest forms, the
              surrender intake, the contact form, the mailing-list and Supporter sign-ups, and a Happy Tails story are
              all sent to OHRR and stored in our database (run for us by Supabase) so that our volunteers can read and
              reply. That is your name, email address and/or phone number and what you wrote; the adoption
              application and surrender intake also ask about your home and the rabbit. We keep adoption and surrender
              records for as long as we are responsible for the rabbit.
            </li>
            <li>
              <strong>Bookings.</strong> When you book a volunteer shift, an adoption visit, a bonding session or a
              clinic time we store your name, email, phone number, party size, your answers to that booking's
              questions and whether you attended. Your booking is confirmed on screen and kept on your own device, with a
              private link that lets you cancel; we do not send confirmation emails.
              Volunteer check-ins are counted toward a volunteer's service hours, and OHRR can print a service-hours
              letter for that volunteer on request.
            </li>
            <li>
              <strong>Raffle tickets.</strong> If you reserve raffle tickets for Midwest BunFest we store your name,
              phone number, optional email, your ticket numbers and whether they were paid for at the raffle table.
              Payment happens in person — the app never asks for card details. Winning numbers and the winner's name
              are kept as the record of the draw.
            </li>
            <li>
              <strong>Staff and volunteer sign-in.</strong> OHRR staff sign in with an email address and password.
              Sign-in is handled by Supabase Auth, which stores the password in protected (hashed) form; password
              reset emails go to that address. Actions taken in the staff tools are logged (who changed what, and
              when). Staff can delete their own account from the staff dashboard; their sign-in and staff access are
              removed and anything they added for the rescue stays, unattributed.
            </li>
            <li>
              <strong>Emails you send us.</strong> We keep them for as long as we need to reply and to keep our
              adoption and surrender records.
            </li>
          </UL>
          <P>
            You can ask us at any time to show you or delete the information we hold about you — email{' '}
            <a href={OHRR.emailHref} className={a}>
              {OHRR.email}
            </a>
            . We may keep what the law or our adoption contracts require.
          </P>

          <H>My Bunny and other things kept on your device (app)</H>
          <P>
            The app's <strong>My Bunny</strong> section is a care companion for your own rabbit. Everything in it —
            your rabbit's name and details, photos, weight log, reminders and health notes — is stored{' '}
            <strong>only on your device</strong>, in the app's local storage and on-device database. It is never
            sent to OHRR or to anyone else.
          </P>
          <UL>
            <li>
              <strong>Camera and photos.</strong> The app uses the camera only when you tap something that needs it:
              "Take a photo" for your rabbit, or — for OHRR staff — the scanner that reads a printed tag or barcode and
              the photo of a donated item. The phone asks for permission the first time. Rabbit photos stay on your
              device; item photos taken by staff are stored with that item in OHRR's database.
            </li>
            <li>
              <strong>Reminders.</strong> Care reminders you switch on are scheduled on your phone as ordinary
              notifications. There is no notification server: nothing about your reminders leaves the device.
            </li>
            <li>
              <strong>Sharing.</strong> When you share a backup, an image or a letter from the app, the phone's own
              share sheet sends it where you choose; we do not see it.
            </li>
            <li>
              Also kept only on your device: the rabbits you follow, the BunFest sessions you save, the optional name
              and email you can add under Settings, and the link to your last raffle-ticket reservation.
            </li>
            <li>
              Deleting the app — or, for the web app, clearing your browser's data for {APP_HOST} — removes all of
              this. Keep a Backup if you want a copy.
            </li>
          </UL>

          <H>Information collected automatically</H>
          <P>
            Our hosting provider (Cloudflare) and our database provider (Supabase) keep standard server logs — the IP
            address, browser type, pages or data requested and the time — to run and protect the service. We do not
            use these logs to identify you. Links on our flyers, posts and letters carry a short tag that tells us
            which flyer or post a visit came from; it says nothing about who you are.
          </P>

          <H>Links to other sites</H>
          <P>
            The website and app link to other organizations' sites — for example Amazon (the wish list), Bonfire
            (merchandise), Kroger Community Rewards, Petfinder and Adopt-a-Pet, the Ohio BMV, Facebook, Instagram, and
            the websites of rabbit-savvy vets. In the app these open in your phone's browser. Their own privacy
            policies apply once you are there.
          </P>

          <H>Children</H>
          <P>
            The website and app are not directed to children under 13, and we do not knowingly collect information
            from them. Bookings for children who take part in bunny socialization are made by a parent or guardian.
            If you believe a child has sent us personal information, email us and we will delete it.
          </P>

          <H>Changes to this policy</H>
          <P>
            If we change how we handle information, we will post the updated policy here with a new date at the top.
          </P>

          <H>Contact</H>
          <P>
            Ohio House Rabbit Rescue, {OHRR.place} ·{' '}
            <a href={OHRR.emailHref} className={a}>
              {OHRR.email}
            </a>
          </P>
          <p className="no-print mt-8 text-sm text-slate-500">
            See also:{' '}
            <Link to="/app" className={a}>
              Get the OHRR app
            </Link>{' '}
            ·{' '}
            <Link to="/contact" className={a}>
              Contact us
            </Link>
          </p>
        </div>
      </Section>
    </>
  )
}
