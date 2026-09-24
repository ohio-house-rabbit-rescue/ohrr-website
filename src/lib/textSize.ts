// Text size, chosen once and kept in this browser — the same three steps the
// app offers under Settings → Text size.
//
// Everything on the site is sized in rem, so moving the root font size moves
// the type, the spacing and the buttons together; nothing needs a separate
// large-text layout. The choice lives in localStorage only (a convenience for
// this browser), so it never reaches the database.
import { useSyncExternalStore } from 'react'

export type TextSize = 'normal' | 'large' | 'xlarge'

export const TEXT_SIZES: { value: TextSize; label: string; scale: number }[] = [
  { value: 'normal', label: 'Normal', scale: 1 },
  { value: 'large', label: 'Large', scale: 1.125 },
  { value: 'xlarge', label: 'Extra large', scale: 1.25 },
]

const KEY = 'ohrr:text-size:v1'
const listeners = new Set<() => void>()

function read(): TextSize {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === 'large' || raw === 'xlarge' ? raw : 'normal'
  } catch {
    return 'normal'
  }
}

let size: TextSize = read()

export function scaleOf(s: TextSize): number {
  return TEXT_SIZES.find((t) => t.value === s)?.scale ?? 1
}

/** Put the choice on <html>, which every rem on the site is measured against. */
export function applyTextSize(s: TextSize = size) {
  if (typeof document === 'undefined') return
  const scale = scaleOf(s)
  document.documentElement.style.fontSize = scale === 1 ? '' : `${scale * 100}%`
  document.documentElement.dataset.textSize = s
}

export function setTextSize(s: TextSize) {
  size = s
  try {
    localStorage.setItem(KEY, s)
  } catch {
    /* private window — the choice just won't survive closing it */
  }
  applyTextSize(s)
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
const getSnapshot = () => size

export function useTextSize(): TextSize {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** One step bigger / smaller, stopping at the ends. */
export function stepTextSize(dir: 1 | -1) {
  const i = TEXT_SIZES.findIndex((t) => t.value === size)
  const next = TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, i + dir))]
  setTextSize(next.value)
}
