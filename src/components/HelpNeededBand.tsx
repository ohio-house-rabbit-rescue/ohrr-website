// Home: "Volunteers needed". Shown only while a volunteer call is open with places left, so it is
// always true. It goes straight to the soonest call; the Volunteer page lists the rest.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { listOpenCalls, type OpenCall } from '../lib/volunteers/callsApi'
import { fmtClock, fmtDay } from '../lib/volunteers/calls'

export default function HelpNeededBand() {
  const [calls, setCalls] = useState<OpenCall[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let live = true
    listOpenCalls()
      .then((c) => live && setCalls(c.filter((x) => x.places - x.taken > 0)))
      .catch(() => live && setCalls([]))
    return () => {
      live = false
    }
  }, [])

  const first = calls[0]
  if (!first) return null
  const left = first.places - first.taken
  const more = calls.length - 1

  return (
    <section className="border-b border-brand-orange/30 bg-brand-orange-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold uppercase tracking-wider text-brand-orange-ink">Volunteers needed</p>
          <p className="mt-0.5 font-display text-xl font-extrabold leading-snug text-ink">{first.title}</p>
          <p className="text-base text-slate-700">
            {fmtDay(first.on_date)} · {fmtClock(first.starts_at)}–{fmtClock(first.ends_at)} ·{' '}
            <strong className="text-brand-orange-ink">
              {left} {left === 1 ? 'place' : 'places'} left
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to={`/volunteer/call/${first.slug}`} className="inline-flex min-h-[44px] items-center rounded-full bg-brand-orange px-5 font-bold text-ink hover:bg-brand-orange-dark">
            Sign up to help
          </Link>
          <Link to="/volunteer" className="inline-flex min-h-[44px] items-center font-bold text-brand-blue underline-offset-4 hover:underline">
            {more > 0 ? `${more} more ${more === 1 ? 'way' : 'ways'} to help` : 'All the ways to volunteer'}
          </Link>
        </div>
      </div>
    </section>
  )
}
