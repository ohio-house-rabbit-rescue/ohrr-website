// Staff → Events: the editor for the shared `events` table — Midwest BunFest and
// every other OHRR hoppening, shown on /events here and on the app's Events
// screen. Desktop mirror of the app's StaffEvents.tsx: same fields, same
// permission (Manage Midwest BunFest info), same `site-images` bucket for the
// picture.
import { useCallback, useEffect, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { uploadSiteImage } from '../../lib/images'
import { btn, Card } from '../../components/ui'
import { Icon } from '../../components/icons'
import { formatDate, formatTimeRange } from '../../lib/format'
import { sampleEvents } from '../../data/events'

interface EventRow {
  id: string
  slug: string
  title: string
  starts_at: string
  ends_at: string | null
  venue: string | null
  address: string | null
  city: string | null
  summary: string | null
  body: string | null
  theme: string | null
  image_url: string | null
  url: string | null
  is_published: boolean
  sort_order: number
}

interface Draft {
  title: string
  slug: string
  starts_local: string // datetime-local value
  ends_local: string
  image_url: string
  venue: string
  address: string
  city: string
  summary: string
  body: string
  theme: string
  url: string
  is_published: boolean
}

const emptyDraft: Draft = {
  title: '',
  slug: '',
  starts_local: '',
  ends_local: '',
  image_url: '',
  venue: '',
  address: '',
  city: '',
  summary: '',
  body: '',
  theme: '',
  url: '',
  is_published: true,
}

// Same rule as the app's careContent.slugify: "Midwest BunFest 2026" → "midwest-bunfest-2026".
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'event'
  )
}

// ISO ↔ <input type="datetime-local"> (the browser's local time zone).
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function draftFrom(e: EventRow): Draft {
  return {
    title: e.title,
    slug: e.slug,
    starts_local: toLocalInput(e.starts_at),
    ends_local: toLocalInput(e.ends_at),
    image_url: e.image_url ?? '',
    venue: e.venue ?? '',
    address: e.address ?? '',
    city: e.city ?? '',
    summary: e.summary ?? '',
    body: e.body ?? '',
    theme: e.theme ?? '',
    url: e.url ?? '',
    is_published: e.is_published,
  }
}

function toRow(d: Draft) {
  const starts = fromLocalInput(d.starts_local)
  if (!starts) throw new Error('Please enter a start date and time.')
  return {
    title: d.title.trim(),
    slug: slugify(d.slug.trim() || d.title),
    starts_at: starts,
    ends_at: fromLocalInput(d.ends_local),
    image_url: d.image_url.trim() || null,
    venue: d.venue.trim() || null,
    address: d.address.trim() || null,
    city: d.city.trim() || null,
    summary: d.summary.trim() || null,
    body: d.body.trim() || null,
    theme: d.theme.trim() || null,
    url: d.url.trim() || null,
    is_published: d.is_published,
  }
}

// An event counts as past once it (or its day, when there is no end) is over.
function isPast(e: EventRow, now = Date.now()): boolean {
  return new Date(e.ends_at ?? e.starts_at).getTime() < now
}

const label = 'block text-sm font-semibold text-slate-700'
const hint = 'mt-1 block text-sm font-normal text-slate-600'
const smallBtn = 'rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60'

// The picture: a photo or the poster, uploaded to the shared `site-images` bucket
// (the same one the app's StaffImageField and this site's other managers use).
function PictureField({
  value,
  userId,
  onChange,
  onBusy,
}: {
  value: string
  userId: string
  onChange: (url: string) => void
  onBusy: (b: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onFiles = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setBusy(true)
    onBusy(true)
    setError(null)
    try {
      onChange(await uploadSiteImage(f, userId, 1600))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
      onBusy(false)
    }
  }
  return (
    <div>
      <span className={label}>
        Picture <span className="font-normal text-slate-600">(optional)</span>
      </span>
      <span className={hint}>A photo or the event poster. Shown on the Events page and in the app.</span>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Icon name="camera" size={28} />}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`inline-block cursor-pointer rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-brand-blue hover:bg-slate-50 ${busy ? 'opacity-60' : ''}`}
          >
            {busy ? 'Uploading…' : value ? 'Change picture' : 'Choose a picture'}
            <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(e) => onFiles(e.target.files)} />
          </label>
          {value && !busy && (
            <button type="button" onClick={() => onChange('')} className={smallBtn}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input className={staffInput} value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" />
      {error && <p className="mt-1.5 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function EventForm({
  initial,
  userId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  userId: string
  submitLabel: string
  onSubmit: (d: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
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
        {/* Left column: what & when */}
        <div className="space-y-3">
          <label className={label}>
            Title
            <input className={staffInput} required value={draft.title} onChange={set('title')} placeholder="e.g. Midwest BunFest 2026" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Starts
              <input className={staffInput} type="datetime-local" required value={draft.starts_local} onChange={set('starts_local')} />
            </label>
            <label className={label}>
              Ends
              <input className={staffInput} type="datetime-local" value={draft.ends_local} onChange={set('ends_local')} />
            </label>
          </div>
          <p className="text-sm text-slate-600">
            After it ends, the event moves itself to <strong>Past events</strong> — nothing to remember.
          </p>
          <label className={label}>
            Summary
            <input className={staffInput} value={draft.summary} onChange={set('summary')} placeholder="One or two sentences shown on the card" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Theme <span className="font-normal text-slate-600">(optional)</span>
              <input className={staffInput} value={draft.theme} onChange={set('theme')} placeholder="Binky On!" />
            </label>
            <label className={label}>
              Link <span className="font-normal text-slate-600">(optional)</span>
              <input className={staffInput} type="url" value={draft.url} onChange={set('url')} placeholder="https://…" />
            </label>
          </div>
          <label className={label}>
            Slug (URL key)
            <input className={staffInput} value={draft.slug} onChange={set('slug')} placeholder="auto from title" />
            <span className={hint}>
              Keep <code>midwest-bunfest-2026</code> for the BunFest event — the BunFest pages read their date, venue
              and theme from that record.
            </span>
          </label>
        </div>

        {/* Right column: where & the picture */}
        <div className="space-y-3">
          <label className={label}>
            Venue
            <input className={staffInput} value={draft.venue} onChange={set('venue')} placeholder="The Makoy" />
          </label>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <label className={label}>
              Address
              <input className={staffInput} value={draft.address} onChange={set('address')} placeholder="5462 Center St., Hilliard, OH 43026" />
            </label>
            <label className={label}>
              City
              <input className={staffInput} value={draft.city} onChange={set('city')} placeholder="Hilliard, OH" />
            </label>
          </div>
          <PictureField value={draft.image_url} userId={userId} onChange={(url) => setDraft((d) => ({ ...d, image_url: url }))} onBusy={setImageBusy} />
        </div>
      </div>

      <label className={label}>
        Details
        <textarea className={`${staffInput} font-mono`} rows={8} value={draft.body} onChange={set('body')} />
        <span className={hint}>
          Leave a blank line between paragraphs. Start a line with <code>##</code> for a heading, or <code>-</code> for a
          bullet. Web addresses become tappable.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-slate-300 text-brand-blue"
          checked={draft.is_published}
          onChange={(e) => setDraft((d) => ({ ...d, is_published: e.target.checked }))}
        />
        Show on the site and in the app (uncheck for a draft)
      </label>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={busy || imageBusy || draft.title.trim().length === 0} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

function EventCard({ item, userId, onChanged }: { item: EventRow; userId: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveEdit = async (d: Draft) => {
    const { error } = await supabase.from('events').update(toRow(d)).eq('id', item.id)
    if (error) throw error
    setEditing(false)
    onChanged()
  }

  const togglePublish = async () => {
    setBusy(true)
    const { error } = await supabase.from('events').update({ is_published: !item.is_published }).eq('id', item.id)
    if (error) setError(errMessage(error))
    setBusy(false)
    if (!error) onChanged()
  }

  const doDelete = async () => {
    setBusy(true)
    const { error } = await supabase.from('events').delete().eq('id', item.id)
    if (error) {
      setError(errMessage(error))
      setBusy(false)
      setConfirmDelete(false)
      return
    }
    onChanged()
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <EventForm initial={draftFrom(item)} userId={userId} submitLabel="Save changes" onSubmit={saveEdit} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  const when = { id: item.id, slug: item.slug, title: item.title, startsAt: item.starts_at, endsAt: item.ends_at }
  return (
    <div className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      {item.image_url && (
        <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 sm:block">
          <img src={item.image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 font-display text-base font-extrabold text-ink">{item.title}</h3>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold ${item.is_published ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-600'}`}>
            {item.is_published ? 'Live' : 'Draft'}
          </span>
        </div>
        <p className="text-sm text-slate-700">
          {formatDate(item.starts_at)} · {formatTimeRange(when)}
        </p>
        {(item.venue || item.city) && <p className="text-sm text-slate-600">{[item.venue, item.city].filter(Boolean).join(' · ')}</p>}
        <div className="flex flex-wrap gap-1.5">
          {item.theme && <span className="rounded-full bg-brand-orange-50 px-2.5 py-0.5 text-sm font-bold text-brand-orange-dark">{item.theme}</span>}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-sm text-slate-600">{item.slug}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={togglePublish} disabled={busy} className={smallBtn}>
            {item.is_published ? 'Unpublish' : 'Publish'}
          </button>
          <button type="button" onClick={() => setEditing(true)} className={smallBtn}>
            Edit
          </button>
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
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </div>
  )
}

export default function ManageEvents() {
  const { user, membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const allowed = can('events.bunfest.manage')

  const [items, setItems] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const { data, error } = await supabase
      .from('events')
      .select('id,slug,title,starts_at,ends_at,venue,address,city,summary,body,theme,image_url,url,is_published,sort_order')
      .eq('org_id', orgId)
      .order('starts_at', { ascending: false })
    if (error) {
      setError(errMessage(error))
      setLoading(false)
      return
    }
    setItems((data ?? []) as EventRow[])
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    load()
  }, [load])

  const create = async (d: Draft) => {
    const { error } = await supabase.from('events').insert({
      org_id: orgId,
      ...toRow(d),
      sort_order: items.length,
      created_by: userId,
    })
    if (error) throw error
    setCreating(false)
    await load()
  }

  // One click to seed the bundled BunFest record (the same one the site shows as its sample).
  const importSeed = async () => {
    setImporting(true)
    setError(null)
    const rows = sampleEvents.map((e, i) => ({
      org_id: orgId,
      slug: e.slug,
      title: e.title,
      starts_at: e.startsAt,
      ends_at: e.endsAt ?? null,
      venue: e.venue ?? null,
      address: e.address ?? null,
      city: e.city ?? null,
      summary: e.summary ?? null,
      body: e.body ?? null,
      theme: e.theme ?? null,
      url: e.url ?? null,
      is_published: true,
      sort_order: i,
      created_by: userId,
    }))
    const { error } = await supabase.from('events').insert(rows)
    if (error) setError(errMessage(error))
    setImporting(false)
    if (!error) await load()
  }

  if (!allowed) {
    return (
      <p className="text-slate-600">
        You don't have access to manage events. An owner or admin can grant the "Manage Midwest BunFest info" capability.
      </p>
    )
  }

  const upcoming = items.filter((e) => !isPast(e)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const past = items.filter((e) => isPast(e))

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Events</h1>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={btn.orange}>
            New event
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Shown on the website's Events page and the app's Events screen. The BunFest pages read their date, venue and
        theme from the <code>midwest-bunfest-2026</code> record.
      </p>

      {creating && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 font-display text-base font-extrabold text-ink">New event</p>
          <EventForm initial={emptyDraft} userId={userId} submitLabel="Add event" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card className="mt-6 space-y-3 text-center">
          <p className="text-base leading-relaxed text-slate-700">
            No events yet. Start from the bundled Midwest BunFest 2026 record, then edit it — or add your own with "New
            event".
          </p>
          <button type="button" onClick={importSeed} disabled={importing} className={`${btn.blue} disabled:opacity-60`}>
            {importing ? 'Adding…' : 'Add Midwest BunFest 2026'}
          </button>
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          <div>
            <h2 className="font-display text-lg font-extrabold text-ink">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">Nothing coming up. Add the next event with "New event".</p>
            ) : (
              <div className="mt-3 space-y-3">
                {upcoming.map((item) => (
                  <EventCard key={item.id} item={item} userId={userId} onChanged={load} />
                ))}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink">Past events</h2>
              <p className="mt-1 text-sm text-slate-600">These moved here on their own once they ended. They still show under Past events on the site.</p>
              <div className="mt-3 space-y-3">
                {past.map((item) => (
                  <EventCard key={item.id} item={item} userId={userId} onChanged={load} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
