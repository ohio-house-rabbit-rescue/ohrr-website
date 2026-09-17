import { useCallback, useEffect, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { slideVisual } from '../../data/heroSlides'

// Home-page hero slides + featured cards (shared `hero_slides` table — the app's home
// screen reads the same rows). Follows the Announcements manager pattern.

type Placement = 'hero' | 'featured'

interface Row {
  id: string
  placement: Placement
  headline: string
  subline: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  starts_at: string | null
  ends_at: string | null
  is_published: boolean
  sort_order: number
}

interface Draft {
  placement: Placement
  headline: string
  subline: string
  image_url: string
  cta_label: string
  cta_url: string
  starts_at: string // datetime-local value or ''
  ends_at: string
  is_published: boolean
  sort_order: number
}

const empty: Draft = {
  placement: 'hero',
  headline: '',
  subline: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  starts_at: '',
  ends_at: '',
  is_published: true,
  sort_order: 0,
}

// ISO (UTC) <-> the browser's datetime-local value (local time, no seconds).
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function toIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function fromRow(r: Row): Draft {
  return {
    placement: r.placement,
    headline: r.headline,
    subline: r.subline ?? '',
    image_url: r.image_url ?? '',
    cta_label: r.cta_label ?? '',
    cta_url: r.cta_url ?? '',
    starts_at: toLocalInput(r.starts_at),
    ends_at: toLocalInput(r.ends_at),
    is_published: r.is_published,
    sort_order: r.sort_order,
  }
}

function toRow(d: Draft) {
  return {
    placement: d.placement,
    headline: d.headline.trim(),
    subline: d.subline.trim() || null,
    image_url: d.image_url.trim() || null,
    cta_label: d.cta_label.trim() || null,
    cta_url: d.cta_url.trim() || null,
    starts_at: toIso(d.starts_at),
    ends_at: toIso(d.ends_at),
    is_published: d.is_published,
    sort_order: Number.isFinite(d.sort_order) ? d.sort_order : 0,
  }
}

async function uploadImage(file: File, userId: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('site-images').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl
}

function ImageUploader({ url, userId, onChange }: { url: string; userId: string; onChange: (u: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onFiles = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadImage(f, userId))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <span className="text-sm font-semibold text-slate-700">Image (a real photo)</span>
      <p className="mt-0.5 text-xs text-slate-500">
        Leave the image empty to show the standard icon for this link; upload a photo only for real content.
      </p>
      {url && (
        <div className="relative mt-1.5 inline-block">
          <img src={url} alt="" className="h-24 w-32 rounded-xl object-cover ring-1 ring-slate-200" />
          <button type="button" onClick={() => onChange('')} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
            ×
          </button>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className={`inline-block cursor-pointer rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-brand-blue hover:bg-slate-50 ${busy ? 'opacity-60' : ''}`}>
          {busy ? 'Uploading…' : url ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </label>
        <input className={`${staffInput} !mt-0 max-w-xs`} value={url} onChange={(e) => onChange(e.target.value)} placeholder="or paste an image URL (e.g. /img/bunny-silver.jpg)" />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function Form({ initial, userId, submitLabel, onSubmit, onCancel }: { initial: Draft; userId: string; submitLabel: string; onSubmit: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(d)
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Placement
          <select className={staffInput} value={d.placement} onChange={(e) => setD({ ...d, placement: e.target.value as Placement })}>
            <option value="hero">Hero (big slide at the top — up to 3 shown)</option>
            <option value="featured">Featured card (strip under the hero — up to 4 shown)</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Sort order (higher shows first)
          <input className={staffInput} type="number" value={d.sort_order} onChange={(e) => setD({ ...d, sort_order: Number(e.target.value) })} />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Headline
        <input className={staffInput} required value={d.headline} onChange={(e) => setD({ ...d, headline: e.target.value })} placeholder="e.g. Midwest BunFest 2026 — Binky On!" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Subline (one sentence)
        <textarea className={staffInput} rows={2} value={d.subline} onChange={(e) => setD({ ...d, subline: e.target.value })} />
      </label>
      <ImageUploader url={d.image_url} userId={userId} onChange={(u) => setD({ ...d, image_url: u })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Button label
          <input className={staffInput} value={d.cta_label} onChange={(e) => setD({ ...d, cta_label: e.target.value })} placeholder="e.g. About Midwest BunFest" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Button link
          <input className={staffInput} value={d.cta_url} onChange={(e) => setD({ ...d, cta_url: e.target.value })} placeholder="/bunfest or https://…" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Show from (optional)
          <input className={staffInput} type="datetime-local" value={d.starts_at} onChange={(e) => setD({ ...d, starts_at: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Show until (optional)
          <input className={staffInput} type="datetime-local" value={d.ends_at} onChange={(e) => setD({ ...d, ends_at: e.target.value })} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} />
        Show on the site now (uncheck for a draft)
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !d.headline.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

// What the site will show in the card's picture slot: the uploaded image, a rabbit
// photo for an adopt link, otherwise the standard icon for the link.
function RowPreview({ r }: { r: Row }) {
  const v = slideVisual({ imageUrl: r.image_url, ctaUrl: r.cta_url })
  if (!v) return null
  if ('image' in v) return <img src={v.image} alt="" className="h-full w-full object-cover" />
  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-blue-50 text-brand-blue">
      <Icon name={v.icon} size={30} />
    </div>
  )
}

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
}

export default function ManageHero() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const allowed = can('announcements.post')

  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<Placement | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const { data, error } = await supabase
      .from('hero_slides')
      .select('id,placement,headline,subline,image_url,cta_label,cta_url,starts_at,ends_at,is_published,sort_order')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: false })
    if (error) setError(errMessage(error))
    else setItems((data ?? []) as Row[])
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    load()
  }, [load])

  const create = async (d: Draft) => {
    const { error } = await supabase.from('hero_slides').insert({ org_id: orgId, ...toRow(d) })
    if (error) throw error
    setCreating(null)
    await load()
  }
  const saveEdit = (id: string) => async (d: Draft) => {
    const { error } = await supabase.from('hero_slides').update(toRow(d)).eq('id', id)
    if (error) throw error
    setEditingId(null)
    await load()
  }
  const remove = async (id: string) => {
    const { error } = await supabase.from('hero_slides').delete().eq('id', id)
    if (error) setError(errMessage(error))
    else await load()
  }
  const togglePublish = async (r: Row) => {
    const { error } = await supabase.from('hero_slides').update({ is_published: !r.is_published }).eq('id', r.id)
    if (error) setError(errMessage(error))
    else await load()
  }

  if (!allowed) return <p className="text-slate-600">You don't have access to manage the homepage.</p>

  const groups: { key: Placement; title: string; hint: string }[] = [
    { key: 'hero', title: 'Hero slides', hint: 'The big slide at the top of the home page. Up to 3 are shown, highest sort order first.' },
    { key: 'featured', title: 'Featured cards', hint: 'The strip of cards under the hero. Up to 4 are shown, highest sort order first.' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Homepage features</h1>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        The hero slides and featured cards on the website home page. <strong>Also drives the app's home screen.</strong> Until
        you add any, both show the built-in defaults.
      </p>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner />
      ) : (
        groups.map((g) => {
          const rows = items.filter((r) => r.placement === g.key)
          return (
            <section key={g.key} className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-ink">{g.title}</h2>
                  <p className="text-sm text-slate-600">{g.hint}</p>
                </div>
                {creating !== g.key && (
                  <button onClick={() => { setCreating(g.key); setEditingId(null) }} className={btn.orange}>
                    New {g.key === 'hero' ? 'slide' : 'card'}
                  </button>
                )}
              </div>

              {creating === g.key && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Form initial={{ ...empty, placement: g.key }} userId={userId} submitLabel="Add" onSubmit={create} onCancel={() => setCreating(null)} />
                </div>
              )}

              {rows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">None yet — the built-in default is showing.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {rows.map((r) =>
                    editingId === r.id ? (
                      <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <Form initial={fromRow(r)} userId={userId} submitLabel="Save" onSubmit={saveEdit(r.id)} onCancel={() => setEditingId(null)} />
                      </div>
                    ) : (
                      <div key={r.id} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                          <RowPreview r={r} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-base font-extrabold text-ink">{r.headline}</h3>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${r.is_published ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-500'}`}>
                              {r.is_published ? 'Live' : 'Draft'}
                            </span>
                          </div>
                          {r.subline && <p className="mt-1 text-sm text-slate-600">{r.subline}</p>}
                          <p className="mt-1 text-xs text-slate-400">
                            Sort {r.sort_order}
                            {r.cta_label && r.cta_url ? ` · Button "${r.cta_label}" → ${r.cta_url}` : ''}
                            {r.starts_at ? ` · from ${fmt(r.starts_at)}` : ''}
                            {r.ends_at ? ` · until ${fmt(r.ends_at)}` : ''}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={() => togglePublish(r)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                              {r.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => { setEditingId(r.id); setCreating(null) }} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                              Edit
                            </button>
                            <button onClick={() => remove(r.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
