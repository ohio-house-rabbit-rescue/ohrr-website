import { useLocation } from 'react-router-dom'

// The page art (OHRR, 2026-09-28): a faint line drawing at the right of each
// page's title band — one item for each kind of page, in the same line weight
// as the logo's bunny (which the app shows on its Home band; here only About
// has it, since Home already has the rabbits' photos). The drawings are
// public/art/*.svg, the same files as the app's (ohrr-app/src/components/
// PageArt.tsx). Each is a small SVG used as a CSS mask, so it takes the band's
// colour (soft blue here, white in the app) and costs one ~0.3 KB file per
// page. Decorative: hidden from screen readers, and never makes a band taller.

export type ArtName =
  | 'bunny'
  | 'adopt'
  | 'care'
  | 'give'
  | 'events'
  | 'shop'
  | 'contact'
  | 'volunteer'
  | 'found'
  | 'vets'
  | 'tails'

// First match wins; pages outside these sections keep a plain band.
const SECTIONS: [RegExp, ArtName][] = [
  [/^\/about/, 'bunny'],
  [/^\/(adopt|thinking-about-a-rabbit)/, 'adopt'],
  [/^\/tails/, 'tails'],
  [/^\/volunteer/, 'volunteer'],
  [/^\/(give|support|impact|info\/legacy-fund)/, 'give'],
  [/^\/(learn\/vets|mobile-vet)/, 'vets'],
  [/^\/(learn|help|info)/, 'care'],
  [/^\/(events|bunfest|news)/, 'events'],
  [/^\/hop-shop/, 'shop'],
  [/^\/(contact|mailing-list|emails)/, 'contact'],
  [/^\/(found|surrender|rescues)/, 'found'],
]

export function artForPath(pathname: string): ArtName | null {
  return SECTIONS.find(([re]) => re.test(pathname))?.[1] ?? null
}

/** The art for the page being shown (null: none). */
export function usePageArt(): ArtName | null {
  return artForPath(useLocation().pathname)
}

/** Position it with `className` (absolute; the colour is `currentColor`). */
export function PageArt({ name, className = '' }: { name: ArtName; className?: string }) {
  const url = `url(/art/${name}.svg)`
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bg-current ${className}`}
      style={{
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'right center',
        maskPosition: 'right center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}
