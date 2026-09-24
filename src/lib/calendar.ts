// "Add to calendar" for an event (BunFest's "Mark your calendars!"): an .ics
// file — Apple Calendar, Outlook, and most phones open it straight into the
// calendar — and a Google Calendar link. Built from the shared `events` row,
// so the date is always the one staff set.
import type { EventItem } from './types'

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

function parts(e: EventItem, pageUrl: string) {
  // An event with no end time gets two hours, so it still shows as a block.
  const end = e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 2 * 3_600_000).toISOString()
  const location = [e.venue, e.address].filter(Boolean).join(', ')
  const details = [e.summary, pageUrl].filter(Boolean).join('\n\n')
  return { start: e.startsAt, end, location, details }
}

export function downloadEventIcs(e: EventItem, pageUrl: string) {
  const p = parts(e, pageUrl)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ohio House Rabbit Rescue//OHRR website//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@ohrr`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(p.start)}`,
    `DTEND:${stamp(p.end)}`,
    `SUMMARY:${esc(e.title)}`,
    p.location ? `LOCATION:${esc(p.location)}` : '',
    `DESCRIPTION:${esc(p.details)}`,
    `URL:${pageUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.slug || 'ohrr-event'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function googleEventUrl(e: EventItem, pageUrl: string): string {
  const p = parts(e, pageUrl)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(p.start)}/${stamp(p.end)}`,
    details: p.details,
    location: p.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
