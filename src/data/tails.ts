// Happy Tails, bundled: the status pill colours and the one EXAMPLE story the
// site shows — labelled "Example" — until OHRR publishes the first real one;
// then the live list replaces it automatically. The same example the app shows
// (ohrr-app/src/data/tails.ts), with OHRR's own photo.
import type { Tail, TailStatus } from '../lib/tails'
import { ADOPTION_PHOTO } from './ohrrPhotos'

// Status pill colours (the app's TAIL_STATUS.cls); the labels live in lib/tails.ts.
export const TAIL_STATUS_CLASS: Record<TailStatus, string> = {
  looking: 'bg-brand-blue-50 text-brand-blue',
  'just-adopted': 'bg-brand-orange-50 text-brand-orange-dark',
  'settling-in': 'bg-amber-100 text-amber-800',
  'going-strong': 'bg-emerald-100 text-emerald-800',
  'forever-loved': 'bg-violet-100 text-violet-800',
}

// Shown with the example on the list and the story page.
export const EXAMPLE_TAIL_NOTE =
  'This is an example of a Happy Tails story. When adopters share theirs, they’ll appear here instead.'
export const EXAMPLE_TAIL_PHOTO_NOTE =
  'The photo is one of OHRR’s own. Dottie and her story are made up, to show what a Happy Tail looks like.'

// The one example story, shaped exactly like a published row (a one-line
// summary for the card, the story as a single entry) so visitors and staff see
// what a real Happy Tail will look like. It shows only while OHRR has no
// published stories and disappears by itself with the first real one — it is
// not a database row, so there is nothing to clean up. The name is made up (no
// OHRR rabbit in the database is called Dottie); the photo is OHRR's own
// (ADOPTION_PHOTO, from the "Adoption Process for OHRR" post), not any adoptable
// rabbit's listing photo.
const EXAMPLE_SINCE = 'Adopted spring 2025'

export const exampleTail: Tail = {
  id: 'example',
  bunny: 'Dottie',
  status: 'going-strong',
  photo: ADOPTION_PHOTO.src,
  since: EXAMPLE_SINCE,
  summary: 'Shy for her first weeks home, Dottie now has the run of the living room. Patience made all the difference.',
  example: true,
  timeline: [
    {
      date: EXAMPLE_SINCE,
      status: 'going-strong',
      text: [
        'Dottie’s family found her on OHRR’s list of adoptable rabbits and sent in an application that night. At their weekend appointment at the Adoption Center, they saw how OHRR houses and feeds its rabbits, then sat on the floor to meet her. She hopped over, sniffed a shoelace and stayed. That afternoon she went home with them.',
        'The first weeks were quiet. Dottie spent most of her time in her hidey house and only came out when the room was still. Her family sat on the floor each evening with a few leaves of romaine and let her come to them. By the third week she was taking greens from their hands, and one night she flopped over on her side for the first time.',
        'A year later, Dottie has the run of the living room. She naps in the afternoon sun, thumps if dinner is late, and does a binky every time the salad bowl comes out. The best advice her family got at the Adoption Center: be patient, and let her set the pace.',
      ].join('\n\n'),
    },
  ],
}
