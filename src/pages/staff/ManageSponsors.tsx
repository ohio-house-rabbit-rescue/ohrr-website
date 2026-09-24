// Staff → Sponsors & partners: the roster on the public Our Partners page,
// partner perks, and the "Presented by" strips — the same `sponsors` and
// `sponsor_placements` tables, `sponsor-logos` bucket, `sponsors_expiring` RPC
// and permission (Manage Midwest BunFest info) as the app's StaffSponsors.tsx.
// Anything saved here shows on the website and in the app at once.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn, Card, SponsorLogo } from '../../components/ui'
import { Icon } from '../../components/icons'
import { SPONSOR_TIERS, TIER_LABEL } from '../../lib/constants'
import type { SponsorTier, PlacementSurface } from '../../lib/types'

/* ---- rows (the website's Supabase client is untyped; these mirror the app's Database types) ---- */

interface SponsorRow {
  id: string
  org_id: string
  name: string
  tier: string
  blurb: string | null
  logo_url: string | null
  website: string | null
  perk_title: string | null
  perk_detail: string | null
  perk_code: string | null
  term_start: string | null
  term_end: string | null
  /** Warn staff this many days before term_end. */
  remind_days: number | null
  is_active: boolean
  sort_order: number
}

interface PlacementRow {
  id: string
  sponsor_id: string
  surface: string
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

/* ---- tiers & surfaces (same values as the app and the database) ---- */

function isTier(v: string): v is SponsorTier {
  return (SPONSOR_TIERS as readonly string[]).includes(v)
}
function tierLabel(tier: string): string {
  return isTier(tier) ? TIER_LABEL[tier] : tier
}
function tierRank(tier: string): number {
  const i = (SPONSOR_TIERS as readonly string[]).indexOf(tier)
  return i === -1 ? SPONSOR_TIERS.length : i
}

// Where a "Presented by" strip can go. The value is what both the app and this
// site look up; the label says where it shows on each.
const SURFACES: { value: PlacementSurface; label: string }[] = [
  { value: 'home', label: 'Home (website home page & app home)' },
  { value: 'bunfest', label: 'BunFest home' },
  { value: 'silent-auction', label: 'Silent auction' },
  { value: 'events', label: 'Events' },
  { value: 'care-library', label: 'Care library (Learn)' },
  { value: 'find-a-vet', label: 'Find a vet' },
  { value: 'happy-tails', label: 'Happy Tails' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'hop-shop', label: 'Hop Shop' },
  { value: 'my-bunny', label: 'My Bunny (app)' },
]
function surfaceLabel(value: string): string {
  return SURFACES.find((s) => s.value === value)?.label ?? value
}

/* ---- the form's draft ---- */

interface Draft {
  name: string
  tier: SponsorTier
  blurb: string
  logo_url: string
  website: string
  perk_title: string
  perk_detail: string
  perk_code: string
  term_start: string // YYYY-MM-DD or ''
  term_end: string // YYYY-MM-DD or ''
  /** Warn this many days before the term ends. */
  remind_days: string
  is_active: boolean
  sort_order: string // '' = append to the end of its tier
}

const emptyDraft: Draft = {
  name: '',
  tier: 'community',
  blurb: '',
  logo_url: '',
  website: '',
  perk_title: '',
  perk_detail: '',
  perk_code: '',
  term_start: '',
  term_end: '',
  remind_days: '21',
  is_active: true,
  sort_order: '',
}

function draftFrom(s: SponsorRow): Draft {
  return {
    name: s.name,
    tier: isTier(s.tier) ? s.tier : 'community',
    blurb: s.blurb ?? '',
    logo_url: s.logo_url ?? '',
    website: s.website ?? '',
    perk_title: s.perk_title ?? '',
    perk_detail: s.perk_detail ?? '',
    perk_code: s.perk_code ?? '',
    term_start: s.term_start ?? '',
    term_end: s.term_end ?? '',
    remind_days: String(s.remind_days ?? 21),
    is_active: s.is_active,
    sort_order: String(s.sort_order),
  }
}

function draftToPatch(d: Draft) {
  const n = parseInt(d.sort_order, 10)
  return {
    name: d.name.trim(),
    tier: d.tier,
    blurb: d.blurb.trim() || null,
    logo_url: d.logo_url.trim() || null,
    website: d.website.trim() || null,
    remind_days: Math.min(180, Math.max(0, Number(d.remind_days) || 21)),
    perk_title: d.perk_title.trim() || null,
    perk_detail: d.perk_detail.trim() || null,
    perk_code: d.perk_code.trim() || null,
    term_start: d.term_start || null,
    term_end: d.term_end || null,
    is_active: d.is_active,
    ...(Number.isFinite(n) ? { sort_order: n } : {}),
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function fmtDate(iso: string): string {
  try {
    // Date-only strings parse as UTC; add the time so it shows the same calendar day.
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

/* ---- logo upload: downscale to max 800px, then sponsor-logos/<org_id>/<uuid>.<ext> ---- */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image. Try a PNG or JPG.'))
    }
    img.src = url
  })
}

async function downscaleLogo(file: File, max = 800): Promise<{ blob: Blob; ext: 'jpg' | 'png'; type: string }> {
  const img = await loadImage(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) throw new Error('Could not read that image. Try a PNG or JPG.')
  const scale = Math.min(1, max / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not available in this browser.')
  ctx.drawImage(img, 0, 0, cw, ch)
  // Keep transparency for anything that isn't a JPEG (most logos are PNG/SVG).
  const png = file.type !== 'image/jpeg'
  const type = png ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.9))
  if (!blob) throw new Error('Could not process that image.')
  return { blob, ext: png ? 'png' : 'jpg', type }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

async function uploadLogo(file: File, orgId: string): Promise<string> {
  const { blob, ext, type } = await downscaleLogo(file)
  const path = `${orgId}/${uuid()}.${ext}`
  const { error } = await supabase.storage.from('sponsor-logos').upload(path, blob, { contentType: type, upsert: false })
  if (error) throw error
  return supabase.storage.from('sponsor-logos').getPublicUrl(path).data.publicUrl
}

// Best-effort cleanup of a replaced/removed logo that lives in our bucket.
function storagePathOf(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/sponsor-logos\/(.+?)(?:\?.*)?$/)
  return m ? decodeURIComponent(m[1]) : null
}
async function removeLogoObject(url: string) {
  const path = storagePathOf(url)
  if (!path) return
  try {
    await supabase.storage.from('sponsor-logos').remove([path])
  } catch {
    /* best effort */
  }
}

const label = 'block text-sm font-semibold text-slate-700'
const smallBtn = 'rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60'
const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold'
const pillBlue = `${pill} bg-brand-blue-50 text-brand-blue`
const pillOrange = `${pill} bg-brand-orange-50 text-brand-orange-dark`
const pillSlate = `${pill} bg-slate-100 text-slate-600`

function LogoUploader({
  name,
  logoUrl,
  orgId,
  onChange,
}: {
  name: string
  logoUrl: string
  orgId: string
  onChange: (next: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadLogo(f, orgId)
      if (logoUrl) await removeLogoObject(logoUrl)
      onChange(url)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    const old = logoUrl
    onChange('')
    if (old) await removeLogoObject(old)
  }

  return (
    <div>
      <span className={label}>Logo</span>
      <div className="mt-1.5 flex items-center gap-3">
        <SponsorLogo name={name || 'Sponsor'} logoUrl={logoUrl || null} className="h-14 max-w-[160px] text-xl" />
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-brand-blue hover:bg-slate-50 ${busy ? 'opacity-60' : ''}`}
          >
            <Icon name="award" size={15} />
            {busy ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
            <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(e) => onFile(e.target.files)} />
          </label>
          {logoUrl && (
            <button type="button" onClick={remove} disabled={busy} className={smallBtn}>
              Remove
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-600">The real brand logo (PNG or JPG). It's resized to 800px max.</p>
      {error && <p className="mt-1 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

/* ---- sponsor form ---- */

function SponsorForm({
  initial,
  orgId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  orgId: string
  submitLabel: string
  onSubmit: (d: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set =
    (k: keyof Draft) =>
    (e: { target: { value: string } }) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }))

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(draft)
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: who they are */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className={label}>
              Name
              <input className={staffInput} required value={draft.name} onChange={set('name')} placeholder="Business or organization" />
            </label>
            <label className={`${label} sm:w-52`}>
              Tier
              <select className={staffInput} value={draft.tier} onChange={(e) => setDraft((d) => ({ ...d, tier: e.target.value as SponsorTier }))}>
                {SPONSOR_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <LogoUploader name={draft.name} logoUrl={draft.logo_url} orgId={orgId} onChange={(logo_url) => setDraft((d) => ({ ...d, logo_url }))} />

          <label className={label}>
            Blurb
            <textarea className={staffInput} rows={3} value={draft.blurb} onChange={set('blurb')} placeholder="One or two sentences about this partner" />
          </label>
          <label className={label}>
            Website
            <input className={staffInput} type="url" inputMode="url" value={draft.website} onChange={set('website')} placeholder="https://" />
          </label>
        </div>

        {/* Right: the perk and the term */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Partner perk <span className="font-semibold normal-case text-slate-500">(optional)</span>
            </p>
            <label className={`${label} mt-2`}>
              Perk title
              <input className={staffInput} value={draft.perk_title} onChange={set('perk_title')} placeholder="e.g. 10% off for OHRR adopters" />
            </label>
            <label className={`${label} mt-2`}>
              Perk details
              <textarea className={staffInput} rows={2} value={draft.perk_detail} onChange={set('perk_detail')} placeholder="How to redeem, any limits or dates" />
            </label>
            <label className={`${label} mt-2`}>
              Code <span className="font-normal text-slate-600">(revealed with a "Show code" tap)</span>
              <input className={staffInput} value={draft.perk_code} onChange={set('perk_code')} placeholder="e.g. OHRR2026" autoCapitalize="characters" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Term start
              <input className={staffInput} type="date" value={draft.term_start} onChange={set('term_start')} />
            </label>
            <label className={label}>
              Term end
              <input className={staffInput} type="date" value={draft.term_end} onChange={set('term_end')} />
            </label>
          </div>
          {draft.term_end && (
            <label className={label}>
              Remind us this many days before it ends
              <input
                className={staffInput}
                inputMode="numeric"
                value={draft.remind_days}
                onChange={(e) => setDraft((d) => ({ ...d, remind_days: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="21"
              />
            </label>
          )}
          <p className="text-sm text-slate-600">
            Optional. After the term end date the partner is hidden from the public automatically — and the staff pages
            warn you before that happens, so a renewal can be asked for in time.
          </p>

          <div className="flex items-end gap-4">
            <label className={`${label} w-32`}>
              Sort order
              <input className={staffInput} type="number" inputMode="numeric" value={draft.sort_order} onChange={set('sort_order')} placeholder="auto" />
            </label>
            <label className="flex items-center gap-2 pb-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-brand-blue"
                checked={draft.is_active}
                onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              />
              Show on the site and in the app
            </label>
          </div>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={busy || draft.name.trim().length === 0} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ---- placements sub-editor ---- */

// <input type="datetime-local"> value (the browser's local time zone) → ISO.
function fromLocalInput(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function windowText(p: PlacementRow): string {
  if (p.starts_at && p.ends_at) return `${fmtDateTime(p.starts_at)} – ${fmtDateTime(p.ends_at)}`
  if (p.starts_at) return `From ${fmtDateTime(p.starts_at)}`
  if (p.ends_at) return `Until ${fmtDateTime(p.ends_at)}`
  return 'Always (while active)'
}

function PlacementsEditor({ sponsor, orgId }: { sponsor: SponsorRow; orgId: string }) {
  const [items, setItems] = useState<PlacementRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [surface, setSurface] = useState<PlacementSurface>('home')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('sponsor_placements')
      .select('id,sponsor_id,surface,starts_at,ends_at,is_active')
      .eq('sponsor_id', sponsor.id)
      .order('created_at')
    if (error) {
      setError(errMessage(error))
      setItems([])
      return
    }
    setItems((data ?? []) as PlacementRow[])
  }, [sponsor.id])

  useEffect(() => {
    load()
  }, [load])

  // Pre-select the first surface this sponsor isn't on yet.
  useEffect(() => {
    if (!items) return
    const used = new Set(items.map((p) => p.surface))
    const free = SURFACES.find((s) => !used.has(s.value))
    if (free && used.has(surface)) setSurface(free.value)
  }, [items, surface])

  const add = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('sponsor_placements').insert({
      org_id: orgId,
      sponsor_id: sponsor.id,
      surface,
      starts_at: fromLocalInput(startsAt),
      ends_at: fromLocalInput(endsAt),
      is_active: true,
    })
    setBusy(false)
    if (error) {
      setError(errMessage(error))
      return
    }
    setStartsAt('')
    setEndsAt('')
    await load()
  }

  const toggle = async (p: PlacementRow) => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('sponsor_placements').update({ is_active: !p.is_active }).eq('id', p.id)
    setBusy(false)
    if (error) setError(errMessage(error))
    else await load()
  }

  const remove = async (p: PlacementRow) => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('sponsor_placements').delete().eq('id', p.id)
    setBusy(false)
    if (error) setError(errMessage(error))
    else await load()
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600">"Presented by" placements</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Each placement shows a small "Presented by {sponsor.name}" strip on that page — always, or only inside a date
        window. The same placement shows on the website and in the app.
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          {items === null ? (
            <p className="text-sm font-semibold text-slate-600">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-600">No placements yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {items.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-ink">{surfaceLabel(p.surface)}</span>
                      <span className={p.is_active ? pillBlue : pillSlate}>{p.is_active ? 'On' : 'Off'}</span>
                    </div>
                    <p className="text-sm text-slate-600">{windowText(p)}</p>
                  </div>
                  <button type="button" onClick={() => toggle(p)} disabled={busy} className={smallBtn}>
                    {p.is_active ? 'Turn off' : 'Turn on'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    disabled={busy}
                    aria-label={`Remove ${surfaceLabel(p.surface)} placement`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={add} className="space-y-2">
          <label className={label}>
            Add to page
            <select className={staffInput} value={surface} onChange={(e) => setSurface(e.target.value as PlacementSurface)}>
              {SURFACES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={label}>
              Starts <span className="font-normal text-slate-600">(optional)</span>
              <input className={staffInput} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label className={label}>
              Ends <span className="font-normal text-slate-600">(optional)</span>
              <input className={staffInput} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full border border-brand-blue/40 px-4 py-2 text-sm font-bold text-brand-blue hover:bg-brand-blue-50 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add placement'}
          </button>
        </form>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

/* ---- sponsor card (list item) ---- */

function SponsorCard({
  item,
  orgId,
  canMoveUp,
  canMoveDown,
  onMove,
  onChanged,
}: {
  item: SponsorRow
  orgId: string
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (dir: -1 | 1) => Promise<void>
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [placementsOpen, setPlacementsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expired = Boolean(item.term_end && item.term_end < todayIso())

  const saveEdit = async (d: Draft) => {
    const { error } = await supabase.from('sponsors').update(draftToPatch(d)).eq('id', item.id)
    if (error) throw error
    setEditing(false)
    onChanged()
  }

  const toggleActive = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('sponsors').update({ is_active: !item.is_active }).eq('id', item.id)
    if (error) setError(errMessage(error))
    setBusy(false)
    if (!error) onChanged()
  }

  const move = async (dir: -1 | 1) => {
    setBusy(true)
    setError(null)
    try {
      await onMove(dir)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('sponsors').delete().eq('id', item.id)
    if (error) {
      setError(errMessage(error))
      setBusy(false)
      setConfirmDelete(false)
      return
    }
    if (item.logo_url) await removeLogoObject(item.logo_url)
    onChanged()
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SponsorForm initial={draftFrom(item)} orgId={orgId} submitLabel="Save changes" onSubmit={saveEdit} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  const term =
    item.term_start && item.term_end
      ? `${fmtDate(item.term_start)} – ${fmtDate(item.term_end)}`
      : item.term_end
        ? `Until ${fmtDate(item.term_end)}`
        : item.term_start
          ? `From ${fmtDate(item.term_start)}`
          : null

  return (
    <div className="space-y-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="flex w-28 shrink-0 items-center justify-center">
          <SponsorLogo name={item.name} logoUrl={item.logo_url} className="h-14 max-w-[112px] text-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-extrabold text-ink">{item.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={item.tier === 'presenting' ? pillOrange : pillBlue}>{tierLabel(item.tier)}</span>
            {!item.is_active && <span className={pillSlate}>Hidden</span>}
            {expired && <span className={pillSlate}>Term ended</span>}
            {item.perk_title && <span className={pillOrange}>Perk</span>}
          </div>
          {term && <p className="mt-1 text-sm text-slate-600">{term}</p>}
          {item.website && <p className="mt-0.5 truncate text-sm text-slate-600">{item.website}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className={smallBtn}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => setPlacementsOpen((o) => !o)}
          aria-expanded={placementsOpen}
          className={`rounded-full border px-3.5 py-2 text-sm font-bold ${
            placementsOpen ? 'border-brand-blue bg-brand-blue-50 text-brand-blue' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Placements
        </button>
        <button type="button" onClick={toggleActive} disabled={busy} className={smallBtn}>
          {item.is_active ? 'Hide' : 'Show'}
        </button>
        <span className="inline-flex overflow-hidden rounded-full border border-slate-200">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={busy || !canMoveUp}
            aria-label="Move up"
            className="flex h-9 w-10 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <Icon name="chevron" size={16} className="-rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={busy || !canMoveDown}
            aria-label="Move down"
            className="flex h-9 w-10 items-center justify-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <Icon name="chevron" size={16} className="rotate-90" />
          </button>
        </span>
        {confirmDelete ? (
          <>
            <button type="button" onClick={doDelete} disabled={busy} className="rounded-full bg-red-600 px-3.5 py-2 text-sm font-bold text-white disabled:opacity-60">
              {busy ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={smallBtn}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full border border-red-200 px-3.5 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
            Delete
          </button>
        )}
      </div>

      {placementsOpen && <PlacementsEditor sponsor={item} orgId={orgId} />}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

/* ---- "Three sponsorships end this month" ---- */

interface ExpiringRow {
  id: string
  name: string
  tier: string
  term_end: string
  days_left: number
  is_active: boolean
}

// A sponsorship quietly disappears from the public pages on its end date, which
// is right but leaves nobody to ask for a renewal. This says it early enough to
// do something: the window is each sponsor's own `remind_days` (the app shows the
// same notice on its staff home, from the same `sponsors_expiring` RPC).
export function ExpiringSponsorsNotice({ orgId, className = '' }: { orgId: string; className?: string }) {
  const [rows, setRows] = useState<ExpiringRow[]>([])
  useEffect(() => {
    if (!orgId) return
    let alive = true
    supabase.rpc('sponsors_expiring', { p_org: orgId }).then(({ data, error }) => {
      if (!alive || error) return
      setRows(Array.isArray(data) ? (data as ExpiringRow[]) : [])
    })
    return () => {
      alive = false
    }
  }, [orgId])

  if (rows.length === 0) return null
  const ended = rows.filter((r) => r.days_left < 0)
  const when = (d: number) =>
    d < 0 ? `ended ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago` : d === 0 ? 'ends today' : `ends in ${d} day${d === 1 ? '' : 's'}`

  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange-50/50 p-4 ${className}`}>
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange-dark">
        <Icon name="award" size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-extrabold text-ink">
          {ended.length === rows.length
            ? `${rows.length} sponsorship${rows.length === 1 ? ' has' : 's have'} ended`
            : `${rows.length} sponsorship${rows.length === 1 ? '' : 's'} need${rows.length === 1 ? 's' : ''} a renewal`}
        </p>
        <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
          {rows.slice(0, 4).map((r) => (
            <li key={r.id}>
              <strong>{r.name}</strong> · {when(r.days_left)}
            </li>
          ))}
        </ul>
        {rows.length > 4 && <p className="mt-0.5 text-sm text-slate-600">+{rows.length - 4} more</p>}
        <Link to="/staff/sponsors/renewals" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand-blue">
          Open the renewals list <Icon name="chevron" size={15} />
        </Link>
      </div>
    </div>
  )
}

/* ---- page ---- */

const sortRows = (rows: SponsorRow[]) =>
  [...rows].sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.sort_order - b.sort_order || a.name.localeCompare(b.name))

export default function ManageSponsors() {
  const { user, membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const allowed = can('events.bunfest.manage')

  const [items, setItems] = useState<SponsorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const { data, error } = await supabase
      .from('sponsors')
      .select('id,org_id,name,tier,blurb,logo_url,website,perk_title,perk_detail,perk_code,term_start,term_end,remind_days,is_active,sort_order')
      .eq('org_id', orgId)
    if (error) {
      setError(errMessage(error))
      setLoading(false)
      return
    }
    setItems(sortRows((data ?? []) as SponsorRow[]))
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    load()
  }, [load])

  const create = async (d: Draft) => {
    const patch = draftToPatch(d)
    const { error } = await supabase.from('sponsors').insert({
      org_id: orgId,
      ...patch,
      sort_order: patch.sort_order ?? items.filter((s) => s.tier === d.tier).length,
      created_by: userId,
    })
    if (error) throw error
    setCreating(false)
    await load()
  }

  // Reorder within a tier: swap with the neighbour, then renumber that tier 0..n.
  const move = async (item: SponsorRow, dir: -1 | 1) => {
    const group = items.filter((s) => s.tier === item.tier)
    const i = group.findIndex((s) => s.id === item.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= group.length) return
    const next = [...group]
    ;[next[i], next[j]] = [next[j], next[i]]
    const updates = next.map((s, idx) => ({ id: s.id, sort_order: idx, was: s.sort_order })).filter((u) => u.sort_order !== u.was)
    const results = await Promise.all(updates.map((u) => supabase.from('sponsors').update({ sort_order: u.sort_order }).eq('id', u.id)))
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error
    await load()
  }

  const groups = SPONSOR_TIERS.map((tier) => ({ tier, rows: items.filter((s) => s.tier === tier) })).filter((g) => g.rows.length > 0)

  if (!allowed) {
    return (
      <p className="text-slate-600">
        You don't have access to manage sponsors. An owner or admin can grant the "Manage Midwest BunFest info" capability.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Sponsors &amp; partners</h1>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={btn.orange}>
            Add sponsor
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        The roster on the public Our Partners page, partner perks, and "Presented by" strips — on this website and in
        the app.
      </p>
      <p className="mt-2 text-sm">
        <Link to="/staff/sponsors/renewals" className="font-semibold text-brand-blue">
          Renewals list — who to ask about continuing →
        </Link>
      </p>

      <ExpiringSponsorsNotice orgId={orgId} className="mt-5" />

      {creating && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 font-display text-base font-extrabold text-ink">New sponsor</p>
          <SponsorForm initial={emptyDraft} orgId={orgId} submitLabel="Add sponsor" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner label="Loading sponsors…" />
      ) : items.length === 0 ? (
        <Card className="mt-6 text-center">
          <p className="text-base leading-relaxed text-slate-700">
            No sponsors yet. Click "Add sponsor" to list the first partner — until then the public page says partners
            will be announced.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <div key={g.tier}>
              <h2 className="font-display text-lg font-extrabold text-ink">{tierLabel(g.tier)}s</h2>
              <div className="mt-3 space-y-3">
                {g.rows.map((item, idx) => (
                  <SponsorCard
                    key={item.id}
                    item={item}
                    orgId={orgId}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < g.rows.length - 1}
                    onMove={(dir) => move(item, dir)}
                    onChanged={load}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
