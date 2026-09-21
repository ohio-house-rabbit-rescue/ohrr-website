import type { SponsorTier } from './types'

// Site-wide constants. Every fact here comes from ohiohouserabbitrescue.org
// (captured 2026-09-17) — keep it that way: no invented facts.

export const APP_URL = 'https://ohrr-app.pages.dev'
export const STAFF_URL = `${APP_URL}/staff`
export const LIVE_SITE = 'https://ohiohouserabbitrescue.org'

// Live-site pages we hand off to (forms and payment stay on the current site).
export const DONATE = 'https://ohiohouserabbitrescue.org/support-ohrr/donate/'
export const APPLY = 'https://www.ohiohouserabbitrescue.org/adopt/adoption-application/'
export const ADOPTION_POLICY_PDF = 'https://www.ohrr.org/wp-content/uploads/2025/09/Adoption-Policy.pdf'
export const PETFINDER = 'http://www.petfinder.com/pet-search?shelterid=OH975'
export const ADOPT_A_PET =
  'http://www.adoptapet.com/animal-shelter-search?city_or_zip=43235&shelter_name=Ohio+House+Rabbit+Rescue&distance=50&adopts_out=all'
export const BUNNY_DATES_ARTICLE = 'https://www.ohiohouserabbitrescue.org/bunny_dates_at_ohrr/'
export const MAILING_LIST = 'https://ohiohouserabbitrescue.org/join-ohrr-mailing-list/'
export const MERCH_STORE = 'https://www.bonfire.com/store/ohrr-shirt-store/'
// Midwest BunFest's own Bonfire store (the "Bonfire Store" link on midwestbunfest.org).
export const BUNFEST_MERCH = 'https://www.bonfire.com/midwest-bunfest-2026/'
export const WISH_LIST_PAGE = 'https://ohiohouserabbitrescue.org/support-ohrr/wishlist/'
export const AMAZON_WISH_LIST = 'https://www.amazon.com/hz/wishlist/ls/1C5PQRB5VI51L'
export const WORKPLACE = 'https://www.ohiohouserabbitrescue.org/workplace-donations/'
export const KROGER_POST = 'https://ohiohouserabbitrescue.org/link-ohrr-to-your-kroger-community-rewards/'
export const KROGER_REWARDS = 'https://www.kroger.com/i/community/community-rewards'
export const LICENSE_PLATE = 'https://ohiohouserabbitrescue.org/drive-for-the-bunnies-get-your-ohrr-license-plate-today/'
export const BECOME_SUPPORTER = 'https://www.ohiohouserabbitrescue.org/support-ohrr/become-a-supporter/'
export const ONLINE_AFFILIATES = 'https://www.ohiohouserabbitrescue.org/support-ohrr/online-affiliates/'
export const HOST_FUNDRAISER = 'https://www.ohiohouserabbitrescue.org/support-ohrr/host-a-fundraiser/'
export const LEGACY_FUND = 'https://www.ohiohouserabbitrescue.org/ohrr-legacy-fund/'
export const SPAY_IT_FORWARD = 'https://www.columbushumane.org/spayitforward'
export const ADMISSIONS_PAGE = 'https://ohiohouserabbitrescue.org/about-us/admissions/'
export const ADMISSIONS_POLICY_PDF = 'https://ohiohouserabbitrescue.org/wp-content/uploads/2013/06/Admissions-Policy.pdf'
export const SURRENDER_POLICY_PDF =
  'https://ohiohouserabbitrescue.org/wp-content/uploads/2013/06/GSOwnerSurrenderrelinquishmentPolicy.pdf'
export const GOOD_SAMARITAN_FORM =
  'https://www.ohiohouserabbitrescue.org/about-us/admissions/good-samaritian-rescuesurrender-and-relinquishment-form/'
export const OWNER_SURRENDER_FORM =
  'https://www.ohiohouserabbitrescue.org/about-us/admissions/owner-surrender-and-relinquishment-form/'
export const BE_THE_VOICE_PDF = 'https://www.ohiohouserabbitrescue.org/wp-content/uploads/2013/07/Be-the-Voice.pdf'
export const CAPITAL_PLEDGE_PDF =
  'https://www.ohiohouserabbitrescue.org/wp-content/uploads/2013/07/Capital-Campaign-Pledge-Form.pdf'
export const BUNFEST_SITE = 'https://www.midwestbunfest.org/'
export const CHRS_SITE = 'http://www.columbusrabbit.org/'
export const HRS_SITE = 'http://www.rabbit.org'
export const CHRS_TIPLINE = 'chrstipline@gmail.com'
export const OHIO_WILDLIFE_CENTER = 'https://www.ohiowildlifecenter.org/wildlife-emergency/'

// Volunteer shifts are booked in-house now (/book/bunny-socialization, /book/buncare-shift).
// The live site's SignUp.com links, for reference only:
//   http://signup.com/go/35ayZe (Bunny Socialization) · http://signup.com/go/WuT2xR (Buncare)

export const OHRR = {
  name: 'Ohio House Rabbit Rescue',
  street: '5485 N. High Street',
  cityStateZip: 'Columbus, OH 43214',
  address: '5485 N. High Street, Columbus, OH 43214',
  landmark:
    'We are located north of Graceland Shopping Center and south of Selby Blvd — right next to the Firestone Complete Auto Care store.',
  mapsHref:
    'https://www.google.com/maps/dir/?api=1&destination=5485+N.+High+Street%2C+Columbus%2C+OH+43214',
  phone: '614-263-8557',
  phoneHref: 'tel:+16142638557',
  email: 'ohrrcontact@ohiohouserabbitrescue.org',
  emailHref: 'mailto:ohrrcontact@ohiohouserabbitrescue.org',
  marketingEmail: 'ohrrmarketing@gmail.com',
  marketingEmailHref: 'mailto:ohrrmarketing@gmail.com',
  hours: 'Saturday & Sunday, noon – 4:00 pm',
  hoursNote: 'Adoptions by appointment only',
  ein: '27-0830606',
  facebook: 'https://www.facebook.com/ohiohouserabbitrescue/',
  instagram: 'https://www.instagram.com/ohio_house_rabbit_rescue/',
}

// Sponsor tiers — the same values and labels the OHRR app's `sponsors` table uses.
export const SPONSOR_TIERS: readonly SponsorTier[] = ['presenting', 'program', 'community', 'friend']
export const TIER_LABEL: Record<SponsorTier, string> = {
  presenting: 'Presenting Partner',
  program: 'Program Sponsor',
  community: 'Community Supporter',
  friend: 'Friend of OHRR',
}
