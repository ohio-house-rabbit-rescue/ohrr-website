// Staff → Features: the on/off switches for parts of the app, the website and
// the BunFest site. Founders and Developers only — after update 38 the
// database refuses anyone else. Desktop mirror of the app's StaffFeatures: the
// same `app_settings` rows, so a switch flipped here is flipped in the app at
// once. The list itself is APP_FEATURES in lib/settings (a copy of the app's).
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, Spinner, canSwitchFeatures } from '../../lib/staff'
import { Card } from '../../components/ui'
import { Icon } from '../../components/icons'
import { APP_FEATURES, FEATURE_GROUPS, RAFFLE_TICKETS_FLAG, fetchSettings, setSetting, switchValue, type Json } from '../../lib/settings'

function Switch({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      // 56 × 32 px track inside a 48 px tall tap area
      className="inline-flex min-h-12 min-w-14 shrink-0 items-center justify-center disabled:opacity-50"
    >
      <span className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${on ? 'bg-brand-blue' : 'bg-slate-300'}`}>
        <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-7' : 'translate-x-1'}`} />
      </span>
    </button>
  )
}

/** The database's refusal, in plain words (update 38: Founders and Developers only). */
function saveError(e: unknown): string {
  const m = errMessage(e)
  if (/row-level security|violates row|permission denied|not allowed/i.test(m)) {
    return `The database didn’t save that: only a Founder or Developer can switch features on and off. (${m})`
  }
  return `The switch didn’t save: ${m}`
}

export default function Features() {
  const { user, membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const allowed = canSwitchFeatures(membership)

  const [values, setValues] = useState<Record<string, Json>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    try {
      setValues(await fetchSettings(orgId))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [orgId, allowed])
  useEffect(() => {
    void load()
  }, [load])

  const toggle = async (key: string, enabled: boolean) => {
    setBusyKey(key)
    setError(null)
    try {
      await setSetting(key, { enabled }, { orgId, userId: user?.id })
      setValues((v) => ({ ...v, [key]: { enabled } }))
    } catch (e) {
      setError(saveError(e))
    } finally {
      setBusyKey(null)
    }
  }

  if (!allowed) {
    return (
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Features</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-700">Only a Founder or Developer can switch features on and off.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Features</h1>
        <p className="mt-1 max-w-2xl text-base text-slate-700">
          Switch parts of OHRR on and off for everyone. A switched-off feature disappears for visitors on the app, the website and the
          BunFest site, while signed-in staff still see it, marked “Hidden from the public”, so it can be got ready and checked first. A
          change takes effect the next time someone opens the page — no new version needed.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Only Founders and Developers see this page.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <Spinner label="Loading features…" />
      ) : (
        FEATURE_GROUPS.map((group) => {
          const items = APP_FEATURES.filter((f) => f.group === group)
          if (items.length === 0) return null
          return (
            <section key={group} className="space-y-2.5">
              <p className="px-1 text-sm font-extrabold uppercase tracking-wider text-slate-600">{group}</p>
              <Card>
                <ul className="divide-y divide-slate-100">
                  {items.map((f) => {
                    const on = switchValue(values[f.key], Boolean(f.defaultOn))
                    return (
                      <li key={f.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 font-display text-lg font-extrabold text-ink">
                            {f.label}
                            <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${on ? 'bg-brand-orange-50 text-brand-orange-dark' : 'bg-slate-100 text-slate-600'}`}>
                              {on ? 'On' : 'Off'}
                            </span>
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.description}</p>
                          {f.key === RAFFLE_TICKETS_FLAG && can('events.bunfest.manage') && (
                            <p className="mt-1.5 text-sm text-slate-600">
                              Set the ticket price in{' '}
                              <Link to="/staff/auction" className="font-bold text-brand-blue">
                                Silent Auction → Auction setup
                              </Link>
                              .
                            </p>
                          )}
                        </div>
                        <Switch on={on} disabled={busyKey === f.key} label={f.label} onChange={(next) => void toggle(f.key, next)} />
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </section>
          )
        })
      )}

      <Card className="border-slate-200 bg-slate-50/80">
        <p className="text-sm text-slate-600">
          Looking for OHRR’s hours, email or address?{' '}
          <Link to="/staff/details" className="inline-flex min-h-11 items-center gap-1 font-bold text-brand-blue">
            OHRR details <Icon name="chevron" size={14} />
          </Link>
        </p>
      </Card>
    </div>
  )
}
