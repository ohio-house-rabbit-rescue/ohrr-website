import { useCallback, useEffect, useState } from 'react'
import { supabase, errMessage } from '../../lib/supabase'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'

interface Article {
  id: string
  section?: Section
  slug: string
  title: string
  summary: string
  body: string
  tip: string | null
  is_published: boolean
  sort_order: number
}

type Section = 'care' | 'give' | 'about' | 'adopt'
const SECTIONS: { value: Section; label: string }[] = [
  { value: 'care', label: 'Care guide (Learn)' },
  { value: 'give', label: 'Give page' },
  { value: 'adopt', label: 'Adopt page' },
  { value: 'about', label: 'About page' },
]

interface Draft {
  section: Section
  slug: string
  title: string
  summary: string
  body: string
  tip: string
  is_published: boolean
}

const empty: Draft = { section: 'care', slug: '', title: '', summary: '', body: '', tip: '', is_published: true }

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

function Form({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  submitLabel: string
  onSubmit: (d: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [d, setD] = useState<Draft>(initial)
  const [touchedSlug, setTouchedSlug] = useState(initial.slug !== '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit({ ...d, slug: (d.slug || slugify(d.title)) })
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        Where it shows
        <select className={staffInput} value={d.section} onChange={(e) => setD({ ...d, section: e.target.value as Section })}>
          {SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Title
        <input
          className={staffInput}
          required
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value, slug: touchedSlug ? d.slug : slugify(e.target.value) })}
          placeholder="e.g. Rabbit-safe diet"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Web address piece (slug)
        <input
          className={`${staffInput} font-mono`}
          value={d.slug}
          onChange={(e) => { setTouchedSlug(true); setD({ ...d, slug: slugify(e.target.value) }) }}
          placeholder="rabbit-safe-diet"
        />
        <span className="mt-1 block text-xs font-normal text-slate-400">Shows at /learn/{d.slug || slugify(d.title) || '…'}</span>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Summary
        <input className={staffInput} value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} placeholder="One line shown on the Learn page" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Guide
        <textarea className={staffInput} rows={8} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} placeholder={'Write in paragraphs.\n\n## Headings start with two hashes\n- Bullet lines start with a dash'} />
        <span className="mt-1 block text-xs font-normal text-slate-400">Blank line = new paragraph · <code>## </code> = heading · <code>- </code> = bullet</span>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Quick tip (optional)
        <input className={staffInput} value={d.tip} onChange={(e) => setD({ ...d, tip: e.target.value })} placeholder="A one-line highlight" />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-blue" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} />
        Show on the site now (uncheck for a draft)
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !d.title.trim() || !d.body.trim()} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ManageCare() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const allowed = can('content.education.edit')

  const [items, setItems] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId || !allowed) {
      setLoading(false)
      return
    }
    setError(null)
    const { data, error } = await supabase
      .from('care_articles')
      .select('id,slug,title,summary,body,tip,is_published,sort_order,section')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
    if (error) setError(errMessage(error))
    else setItems((data ?? []) as Article[])
    setLoading(false)
  }, [orgId, allowed])

  useEffect(() => {
    load()
  }, [load])

  const toRow = (d: Draft) => ({
    section: d.section,
    slug: d.slug,
    title: d.title.trim(),
    summary: d.summary.trim(),
    body: d.body.trim(),
    tip: d.tip.trim() || null,
    is_published: d.is_published,
  })

  const create = async (d: Draft) => {
    const { error } = await supabase.from('care_articles').insert({ org_id: orgId, created_by: userId, ...toRow(d) })
    if (error) throw error
    setCreating(false)
    await load()
  }
  const saveEdit = (id: string) => async (d: Draft) => {
    const { error } = await supabase.from('care_articles').update(toRow(d)).eq('id', id)
    if (error) throw error
    setEditingId(null)
    await load()
  }
  const remove = async (id: string) => {
    const { error } = await supabase.from('care_articles').delete().eq('id', id)
    if (error) setError(errMessage(error))
    else await load()
  }
  const togglePublish = async (a: Article) => {
    const { error } = await supabase.from('care_articles').update({ is_published: !a.is_published }).eq('id', a.id)
    if (error) setError(errMessage(error))
    else await load()
  }

  if (!allowed) return <p className="text-slate-600">You don't have access to edit care guides.</p>

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Care guides &amp; pages</h1>
        {!creating && <button onClick={() => setCreating(true)} className={btn.orange}>New guide</button>}
      </div>
      <p className="mt-1 text-sm text-slate-600">The Rabbit Care articles in Learn, plus the Give / Adopt / About pages — on the website and the app.</p>

      {creating && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Form initial={empty} submitLabel="Publish guide" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="mt-6 text-slate-600">No care guides yet. The website falls back to the built-in guides until you add some.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((a) =>
            editingId === a.id ? (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Form
                  initial={{ section: a.section ?? 'care', slug: a.slug, title: a.title, summary: a.summary, body: a.body, tip: a.tip ?? '', is_published: a.is_published }}
                  submitLabel="Save"
                  onSubmit={saveEdit(a.id)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={a.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-extrabold text-ink">{a.title}</h3>
                    <code className="text-[11px] text-slate-400">{(a.section ?? 'care') === 'care' ? '/learn/' : '/info/'}{a.slug}</code>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${a.is_published ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-500'}`}>
                    {a.is_published ? 'Live' : 'Draft'}
                  </span>
                </div>
                {a.summary && <p className="mt-1 text-sm text-slate-600">{a.summary}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => togglePublish(a)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    {a.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => setEditingId(a.id)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                  <button onClick={() => remove(a.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
