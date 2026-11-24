// Where "Back" goes when a screen was opened from another one (?back=…), so a person lands where they
// came from and not on a list they never saw (staff audit 2026-11-24). The app has the same file
// (src/features/scan/backTo.ts) with the app's addresses — keep the two alike.
//
// Only short codes and ids travel in the address (a box number, a drop-off id), never a name or an email.
import { isBoxCode } from './codes'

export interface BackTo {
  to: string
  /** The short word on a Back button. */
  label: string
  /** The full words for a button or link in the page. */
  long: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function backTarget(back: string | null | undefined): BackTo | null {
  if (!back) return null
  switch (back) {
    case 'items':
      return { to: '/staff/items', label: 'Items', long: 'Back to the list' }
    case 'sheet':
      return { to: '/staff/items/sheet', label: 'Spreadsheet', long: 'Back to the spreadsheet' }
    case 'report':
      return { to: '/staff/donations/report', label: 'Report', long: 'Back to the donation report' }
    case 'receive':
      return { to: '/staff/items?add=1', label: 'Receive', long: 'Back to receiving' }
    case 'receive-boxes':
      return { to: '/staff/items?add=1&box=1', label: 'Boxes', long: 'Back to filling boxes' }
  }
  const cut = back.indexOf(':')
  const what = cut < 0 ? '' : back.slice(0, cut)
  const id = cut < 0 ? '' : back.slice(cut + 1)
  if (what === 'box' && isBoxCode(id.toUpperCase())) return { to: `/staff/boxes/${id.toUpperCase()}`, label: 'Box', long: 'Back to the box' }
  if (what === 'dropoff' && UUID.test(id)) return { to: `/staff/dropoffs/${id}`, label: 'Drop-off', long: 'Back to the drop-off' }
  return null
}

/** The `back` value as it was given, or null when it isn't one of ours. */
export const cleanBack = (back: string | null | undefined): string | null => (backTarget(back) ? (back as string) : null)

/** `&back=…` for an address that already has a query, or '' when there is nothing to carry. */
export const backParam = (back: string | null | undefined): string => {
  const b = cleanBack(back)
  return b ? `&back=${encodeURIComponent(b)}` : ''
}
