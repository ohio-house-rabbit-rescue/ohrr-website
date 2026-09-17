import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, PrintButton, ext } from '../components/ui'
import { APP_URL, LIVE_SITE, OHRR } from '../lib/constants'

// Privacy policy for this website and the OHRR app (required by the App Store and
// Google Play for the store versions). Every statement here describes how the two
// actually work today — check the code before changing a claim:
//   - no analytics, ad or tracking scripts anywhere (index.html, netlify.toml);
//   - the site itself has no forms; the app's request forms post to Netlify Forms
//     (ohrr-app/index.html lists them; the raffle form is behind a staff test flag);
//   - My Bunny, follows, saved sessions and the optional profile live only on the
//     device (ohrr-app/src/features/mybunny/storage.ts, photos.ts; lib/follow.ts,
//     savedSessions.ts, profile.ts); photos come from a plain <input type="file">;
//   - staff sign-in is Supabase Auth (email + password), session kept in the browser.
const UPDATED = 'September 17, 2026'
const APP_HOST = APP_URL.replace('https://', '')
const SITE_HOST = 'ohrr-website.netlify.app'

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
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Draft — pending OHRR board review · Last updated: {UPDATED}
        </p>
        <p className="print-only mt-2 font-display text-2xl font-black">Ohio House Rabbit Rescue — Privacy Policy</p>
        <div className="no-print mt-4">
          <PrintButton label="Print this policy" />
        </div>

        <div className="max-w-3xl print-break-inside-avoid">
          <P>
            <strong>The short version:</strong> you can use this website and the OHRR app without an account. We do
            not sell personal information. There are no advertising networks, no third-party analytics and no
            tracking cookies. Anything you keep in the app's <strong>My Bunny</strong> section stays on your own
            phone and is never sent to us.
          </P>

          <H>Who we are</H>
          <P>
            Ohio House Rabbit Rescue (OHRR), {OHRR.address}, is a 501(c)(3) nonprofit rabbit rescue (EIN {OHRR.ein}).
            Questions about this policy or your information: email{' '}
            <a href={OHRR.emailHref} className={a}>
              {OHRR.email}
            </a>
            .
          </P>

          <H>What this policy covers</H>
          <P>
            This policy covers this website ({SITE_HOST}) and the OHRR mobile app — the web app at{' '}
            <a href={APP_URL} {...ext} className={a}>
              {APP_HOST}
            </a>{' '}
            and the App Store and Google Play versions when they are released. Both show the same information from
            OHRR's system.
          </P>
          <P>
            Some things still happen on our long-standing website,{' '}
            <a href={LIVE_SITE} {...ext} className={a}>
              ohiohouserabbitrescue.org
            </a>
            : the adoption application, the surrender forms and online donations. When you follow a link there, that
            site handles what you enter; this policy does not cover it.
          </P>

          <H>No account, no tracking</H>
          <UL>
            <li>
              No account or sign-in is needed to use this website or the public parts of the app. Only OHRR staff and
              volunteers sign in, to use the staff tools.
            </li>
            <li>We do not sell, rent or trade personal information.</li>
            <li>
              We do not use advertising networks, third-party analytics (such as Google Analytics) or tracking
              cookies on the website or in the app.
            </li>
            <li>
              The lettering on both is loaded from Google Fonts. Like loading any web page, that sends your device's
              standard request (including its IP address) to Google's font servers; no other information is shared.
            </li>
          </UL>

          <H>Information you choose to give us</H>
          <UL>
            <li>
              <strong>Staff and volunteer sign-in.</strong> OHRR staff sign in with an email address and password.
              Sign-in is handled by Supabase Auth, which stores the password in protected (hashed) form; password
              reset emails go to that address. The sign-in is used only to give OHRR staff access to the staff tools.
              Your sign-in session is kept in your browser so you stay signed in until you sign out.
            </li>
            <li>
              <strong>Request forms in the app.</strong> The app has a few forms that send a request to OHRR: an
              adoption appointment request, volunteer sign-up, surrender intake, a Happy Tails story, Midwest BunFest
              service reservations (Bunny Spa and Glamour Shots) and — only while OHRR has switched on that test
              feature — raffle-ticket reservations. What you type is delivered to OHRR through Netlify Forms, which
              stores submissions so our volunteers can read and reply. That is usually your name, email address
              and/or phone number and the details of your request; the surrender intake also asks for your address
              and information about the rabbit. Payment for BunFest services and raffle tickets happens at the event
              — the app never asks for payment details.
            </li>
            <li>
              <strong>Emails you send us.</strong> We keep them for as long as we need to reply and to keep our
              adoption and surrender records.
            </li>
          </UL>

          <H>My Bunny and other things kept on your device (app)</H>
          <P>
            The app's <strong>My Bunny</strong> section is a care companion for your own rabbit. Everything in it —
            your rabbit's name and details, photos, weight log, reminders and health notes — is stored{' '}
            <strong>only on your device</strong>, in the app's local storage and on-device database. It is never
            sent to OHRR or to anyone else.
          </P>
          <UL>
            <li>
              <strong>Photos and camera.</strong> The app only asks for a photo when you tap "Add a photo". Your
              phone then lets you take a picture or choose one from your library; the photo is shrunk and kept on the
              device. The app does not access your camera or photos at any other time.
            </li>
            <li>
              <strong>Calendar.</strong> Reminder and BunFest-schedule calendar files (.ics) are generated on your
              device and handed to your calendar app.
            </li>
            <li>
              <strong>Backup and restore.</strong> Backup creates a file that you control — save or share it as you
              wish. Restore reads a backup file you choose.
            </li>
            <li>
              Also kept only on your device: the rabbits you follow, the BunFest sessions you save, and the optional
              name and email you can add under Settings. None of it is sent anywhere.
            </li>
            <li>
              Deleting the app — or, for the web app, clearing your browser's data for {APP_HOST} — removes all of
              this. Keep a Backup if you want a copy.
            </li>
          </UL>

          <H>Information collected automatically</H>
          <P>
            Our hosting provider (Netlify) and our database provider (Supabase) keep standard server logs — the IP
            address, browser type, pages or data requested and the time — to run and protect the service. We do not
            use these logs to identify you. The app's list of adoptable rabbits can be fetched from Petfinder by our
            own server; your device only contacts Petfinder if you tap a link to it.
          </P>

          <H>Links to other sites</H>
          <P>
            The website and app link to other organizations' sites — for example Bonfire (merchandise), Kroger
            Community Rewards, Petfinder, Adopt-a-Pet, Amazon (the wish list), SignUp.com (volunteer shifts), the
            Ohio BMV, Facebook, Instagram, and the websites of rabbit-savvy vets. Their own privacy policies apply
            once you are there.
          </P>

          <H>Children</H>
          <P>
            The website and app are not directed to children under 13, and we do not knowingly collect information
            from them. If you believe a child has sent us personal information, email us and we will delete it.
          </P>

          <H>Changes to this policy</H>
          <P>
            If we change how we handle information, we will post the updated policy here with a new date at the top.
          </P>

          <H>Contact</H>
          <P>
            Ohio House Rabbit Rescue, {OHRR.address} ·{' '}
            <a href={OHRR.emailHref} className={a}>
              {OHRR.email}
            </a>{' '}
            ·{' '}
            <a href={OHRR.phoneHref} className={a}>
              {OHRR.phone}
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
