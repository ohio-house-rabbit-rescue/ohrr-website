// "This week at OHRR" — the reasons to come back: the doors this week (with
// any notice), the next event, the help OHRR needs right now, and the newest
// adoption story. Every card reads live records staff already keep; nothing
// here is typed in twice.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../lib/data'
import { useOrgProfile } from '../lib/orgProfile'
import { listOpenCalls, type OpenCall } from '../lib/volunteers/callsApi'
import { fmtDay, fmtClock } from '../lib/volunteers/calls'
import { isSupabaseConfigured } from '../lib/supabase'
import { formatDate, formatTimeRange, isUpcoming } from '../lib/format'
import { MAILING_LIST, OHRR } from '../lib/constants'
import { Icon, type IconName } from './icons'
import { LatestTail } from './LatestTail'

function daysUntil(iso: string): number {
  const day = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
  return day(new Date(iso)) - day(new Date())
}

function Tile({ icon, kicker, children }: { icon: IconName; kicker: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue">
        <Icon name={icon} size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">{kicker}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}

const link = 'font-bold text-brand-blue hover:text-brand-blue-dark'

function Doors() {
  const org = useOrgProfile()
  return (
    <Tile icon="home" kicker="The doors this week">
      {org.notice && (
        <p className="mb-1 rounded-lg bg-brand-orange-50 px-3 py-1.5 text-base font-bold text-brand-orange-dark">{org.notice}</p>
      )}
      <p className="text-base text-ink">{org.hours}</p>
      <p className="mt-1 text-sm text-slate-700">{OHRR.address}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/hop-shop" className={link}>
          The Hop Shop
        </Link>
        <Link to="/book/adoption-visit" className={link}>
          Book an adoption visit
        </Link>
      </p>
    </Tile>
  )
}

function NextEvent() {
  const { events } = useEvents()
  const next = (events ?? []).filter((e) => isUpcoming(e)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  if (!next) return null
  const d = daysUntil(next.startsAt)
  const bunfest = /bunfest/i.test(next.slug) || /bunfest/i.test(next.title)
  return (
    <Tile icon="calendar" kicker={d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`}>
      <p className="font-display text-lg font-extrabold text-ink">{next.title}</p>
      <p className="text-base text-slate-700">
        {formatDate(next.startsAt)} · {formatTimeRange(next)}
        {next.venue ? ` · ${next.venue}` : ''}
      </p>
      <p className="mt-2 text-sm">
        <Link to={bunfest ? '/bunfest' : '/events'} className={link}>
          {bunfest ? 'Plan your BunFest day' : 'All events'}
        </Link>
      </p>
    </Tile>
  )
}

function HelpNeeded() {
  const [calls, setCalls] = useState<OpenCall[]>([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    listOpenCalls()
      .then((c) => setCalls(c.filter((x) => x.places - x.taken > 0).slice(0, 2)))
      .catch(() => setCalls([]))
  }, [])
  if (calls.length === 0) return null
  return (
    <Tile icon="users" kicker="Help needed now">
      <ul className="space-y-2">
        {calls.map((c) => (
          <li key={c.slug}>
            <Link to={`/volunteer/call/${c.slug}`} className="font-display text-lg font-extrabold text-brand-blue hover:text-brand-blue-dark">
              {c.title}
            </Link>
            <p className="text-sm text-slate-700">
              {fmtDay(c.on_date)} · {fmtClock(c.starts_at)}–{fmtClock(c.ends_at)} · {Math.max(0, c.places - c.taken)}{' '}
              {c.places - c.taken === 1 ? 'place' : 'places'} left
            </p>
          </li>
        ))}
      </ul>
    </Tile>
  )
}

export default function ThisWeek() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">This week at OHRR</h2>
          <Link to={MAILING_LIST} className="text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
            Get this by email →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Doors />
          <NextEvent />
          <HelpNeeded />
          <LatestTail />
        </div>
      </div>
    </section>
  )
}
