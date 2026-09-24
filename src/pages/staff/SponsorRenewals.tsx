// Staff → Sponsors → Renewals: who to ask about continuing, soonest first
// (2026-09-24, OHRR: "we will need a list generator on sponsors that are about
// to expire and then we can reach out for a continued").
//
// Sponsorships already end on their own on term_end. This lists the ones
// ending soon (and those that ended lately — they may still renew) with who to
// ask and where it stands, and turns it into an email, a copied list, a
// spreadsheet or a printout. The contact and status live in the staff-only
// `sponsor_renewals` table (update 24); `status_for` is the term end a status
// is about, so after "Renewed — add a year" the new term starts at "Not asked
// yet". Same table and rules as the app's Sponsor renewals screen.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn, SponsorLogo } from '../../components/ui'
import { Icon } from '../../components/icons'
import { SPONSOR_TIERS, TIER_LABEL } from '../../lib/constants'
import type { SponsorTier } from '../../lib/types'

interface SponsorRow {
  id: string
  org_id: string
  name: string
  tier: string
  logo_url: string | null
  website: string | null
  term_start: string | null
  term_end: string | null
  remind_days: number | null
  is_active: boolean
}

type Status = 'not_asked' | 'asked' | 'renewing' | 'not_renewing'

interface RenewalRow {
  sponsor_id: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  status: Status
  status_for: string | null
  asked_on: string | null
  note: string | null
}

// Where each sponsor shows — the same places as Staff → Sponsors → Placements.
const SURFACE_LABEL: Record<string, string> = {
  home: 'Home',
  bunfest: 'BunFest',
  'silent-auction': 'Silent auction',
  events: 'Events',
  'care-library': 'Care library',
  'find-a-vet': 'Find a vet',
  'happy-tails': 'Happy Tails',
  volunteer: 'Volunteer',
  'hop-shop': 'Hop Shop',
  'my-bunny': 'My Bunny',
}

const WINDOWS = [
  { days: 30, label: 'Next 30 days' },
  { days: 60, label: 'Next 60 days' },
  { days: 90, label: 'Next 90 days' },
  { days: 0, label: 'All' },
] as const
/** Ended sponsorships stay on the list this long — they may still renew. */
const ENDED_DAYS = 90

/* ---- dates: plain calendar days ("2026-12-31"), counted in the visitor's own day ---- */

const pad = (n: number) => String(n).padStart(2, '0')
function todayIso(): string {
  const t = new Date()
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}
function daysFromToday(iso: string): number {
  return dayNumber(iso) - dayNumber(todayIso())
}
function isoOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
function addDays(iso: string, n: number): string {
  return isoOf((dayNumber(iso) + n) * 86_400_000)
}
/** The same day a year later (29 February becomes 28 February). */
function addYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const last = new Date(Date.UTC(y + 1, m, 0)).getUTCDate()
  return `${y + 1}-${pad(m)}-${pad(Math.min(d, last))}`
}
function fmt(iso: string, month: 'short' | 'long' = 'short'): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
function whenText(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} ago`
  if (days === 0) return 'today'
  return `in ${days} day${days === 1 ? '' : 's'}`
}

function tierLabel(tier: string): string {
  return (SPONSOR_TIERS as readonly string[]).includes(tier) ? TIER_LABEL[tier as SponsorTier] : tier
}

const STATUS_LABEL: Record<Status, string> = {
  not_asked: 'Not asked yet',
  asked: 'Asked',
  renewing: 'Renewing',
  not_renewing: 'Not renewing',
}

/** One sponsor on the list, with its renewal row (if any) and where it shows. */
interface Item {
  s: SponsorRow & { term_end: string }
  r: RenewalRow | null
  status: Status
  days: number
  surfaces: string[]
}

function statusText(it: Item): string {
  return it.status === 'asked' && it.r?.asked_on ? `Asked ${fmt(it.r.asked_on)}` : STATUS_LABEL[it.status]
}

/* ---- the email, the copied list and the spreadsheet ---- */

function renewalMailto(it: Item): string {
  const first = (it.r?.contact_name ?? '').trim().split(/\s+/)[0] || 'there'
  const body = [
    `Hello ${first},`,
    '',
    `Thank you for sponsoring Ohio House Rabbit Rescue. Your current sponsorship runs through ${fmt(it.s.term_end, 'long')}.`,
    '',
    "We would love to have you with us again. Would you like to continue for next year? Just reply to this email and we'll take care of the rest.",
    '',
    'Thank you for helping the rabbits,',
    'Ohio House Rabbit Rescue',
  ].join('\n')
  const subject = 'Sponsoring Ohio House Rabbit Rescue again'
  return `mailto:${it.r?.contact_email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function endsText(it: Item): string {
  return `${it.days < 0 ? 'Ended' : 'Ends'} ${fmt(it.s.term_end)} (${whenText(it.days)})`
}

function listText(items: Item[]): string {
  return items
    .map((it) => {
      const contact = [it.r?.contact_name, it.r?.contact_email, it.r?.contact_phone].filter(Boolean).join(', ')
      return [
        `${it.s.name} — ${tierLabel(it.s.tier)} — ${endsText(it)}`,
        `Contact: ${contact || 'none yet'}`,
        `Status: ${statusText(it)}`,
        it.r?.note ? `Note: ${it.r.note}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

function csvOf(items: Item[]): string {
  const q = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['Sponsor', 'Level', 'Term start', 'Term end', 'Days left', 'Shown on', 'Contact name', 'Contact email', 'Contact phone', 'Status', 'Asked on', 'Note', 'Website']
  const lines = items.map((it) =>
    [
      it.s.name,
      tierLabel(it.s.tier),
      it.s.term_start,
      it.s.term_end,
      it.days,
      it.surfaces.map((x) => SURFACE_LABEL[x] ?? x).join('; '),
      it.r?.contact_name,
      it.r?.contact_email,
      it.r?.contact_phone,
      STATUS_LABEL[it.status],
      it.status === 'asked' ? it.r?.asked_on : '',
      it.r?.note,
      it.s.website,
    ]
      .map(q)
      .join(','),
  )
  return '\uFEFF' + [head.map(q).join(','), ...lines].join('\r\n')
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    document.body.appendChild(t)
    t.select()
    const ok = document.execCommand('copy')
    t.remove()
    return ok
  }
}

/* ---- styles ---- */

const smallBtn =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold'
const STATUS_PILL: Record<Status, string> = {
  not_asked: `${pill} bg-slate-100 text-slate-700`,
  asked: `${pill} bg-brand-blue-50 text-brand-blue`,
  renewing: `${pill} bg-emerald-50 text-emerald-800`,
  not_renewing: `${pill} bg-slate-100 text-slate-500`,
}

/* ---- one sponsor ---- */

function RenewalCard({
  it,
  onStatus,
  onContact,
  onRenewed,
}: {
  it: Item
  onStatus: (status: Status) => Promise<void>
  onContact: (c: Pick<RenewalRow, 'contact_name' | 'contact_email' | 'contact_phone' | 'note'>) => Promise<void>
  onRenewed: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [confirmRenew, setConfirmRenew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', note: '' })

  const r = it.r
  const soon = it.days < 0 || it.days <= (it.s.remind_days ?? 21)
  const muted = it.status === 'not_renewing'

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const openEdit = () => {
    setDraft({ name: r?.contact_name ?? '', email: r?.contact_email ?? '', phone: r?.contact_phone ?? '', note: r?.note ?? '' })
    setEditing(true)
  }

  return (
    <li className={`print-break-inside-avoid rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${muted ? 'opacity-70' : ''}`}>
      <div className="flex gap-4">
        <div className="flex w-24 shrink-0 items-start justify-center pt-1">
          <SponsorLogo name={it.s.name} logoUrl={it.s.logo_url} className="h-12 max-w-[96px] text-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-extrabold text-ink">{it.s.name}</h2>
            <span className={STATUS_PILL[it.status]}>{statusText(it)}</span>
          </div>
          <p className="text-sm text-slate-600">
            {tierLabel(it.s.tier)}
            {it.surfaces.length > 0 && ` · shown on ${it.surfaces.map((x) => SURFACE_LABEL[x] ?? x).join(', ')}`}
          </p>
          <p className={`mt-1 text-base font-bold ${soon ? 'text-brand-orange-ink' : 'text-ink'}`}>{endsText(it)}</p>
          <p className="mt-1 text-base text-slate-700">
            {r?.contact_name || r?.contact_email || r?.contact_phone ? (
              <>
                {r?.contact_name && <span className="font-semibold">{r.contact_name}</span>}
                {r?.contact_email && (
                  <>
                    {r?.contact_name && ' · '}
                    <a href={`mailto:${r.contact_email}`} className="font-semibold text-brand-blue">
                      {r.contact_email}
                    </a>
                  </>
                )}
                {r?.contact_phone && (
                  <>
                    {(r?.contact_name || r?.contact_email) && ' · '}
                    <a href={`tel:${r.contact_phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-brand-blue">
                      {r.contact_phone}
                    </a>
                  </>
                )}
              </>
            ) : (
              <span className="text-slate-500">No contact saved yet.</span>
            )}
          </p>
          {r?.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{r.note}</p>}
        </div>
      </div>

      {editing ? (
        <form
          className="no-print mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              await onContact({
                contact_name: draft.name.trim() || null,
                contact_email: draft.email.trim() || null,
                contact_phone: draft.phone.trim() || null,
                note: draft.note.trim() || null,
              })
              setEditing(false)
            })
          }}
        >
          <label className="block text-sm font-semibold text-slate-700">
            Contact name
            <input className={staffInput} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input className={staffInput} type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Phone
            <input className={staffInput} type="tel" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
          </label>
          <label className="block text-sm font-semibold text-slate-700 sm:col-span-3">
            Note (staff only)
            <textarea
              className={staffInput}
              rows={2}
              value={draft.note}
              placeholder="e.g. Prefers a call in October; last year gave the spa sponsorship"
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <button type="submit" disabled={busy} className={btn.blue}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={smallBtn}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="no-print mt-4 flex flex-wrap items-center gap-2">
          {r?.contact_email ? (
            <a href={renewalMailto(it)} className={btn.blue}>
              <Icon name="mail" size={18} /> Email them
            </a>
          ) : (
            <button type="button" onClick={openEdit} className={btn.blue}>
              Add a contact
            </button>
          )}
          {it.status !== 'asked' && (
            <button type="button" disabled={busy} onClick={() => run(() => onStatus('asked'))} className={smallBtn}>
              Mark as asked
            </button>
          )}
          {it.status !== 'renewing' && (
            <button type="button" disabled={busy} onClick={() => run(() => onStatus('renewing'))} className={smallBtn}>
              Renewing
            </button>
          )}
          {it.status !== 'not_renewing' && (
            <button type="button" disabled={busy} onClick={() => run(() => onStatus('not_renewing'))} className={smallBtn}>
              Not renewing
            </button>
          )}
          {confirmRenew ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(async () => { await onRenewed(); setConfirmRenew(false) })}
                className={btn.orange}
              >
                {busy ? 'Saving…' : `Yes — runs to ${fmt(addYear(it.s.term_end))}`}
              </button>
              <button type="button" onClick={() => setConfirmRenew(false)} className={smallBtn}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmRenew(true)} className={smallBtn}>
              Renewed — add a year
            </button>
          )}
          {r?.contact_email || r?.contact_name || r?.contact_phone || r?.note ? (
            <button type="button" onClick={openEdit} className={smallBtn}>
              Edit contact &amp; note
            </button>
          ) : null}
        </div>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </li>
  )
}

/* ---- page ---- */

export default function SponsorRenewals() {
  const { user, membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const allowed = can('events.bunfest.manage')

  const [sponsors, setSponsors] = useState<SponsorRow[]>([])
  const [renewals, setRenewals] = useState<RenewalRow[]>([])
  const [surfaces, setSurfaces] = useState<Record<string, string[]>>({})
  const [noTable, setNoTable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowDays, setWindowDays] = useState<number>(90)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const [s, p, r] = await Promise.all([
      supabase
        .from('sponsors')
        .select('id,org_id,name,tier,logo_url,website,term_start,term_end,remind_days,is_active')
        .eq('org_id', orgId),
      supabase.from('sponsor_placements').select('sponsor_id,surface,is_active').eq('org_id', orgId),
      supabase
        .from('sponsor_renewals')
        .select('sponsor_id,contact_name,contact_email,contact_phone,status,status_for,asked_on,note')
        .eq('org_id', orgId),
    ])
    if (s.error) {
      setError(errMessage(s.error))
      setLoading(false)
      return
    }
    setSponsors((s.data ?? []) as SponsorRow[])
    const bySponsor: Record<string, string[]> = {}
    for (const row of (p.data ?? []) as { sponsor_id: string; surface: string; is_active: boolean }[]) {
      if (row.is_active === false) continue
      bySponsor[row.sponsor_id] = [...new Set([...(bySponsor[row.sponsor_id] ?? []), row.surface])]
    }
    setSurfaces(bySponsor)
    // Before update 24 runs the table isn't there: the list still works, without contacts.
    setNoTable(!!r.error)
    setRenewals(r.error ? [] : ((r.data ?? []) as RenewalRow[]))
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    load()
  }, [load])

  const items: Item[] = useMemo(() => {
    const byId = new Map(renewals.map((r) => [r.sponsor_id, r]))
    return sponsors
      .filter((s): s is SponsorRow & { term_end: string } => s.is_active && !!s.term_end)
      .map((s) => {
        const r = byId.get(s.id) ?? null
        return {
          s,
          r,
          status: r && r.status_for === s.term_end ? r.status : ('not_asked' as Status),
          days: daysFromToday(s.term_end),
          surfaces: surfaces[s.id] ?? [],
        }
      })
      .filter((it) => it.days >= -ENDED_DAYS && (windowDays === 0 || it.days <= windowDays))
      .sort(
        (a, b) =>
          Number(a.status === 'not_renewing') - Number(b.status === 'not_renewing') ||
          a.s.term_end.localeCompare(b.s.term_end) ||
          a.s.name.localeCompare(b.s.name),
      )
  }, [sponsors, renewals, surfaces, windowDays])

  const upsert = async (it: Item, patch: Partial<RenewalRow>) => {
    const { error } = await supabase
      .from('sponsor_renewals')
      .upsert({ sponsor_id: it.s.id, org_id: orgId, updated_by: userId || null, ...patch }, { onConflict: 'sponsor_id' })
    if (error) throw error
    await load()
  }

  const setStatus = (it: Item, status: Status) =>
    upsert(it, {
      status,
      status_for: it.s.term_end,
      ...(status === 'asked' ? { asked_on: todayIso() } : {}),
    })

  const renew = async (it: Item) => {
    const { error } = await supabase
      .from('sponsors')
      .update({ term_start: addDays(it.s.term_end, 1), term_end: addYear(it.s.term_end), is_active: true })
      .eq('id', it.s.id)
    if (error) throw error
    await load()
  }

  if (!allowed) {
    return (
      <p className="text-slate-600">
        You don't have access to sponsors. An owner or admin can grant the "Manage Midwest BunFest info" capability.
      </p>
    )
  }

  const count = (st: Status) => items.filter((i) => i.status === st).length
  const summary = [
    `${items.length} sponsor${items.length === 1 ? '' : 's'}`,
    count('asked') && `${count('asked')} asked`,
    count('renewing') && `${count('renewing')} renewing`,
    count('not_renewing') && `${count('not_renewing')} not renewing`,
  ]
    .filter(Boolean)
    .join(' · ')
  const windowLabel = WINDOWS.find((w) => w.days === windowDays)?.label ?? ''

  return (
    <div>
      <p className="no-print text-sm">
        <Link to="/staff/sponsors" className="font-semibold text-brand-blue">
          ← Sponsors &amp; partners
        </Link>
      </p>
      <h1 className="mt-1 font-display text-2xl font-black text-ink">Sponsor renewals</h1>
      <p className="mt-1 max-w-3xl text-base text-slate-600">
        Sponsorships end on their own on their end date. This is who to ask about continuing, soonest first — with
        those that ended in the last {ENDED_DAYS} days, in case they'd still like to.
      </p>
      <p className="print-only mt-1 text-sm">
        {windowLabel} · printed {fmt(todayIso(), 'long')}
      </p>

      <div className="no-print mt-5 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Which sponsorships to list" className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              aria-pressed={windowDays === w.days}
              onClick={() => setWindowDays(w.days)}
              className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold transition ${
                windowDays === w.days ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 bg-white text-ink hover:border-brand-blue'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {noTable && !loading && (
        <p className="no-print mt-4 rounded-xl bg-brand-orange-50 px-4 py-3 text-sm text-slate-700">
          Contacts and status can be saved once update 24 has been run in Supabase (see RUN-THIS-IN-SUPABASE.sql). The
          list below already works.
        </p>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner label="Loading sponsors…" />
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">{summary}</p>
            {items.length > 0 && (
              <div className="no-print flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (await copy(listText(items))) {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2500)
                    }
                  }}
                  className={smallBtn}
                >
                  {copied && <Icon name="check" size={16} />} {copied ? 'Copied' : 'Copy list'}
                </button>
                <button type="button" onClick={() => download(`ohrr-sponsor-renewals-${todayIso()}.csv`, csvOf(items))} className={smallBtn}>
                  Download spreadsheet (.csv)
                </button>
                <button type="button" onClick={() => window.print()} className={smallBtn}>
                  <Icon name="printer" size={16} /> Print
                </button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-brand-blue-50 px-5 py-4 text-base text-slate-700">
              {windowDays === 0
                ? 'No sponsorship has an end date yet. Set one in Staff → Sponsors (Term ends) and it will show here.'
                : `No sponsorships end in the next ${windowDays} days. Try a longer window.`}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((it) => (
                <RenewalCard
                  key={it.s.id}
                  it={it}
                  onStatus={(st) => setStatus(it, st)}
                  onContact={(c) => upsert(it, c)}
                  onRenewed={() => renew(it)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
