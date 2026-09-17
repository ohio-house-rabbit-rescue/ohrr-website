import type { EventItem } from './types'

const TZ = 'America/New_York'

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: TZ,
  })
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ })
}

export function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
    .replace(':00', '')
}

// "10 AM – 4 PM" (or just the start time when there is no end).
export function formatTimeRange(e: EventItem): string {
  const start = formatTime(e.startsAt)
  return e.endsAt ? `${start} – ${formatTime(e.endsAt)}` : start
}

export function isUpcoming(e: EventItem, now = Date.now()): boolean {
  return new Date(e.endsAt ?? e.startsAt).getTime() >= now
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
