// Staff → Activity: the audit log — who did what, and when. Desktop mirror of
// the app's StaffActivity (gated on audit.view; the same `audit_log` table).
import { useCallback, useEffect, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, Spinner } from '../../lib/staff'
import { Card } from '../../components/ui'
import type { Json } from '../../lib/settings'

interface Entry {
  id: string
  org_id: string | null
  actor_user_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  detail: Json | null
  created_at: string
}

// Human-readable verb for each recorded action.
const ACTION_LABELS: Record<string, string> = {
  redeem_master_code: 'became an Owner',
  create_invite_code: 'created an invite code',
  redeem_invite_code: 'joined the team',
  grant_permission: 'granted a capability',
  revoke_permission: 'revoked a capability',
  set_membership_status: 'changed a member’s status',
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ')
}

// A short, friendly summary of the detail payload, when there's something useful.
function detailSummary(e: Entry): string | null {
  const d = (e.detail ?? null) as Record<string, unknown> | null
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null
  if (typeof d.key === 'string') return d.key
  if (typeof d.status === 'string') return d.status
  if (typeof d.preset === 'string') return `preset: ${d.preset}`
  if (Array.isArray(d.capabilities) && d.capabilities.length) return d.capabilities.join(', ')
  return null
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function Activity() {
  const { membership, can, user } = useStaff()
  const orgId = membership?.orgId ?? ''
  const allowed = can('audit.view')

  const [entries, setEntries] = useState<Entry[]>([])
  const [emails, setEmails] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const [logRes, memRes] = await Promise.all([
      supabase.from('audit_log').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100),
      supabase.rpc('list_org_members', { p_org: orgId }),
    ])
    if (logRes.error) {
      setError(errMessage(logRes.error))
      setLoading(false)
      return
    }
    const map = new Map<string, string>()
    if (!memRes.error && memRes.data) {
      for (const m of memRes.data as { user_id: string; email: string | null }[]) if (m.email) map.set(m.user_id, m.email)
    }
    setEmails(map)
    setEntries((logRes.data ?? []) as Entry[])
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    void load()
  }, [load])

  const actorName = (id: string | null) => {
    if (!id) return 'System'
    if (id === user?.id) return 'You'
    return emails.get(id) ?? `Member ${id.slice(0, 6)}`
  }

  if (!allowed) {
    return (
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Activity</h1>
        <p className="mt-3 text-sm text-slate-600">You don’t have access to the activity log. An owner or admin can grant the “View the activity log” capability.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Activity</h1>
        <p className="mt-1 text-sm text-slate-600">A record of staff and permission changes — who did what, and when. The latest 100 entries.</p>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner label="Loading activity…" />
      ) : entries.length === 0 ? (
        <Card className="border-slate-200 bg-slate-50/80 text-center">
          <p className="text-sm leading-relaxed text-slate-600">No activity recorded yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const detail = detailSummary(e)
            return (
              <Card key={e.id} className="flex flex-wrap items-start justify-between gap-3 !py-3">
                <div className="min-w-0">
                  <p className="text-base text-ink">
                    <span className="font-bold">{actorName(e.actor_user_id)}</span> {actionLabel(e.action)}
                  </p>
                  {detail && (
                    <p className="mt-1">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-600">{detail}</span>
                    </p>
                  )}
                </div>
                <span className="shrink-0 whitespace-nowrap text-sm text-slate-600">{fmtTime(e.created_at)}</span>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
