// One button that puts an event in the visitor's own calendar, with Google
// Calendar as the second choice. See lib/calendar.ts.
import { btn, ext } from './ui'
import { Icon } from './icons'
import { downloadEventIcs, googleEventUrl } from '../lib/calendar'
import type { EventItem } from '../lib/types'

export default function AddToCalendar({ e, className = '' }: { e: EventItem; className?: string }) {
  const page = typeof window === 'undefined' ? '' : window.location.origin + window.location.pathname
  return (
    <div className={`no-print flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      <button type="button" onClick={() => downloadEventIcs(e, page)} className={btn.blue}>
        <Icon name="calendar" size={18} /> Add to calendar
      </button>
      <a href={googleEventUrl(e, page)} {...ext} className="text-base font-semibold text-brand-blue">
        or Google Calendar
      </a>
    </div>
  )
}
