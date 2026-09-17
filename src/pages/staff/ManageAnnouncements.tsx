import { useCallback, useEffect, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { isMissingImageColumn } from '../../lib/data'
import { uploadSiteImage } from '../../lib/images'
import { btn } from '../../components/ui'

interface Ann {
  id: string
  title: string
  body: string
  is_published: boolean
  updated_at: string
  image_url?: string | null
}

interface Draft {
  title: string
  body: string
  is_published: boolean
  image_url: string
}

const empty: Draft = { title: '', body: '', is_published: true, image_url: '' }

const ANN_COLUMNS = 'id,title,body,is_published,updated_at'

// Shown while the shared Supabase project doesn't have the `image_url` column yet
// (migration 20260917160000_announcements_image.sql in the app repo).
const IMAGE_COLUMN_NOTE = 'Photo attachments need the latest database update — ask the owner to apply it.'

type WriteResult = PromiseLike<{ error: { message?: string } | null }>

// The homepage manager's uploader, plus a client-side downscale (max 1600px) so a phone
// photo uploads quickly. Stores the public URL of the `site-images` object.
function PhotoField({
  url,
  userId,
  disabled,
  onChange,
  onBusy,
}: {
  url: string
  userId: string
  disabled: boolean
  onChange: (u: string) => void
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
      <span className="text-sm font-semibold text-slate-700">Photo (optional)</span>
      {url && (
        <div className="relative mt-1.5 inline-block">
          <img src={url} alt="" className="h-24 w-32 rounded-xl object-cover ring-1 ring-slate-200" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove photo"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
          >
            ×
          </button>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label
          className={`inline-block cursor-pointer rounded-full border border-slate-200 px-3.5 py-2 text-sm font-bold text-brand-blue hover:bg-slate-50 ${busy || disabled ? 'opacity-60' : ''}`}
        >
          {busy ? 'Uploading…' : url ? 'Replace photo' : 'Add a photo'}
          <input type="file" accept="image/*" disabled={busy || disabled} className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
      {disabled && <p className="mt-1 text-xs font-semibold text-amber-600">{IMAGE_COLUMN_NOTE}</p>}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function Form({
  initial,
  userId,
  imagesSupported,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  userId: string
  imagesSupported: boolean
  submitLabel: string
  onSubmit: (d: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
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
      <label className="block text-sm font-semibold text-slate-700">
        Title
        <input className={staffInput} required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Closed this Saturday" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Message
        <textarea className={staffInput} rows={3} required value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
      </label>
      <PhotoField
        url={d.image_url}
        userId={userId}
        disabled={!imagesSupported}
        onChange={(u) => setD((prev) => ({ ...prev, image_url: u }))}
        onBusy={setPhotoBusy}
      />
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} />
        Show on the site now (uncheck for a draft)
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || photoBusy || !d.title.trim() || !d.body.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ManageAnnouncements() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const allowed = can('announcements.post')

  const [items, setItems] = useState<Ann[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // False once Supabase says the `image_url` column doesn't exist yet.
  const [imagesSupported, setImagesSupported] = useState(true)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const query = (columns: string) =>
      supabase.from('announcements').select(columns).eq('org_id', orgId).order('created_at', { ascending: false })
    let res: { data: unknown; error: { message?: string } | null } = await query(`${ANN_COLUMNS},image_url`)
    if (res.error && isMissingImageColumn(res.error)) {
      setImagesSupported(false)
      res = await query(ANN_COLUMNS)
    }
    if (res.error) setError(errMessage(res.error))
    else setItems((res.data ?? []) as Ann[])
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    load()
  }, [load])

  // Writes `image_url` only while the column exists. If the save is rejected because it
  // doesn't (migration not applied yet), save without the photo and show the note.
  const write = async (run: (payload: Record<string, unknown>) => WriteResult, d: Draft) => {
    const base = { title: d.title.trim(), body: d.body.trim(), is_published: d.is_published }
    if (imagesSupported) {
      const { error } = await run({ ...base, image_url: d.image_url.trim() || null })
      if (!error) return
      if (!isMissingImageColumn(error)) throw error
      setImagesSupported(false)
    }
    const { error } = await run(base)
    if (error) throw error
  }
  const create = async (d: Draft) => {
    await write((p) => supabase.from('announcements').insert({ org_id: orgId, created_by: userId, ...p }), d)
    setCreating(false)
    await load()
  }
  const saveEdit = (id: string) => async (d: Draft) => {
    await write((p) => supabase.from('announcements').update(p).eq('id', id), d)
    setEditingId(null)
    await load()
  }
  const remove = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) setError(errMessage(error))
    else await load()
  }
  const togglePublish = async (a: Ann) => {
    const { error } = await supabase.from('announcements').update({ is_published: !a.is_published }).eq('id', a.id)
    if (error) setError(errMessage(error))
    else await load()
  }

  if (!allowed)
    return <p className="text-slate-600">You don't have access to post announcements.</p>

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Announcements</h1>
        {!creating && (
          <button onClick={() => setCreating(true)} className={btn.orange}>New announcement</button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">These show on the website home and the app. Add a photo — people look at images first.</p>
      {!imagesSupported && <p className="mt-2 text-sm font-semibold text-amber-600">{IMAGE_COLUMN_NOTE}</p>}

      {creating && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Form initial={empty} userId={userId} imagesSupported={imagesSupported} submitLabel="Post" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="mt-6 text-slate-600">No announcements yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((a) =>
            editingId === a.id ? (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Form
                  initial={{ title: a.title, body: a.body, is_published: a.is_published, image_url: a.image_url ?? '' }}
                  userId={userId}
                  imagesSupported={imagesSupported}
                  submitLabel="Save"
                  onSubmit={saveEdit(a.id)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={a.id} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                {a.image_url && (
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                    <img src={a.image_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-extrabold text-ink">{a.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${a.is_published ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-500'}`}>
                      {a.is_published ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{a.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => togglePublish(a)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                      {a.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => setEditingId(a.id)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                      Edit
                    </button>
                    <button onClick={() => remove(a.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
