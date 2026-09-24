// OHRR's own photos, taken from the pages of the current site (ohiohouserabbitrescue.org,
// captured 2026-09-24) and bundled under public/img/ohrr/ — never hotlinked. Each was
// resized, turned upright and saved without its EXIF data (no GPS, no camera details).
// Captions say only what the live page says next to the photo; alt text says what is in it.
// UP/… in the comments = https://ohiohouserabbitrescue.org/wp-content/uploads/…
import type { Photo } from '../components/PhotoStrip'

/** Volunteer page (support-ohrr/volunteer). */
export const VOLUNTEER_PHOTOS: Photo[] = [
  {
    // UP/2018/07/volunteer3.jpg
    src: '/img/ohrr/volunteer-baby-rabbit.jpg',
    w: 675,
    h: 900,
    alt: 'Two hands cradling a tiny tan baby rabbit',
  },
  {
    // UP/2013/05/10250065_739426112744136_3341062526374216983_n.jpg
    src: '/img/ohrr/volunteer-greens-tray.jpg',
    w: 480,
    h: 640,
    alt: 'A smiling volunteer carrying a tray of bowls filled with fresh greens',
  },
  {
    // UP/2018/07/volunteer7.jpg (sky and gravel trimmed)
    src: '/img/ohrr/volunteers-with-carriers.jpg',
    w: 603,
    h: 587,
    alt: 'Five volunteers outdoors beside a car, with rabbits in pet carriers at their feet',
  },
]

/** Hop Shop page (i-want-to-support/hop-shop). */
export const HOP_SHOP_PHOTOS: Photo[] = [
  {
    // UP/2018/06/20180609_094439.jpg
    src: '/img/ohrr/hop-shop-shelves.jpg',
    w: 900,
    h: 675,
    alt: 'Hop Shop shelves stocked with bags of hay and pellets, boxes of supplies and a case of jewelry',
  },
  {
    // UP/2018/06/20180609_094418.jpg
    src: '/img/ohrr/hop-shop-room.jpg',
    w: 900,
    h: 675,
    alt: 'The Hop Shop room, with wire shelves of rabbit supplies and stacks of hay boxes',
  },
]

/** Volunteer Family page (about-us/volunteer-family): each photo sits under that person's bio. */
export const FAMILY_PHOTOS: Photo[] = [
  {
    // UP/2018/08/BevMay.png (square crop)
    src: '/img/ohrr/family-beverly-may.jpg',
    w: 600,
    h: 600,
    alt: 'Beverly May sitting on the Adoption Center floor beside a grey lop rabbit',
    caption: 'Beverly May',
  },
  {
    // UP/2018/08/Tracy.jpeg (square crop)
    src: '/img/ohrr/family-tracy-wiczer.jpg',
    w: 600,
    h: 600,
    alt: 'Tracy Wiczer holding a small black rabbit',
    caption: 'Tracy Wiczer',
  },
  {
    // UP/2019/02/IMG_0806.jpg (square crop)
    src: '/img/ohrr/family-adrienne-lang.jpg',
    w: 600,
    h: 600,
    alt: 'Adrienne Lang, wearing a Midwest BunFest lanyard, holding a white lop rabbit',
    caption: 'Adrienne Lang',
  },
  {
    // UP/2018/08/10153881_739426732744074_5196346702543490710_n.jpg (square crop)
    src: '/img/ohrr/family-nancy-betz.jpg',
    w: 480,
    h: 480,
    alt: 'Nancy Betz, in an Ohio House Rabbit Rescue shirt, holding a black-and-white rabbit',
    caption: 'Nancy Betz',
  },
]

/** "Give to the OHRR Veterinary Care Fund – Lola’s Tale". */
export const LOLA_PHOTO: Photo = {
  // UP/2018/12/Lola1.jpg
  src: '/img/ohrr/lola-vet-care-fund.jpg',
  w: 1200,
  h: 806,
  alt: 'Lola, a fluffy white and grey rabbit, sitting on a rug',
}

/** Tips for Catching a Stray (i-want-to-learn/tips-for-catching-a-stray), in the article's order. */
export const WILD_COTTONTAIL_PHOTO: Photo = {
  // UP/2018/07/catchingstrays1.jpg — the article: "If the rabbit does not look like the
  // picture below, then it is a domestic rabbit."
  src: '/img/ohrr/stray-wild-cottontail.jpg',
  w: 640,
  h: 437,
  alt: 'A wild cottontail rabbit with brown, speckled fur, sitting in grass',
  caption: 'A wild cottontail. If the rabbit you’ve found doesn’t look like this, it is a domestic rabbit.',
}

export const CATCHING_PHOTOS: Photo[] = [
  {
    // UP/2018/07/catchingstrays2.jpg — follows "leave some water and food in the area where you saw the rabbit"
    src: '/img/ohrr/stray-food-and-water.jpg',
    w: 720,
    h: 540,
    alt: 'A lop-eared domestic rabbit outdoors by a fence, eating greens and baby carrots',
    caption: 'Leave water and food where you saw the rabbit.',
  },
  {
    // UP/2018/07/catchingstrays3-e1532440042851.jpg — follows "Exercise pens … are what our volunteers use"
    src: '/img/ohrr/stray-exercise-pen.jpg',
    w: 468,
    h: 600,
    alt: 'A black rabbit inside a wire exercise pen set up on a lawn',
    caption: 'Exercise pens are what OHRR volunteers use.',
  },
  {
    // UP/2018/07/catchingstrays4.jpg — follows "checked at least twice daily (morning and evening)"
    src: '/img/ohrr/stray-live-trap.jpg',
    w: 720,
    h: 540,
    alt: 'A black-and-white rabbit inside a wire live trap',
    caption: 'A live trap must be checked at least twice a day.',
  },
]

/** The "Adoption Process for OHRR" post on the current home page. */
export const ADOPTION_PHOTO: Photo = {
  // UP/2019/07/67271936_351457192440426_3923044796276408320_n.jpg
  src: '/img/ohrr/adoption-rescued-favorite-breed.jpg',
  w: 1200,
  h: 900,
  alt: 'A black-and-white rabbit resting on a sign that reads “Rescued is my favorite breed”',
}
