// Sample Happy Tails — shown, clearly labelled as samples (LiveNote), until
// OHRR publishes the first real story; then the live list replaces them
// automatically. The same six samples the app shows (ohrr-app/src/data/tails.ts),
// with the site's freely-licensed sample rabbit photos.
import type { Tail, TailStatus } from '../lib/tails'

// Status pill colours (the app's TAIL_STATUS.cls); the labels live in lib/tails.ts.
export const TAIL_STATUS_CLASS: Record<TailStatus, string> = {
  looking: 'bg-brand-blue-50 text-brand-blue',
  'just-adopted': 'bg-brand-orange-50 text-brand-orange-dark',
  'settling-in': 'bg-amber-100 text-amber-800',
  'going-strong': 'bg-emerald-100 text-emerald-800',
  'forever-loved': 'bg-violet-100 text-violet-800',
}

export const sampleTails: Tail[] = [
  {
    id: 'mochi',
    bunny: 'Mochi',
    family: 'Patel',
    status: 'going-strong',
    photo: '/img/bunny-lop-caramel.jpg',
    since: 'Adopted Mar 2025',
    summary: 'A year of zoomies, free-range living, and an unlikely friendship with the family cat.',
    timeline: [
      { date: 'Mar 2025', status: 'just-adopted', text: 'Mochi went home with the Patel family.' },
      { date: 'Apr 2025', status: 'settling-in', text: 'Mastered the apartment in a week — and promptly claimed the couch as his own.' },
      { date: 'Sep 2025', text: 'Learned to throw a full binky the moment the salad bowl appears.' },
      { date: 'Mar 2026', status: 'going-strong', text: 'One year in: bonded with the family cat and now runs the whole household.' },
    ],
  },
  {
    id: 'pepper-clove',
    bunny: 'Pepper & Clove',
    family: 'Nguyen',
    status: 'going-strong',
    bonded: true,
    photo: '/img/bunny-lionhead-white.jpg',
    since: 'Adopted Oct 2025',
    summary: 'A bonded pair of brothers — six months of synchronized binkies and shared hay piles.',
    timeline: [
      { date: 'Oct 2025', status: 'just-adopted', text: 'The brothers went home together, exactly as a bonded pair should.' },
      { date: 'Nov 2025', status: 'settling-in', text: 'Picked their favorite window for synchronized morning sunbathing.' },
      { date: 'Apr 2026', status: 'going-strong', text: 'Six months strong and as inseparable as the day they arrived.' },
    ],
  },
  {
    id: 'biscuit',
    bunny: 'Biscuit',
    family: 'Garcia',
    status: 'just-adopted',
    photo: '/img/bunny-grey-lop.jpg',
    since: 'Adopted Jun 2026',
    summary: 'Just found his forever home this month — and his forever person.',
    timeline: [{ date: 'Jun 2026', status: 'just-adopted', text: 'Biscuit met the Garcias, and it was love at first nose-boop.' }],
  },
  {
    id: 'daisy',
    bunny: 'Daisy',
    family: 'Cooper',
    status: 'settling-in',
    photo: '/img/bunny-spotted.jpg',
    since: 'Adopted May 2026',
    summary: 'Two weeks in and starting to trust — the very first flop happened this week.',
    timeline: [
      { date: 'May 2026', status: 'just-adopted', text: 'Daisy went home with the Coopers.' },
      { date: 'Jun 2026', status: 'settling-in', text: 'First flop on the kitchen floor — a huge milestone for a once-shy girl.' },
    ],
  },
  {
    id: 'thumper',
    bunny: 'Thumper',
    status: 'looking',
    photo: '/img/bunny-grey-dwarf.jpg',
    summary: 'Still searching for his someone. Could it be you?',
    timeline: [{ date: 'Jun 2026', status: 'looking', text: 'Thumper is at the Adoption Center, ready to meet his match.' }],
  },
  {
    id: 'cinnamon',
    bunny: 'Cinnamon',
    family: 'Reilly',
    status: 'forever-loved',
    photo: '/img/bunny-silver.jpg',
    since: 'Adopted 2013',
    summary: 'Twelve wonderful years as the heart of the Reilly home. Forever loved.',
    timeline: [
      { date: '2013', status: 'just-adopted', text: 'A shy little rescue who slowly blossomed into a beloved companion.' },
      { date: '2013–2025', status: 'going-strong', text: 'Twelve years of head-pats, banana treats, and gentle company.' },
      { date: '2025', status: 'forever-loved', text: 'Crossed the rainbow bridge, deeply missed and forever loved.' },
    ],
  },
]
