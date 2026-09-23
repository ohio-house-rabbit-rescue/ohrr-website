// Staff → Volunteer calls (website mirror of the app's StaffCalls.tsx): every
// need OHRR has put out, soonest first, with how full each one is — and the
// button to put out a new one.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStaff, Spinner } from '../../lib/staff'
import { errMessage } from '../../lib/supabase'
import { Card, btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { fmtClock, fmtDay } from '../../lib/volunteers/calls'
import { callRoster, listCalls, type CallRow } from '../../lib/volunteers/callsApi'
import VolunteerCallDetail from './VolunteerCallDetail'
import { Badge, FormError } from './callBits'

/** A fresh page per call, so moving from "new" to the saved call starts clean. */
export function VolunteerCallRoute() {
  const { id = '' } = useParams()
  return <VolunteerCallDetail key={id} />
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

export default function VolunteerCalls() {
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<CallRow[] | null>(null)
  const [fill, setFill] = useState<Record<string, { taken: number; places: number }>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    let active = true
    listCalls(orgId)
      .then(async (list) => {
        if (!active) return
        setRows(list)
        // How full the upcoming ones are.
        const upcoming = list.filter((c) => c.on_date >= today()).slice(0, 12)
        const entries = await Promise.all(
          upcoming.map(async (c) => {
            const ro = await callRoster(c.id).catch(() => [])
            const slots = new Map<string, number>()
            let taken = 0
            for (const r of ro) {
              slots.set(r.slot_id, r.capacity)
              if (r.booking_id && r.status !== 'cancelled') taken += 1
            }
            return [c.id, { taken, places: [...slots.values()].reduce((a, b) => a + b, 0) }] as const
          }),
        )
        if (active) setFill(Object.fromEntries(entries))
      })
      .catch((e) => setError(errMessage(e)))
    return () => {
      active = false
    }
  }, [orgId])

  const upcoming = (rows ?? []).filter((c) => c.on_date >= today()).sort((a, b) => a.on_date.localeCompare(b.on_date))
  const past = (rows ?? []).filter((c) => c.on_date < today())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-black text-ink">Volunteer calls</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Put out a need once — “5 people for 2-hour shifts at BunFest” — and it makes the shifts, writes the posts, texts, emails, letters and flyers, takes the sign-ups, and helps you thank
            everyone afterwards.
          </p>
        </div>
        <Link to="/staff/calls/new" className={btn.orange}>
          <Icon name="plus" size={16} className="mr-1.5" /> Put out a new call
        </Link>
      </div>

      <FormError>{error}</FormError>
      {rows === null && !error && <Spinner />}
      {rows && rows.length === 0 && <Card className="text-center text-sm leading-relaxed text-slate-600">No calls yet. Start with BunFest — the form can fill itself in from it.</Card>}

      {upcoming.length > 0 && <CallList title="Coming up" rows={upcoming} fill={fill} />}
      {past.length > 0 && <CallList title="Done" rows={past} fill={fill} past />}
    </div>
  )
}

function CallList({ title, rows, fill, past }: { title: string; rows: CallRow[]; fill: Record<string, { taken: number; places: number }>; past?: boolean }) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((c) => {
          const f = fill[c.id]
          return (
            <Link key={c.id} to={`/staff/calls/${c.id}`} className="block">
              <Card className="flex h-full items-center gap-3 transition hover:border-slate-300 hover:shadow-md">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-extrabold text-ink">{c.title}</span>
                  <span className="block text-sm text-slate-600">
                    {fmtDay(c.on_date)} · {fmtClock(c.starts_at)}–{fmtClock(c.ends_at)}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {f && !past && (
                      <Badge tone={f.taken >= f.places ? 'blue' : 'orange'}>
                        {f.taken} of {f.places} places filled
                      </Badge>
                    )}
                    {past && <Badge tone="slate">Thank everyone →</Badge>}
                    {!c.is_published && <Badge tone="slate">Hidden</Badge>}
                  </span>
                </span>
                <Icon name="chevron" size={18} className="shrink-0 text-slate-300" />
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
