// Staff → Wish list items (update 32, table `wish_list_items`): items from
// OHRR's Amazon wish list, each with its own Amazon link, shown on the Give page
// and the Hop Shop beside the "Open the Amazon Wish List" button. Amazon won't
// let a program read the list, so staff paste each link in. For staff with
// "giving.wishlist" (founders and developers already have it). Desktop mirror
// of the app's editor.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, ext, Card } from '../../components/ui'
import { AMAZON_WISH_LIST } from '../../lib/constants'
import { isMissingTable } from '../../lib/emailList'
import { WISH_LIST_COLUMNS, cleanAmazonUrl, isAmazonUrl, sortWishList, type WishListItem } from '../../lib/wishList'

interface Draft {
  name: string
  amazon_url: string
  note: string
  most_needed: boolean
  is_published: boolean
}
const empty: Draft = { name: '', amazon_url: '', note: '', most_needed: false, is_published: true }
const fromItem = (i: WishListItem): Draft => ({
  name: i.name,
  amazon_url: i.amazon_url,
  note: i.note ?? '',
  most_needed: i.most_needed,
  is_published: i.is_published,
})
const BAD_LINK = 'That doesn’t look like an Amazon link.'

/** "a.co/d/7xYz…" — enough to tell the links apart. */
function shortLink(url: string): string {
  const s = url.replace(/^https:\/\/(www\.)?/i, '')
  return s.length > 48 ? `${s.slice(0, 48)}…` : s
}

function ItemForm({ initial, submitLabel, onSubmit, onCancel }: { initial: Draft; submitLabel: string; onSubmit: (d: Draft) => Promise<void>; onCancel?: () => void }) {
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkTouched, setLinkTouched] = useState(false)
  const link = cleanAmazonUrl(d.amazon_url)
  const badLink = link !== '' && !isAmazonUrl(link)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLinkTouched(true)
    if (!d.name.trim() || !link || badLink) return
    setError(null)
    setBusy(true)
    try {
      await onSubmit({ ...d, amazon_url: link })
      setBusy(false)
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        What it is
        <input
          className={staffInput}
          required
          maxLength={160}
          value={d.name}
          placeholder="e.g. Timothy hay, 50 lb box"
          onChange={(e) => setD({ ...d, name: e.target.value })}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Amazon link
        <span className="block text-xs font-normal text-slate-500">
          On Amazon, open the item from OHRR’s list, tap Share → Copy link, and paste it here.
        </span>
        <input
          className={staffInput}
          required
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={d.amazon_url}
          placeholder="https://a.co/d/…"
          aria-invalid={linkTouched && badLink}
          onBlur={() => setLinkTouched(true)}
          onChange={(e) => setD({ ...d, amazon_url: e.target.value })}
        />
        {linkTouched && badLink && <span className="mt-1 block text-sm font-semibold text-red-600">{BAD_LINK}</span>}
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Note <span className="font-normal text-slate-500">(optional)</span>
        <input
          className={staffInput}
          maxLength={300}
          value={d.note}
          placeholder="e.g. We go through a box a week"
          onChange={(e) => setD({ ...d, note: e.target.value })}
        />
      </label>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-blue" checked={d.most_needed} onChange={(e) => setD({ ...d, most_needed: e.target.checked })} />
          Most needed
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-blue" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} />
          Show on the site
        </label>
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !d.name.trim() || !link} className={`${btn.orange} disabled:opacity-60`}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btn.outline}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default function WishList() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<WishListItem[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('wish_list_items').select(WISH_LIST_COLUMNS).eq('org_id', orgId)
    if (error) {
      // Only a missing table means update 32 hasn't run; a permission error is shown as it is.
      if (isMissingTable(error)) setMissing(true)
      else setError(errMessage(error))
      setRows([])
      return
    }
    setRows((data ?? []) as WishListItem[])
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
  }, [orgId, load])

  // The order the site shows them in: "Most needed" first, then the order set here.
  const list = useMemo(() => sortWishList(rows ?? []), [rows])

  if (!can('giving.wishlist')) return <p className="text-slate-600">You don’t have access to the wish list items.</p>

  const payload = (d: Draft) => ({
    name: d.name.trim().replace(/\s+/g, ' ').slice(0, 160),
    amazon_url: d.amazon_url,
    note: d.note.trim() || null,
    most_needed: d.most_needed,
    is_published: d.is_published,
  })
  // The database's own check on the link gets the same words as the form.
  const saveError = (e: { message: string }) => (/amazon_url/i.test(e.message) ? new Error(BAD_LINK) : e)

  const add = async (d: Draft) => {
    setMsg(null)
    const next = (rows ?? []).reduce((m, i) => Math.max(m, i.sort_order), 0) + 10
    const { error } = await supabase
      .from('wish_list_items')
      .insert({ org_id: orgId, sort_order: next, created_by: user?.id ?? null, ...payload(d) })
    if (error) throw saveError(error)
    setFormKey((k) => k + 1)
    await load()
    setMsg(`Added ${payload(d).name}.`)
  }
  const saveEdit = (id: string) => async (d: Draft) => {
    setMsg(null)
    const { error } = await supabase.from('wish_list_items').update(payload(d)).eq('id', id)
    if (error) throw saveError(error)
    setEditingId(null)
    await load()
    setMsg('Saved.')
  }
  const remove = async (i: WishListItem) => {
    if (!window.confirm(`Take “${i.name}” off the wish list? This doesn’t change OHRR’s list on Amazon.`)) return
    setBusy(true)
    setError(null)
    setMsg(null)
    const { error } = await supabase.from('wish_list_items').delete().eq('id', i.id)
    if (error) setError(errMessage(error))
    else {
      await load()
      setMsg(`Removed ${i.name}.`)
    }
    setBusy(false)
  }
  // Up / down swaps with the neighbour, then numbers the list afresh (10, 20, …)
  // and saves the ones that changed.
  const move = async (index: number, by: -1 | 1) => {
    const order = [...list]
    const [item] = order.splice(index, 1)
    order.splice(index + by, 0, item)
    const changed = order.map((i, n) => ({ id: i.id, sort_order: (n + 1) * 10, was: i.sort_order })).filter((i) => i.sort_order !== i.was)
    setBusy(true)
    setError(null)
    setMsg(null)
    const results = await Promise.all(changed.map((c) => supabase.from('wish_list_items').update({ sort_order: c.sort_order }).eq('id', c.id)))
    const failed = results.find((r) => r.error)
    if (failed) setError(errMessage(failed.error))
    await load()
    setBusy(false)
  }

  const hidden = list.filter((i) => !i.is_published).length

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Wish list items</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Items from{' '}
        <a href={AMAZON_WISH_LIST} {...ext} className="font-semibold text-brand-blue underline underline-offset-2">
          OHRR’s Amazon Wish List
        </a>
        , each with its own “Buy on Amazon” button. They show on{' '}
        <Link to="/give#shop" className="font-semibold text-brand-blue underline underline-offset-2">
          the Give page
        </Link>{' '}
        and the Hop Shop page (the first three there), and in the app, “Most needed” first. The button for the whole list
        stays.
      </p>

      {missing && (
        <Card className="mt-5 border-amber-200 bg-amber-50">
          <p className="text-sm text-slate-700">
            Wish list items switch on with <strong>update 32</strong> (RUN-THIS-IN-SUPABASE.sql in the Drive). Until then the
            website shows only the button for the whole Amazon Wish List.
          </p>
        </Card>
      )}

      {rows === null && !error && <Spinner />}
      {rows && !missing && (
        <div className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="!p-0">
            <div className="border-b border-slate-100 px-5 py-3">
              <p className="font-display text-lg font-extrabold text-ink">
                {list.length} {list.length === 1 ? 'item' : 'items'}
                {hidden > 0 && <span className="ml-2 text-sm font-semibold text-slate-500">({hidden} hidden)</span>}
              </p>
            </div>
            {list.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600">No items yet. Until there are, the site shows only the button for the whole list.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {list.map((i, n) => {
                  // Moving stays within "Most needed" or the rest, as the site orders them.
                  const canUp = n > 0 && list[n - 1].most_needed === i.most_needed
                  const canDown = n < list.length - 1 && list[n + 1].most_needed === i.most_needed
                  return editingId === i.id ? (
                    <li key={i.id} className="px-5 py-4">
                      <ItemForm initial={fromItem(i)} submitLabel="Save" onSubmit={saveEdit(i.id)} onCancel={() => setEditingId(null)} />
                    </li>
                  ) : (
                    <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          disabled={busy || !canUp}
                          onClick={() => void move(n, -1)}
                          aria-label={`Move ${i.name} up`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-base font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={busy || !canDown}
                          onClick={() => void move(n, 1)}
                          aria-label={`Move ${i.name} down`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-base font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold ${i.is_published ? 'text-ink' : 'text-slate-400'}`}>{i.name}</span>
                          {i.most_needed && <span className="rounded-full bg-brand-orange-50 px-2 py-0.5 text-xs font-bold text-brand-orange-ink">Most needed</span>}
                          {!i.is_published && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Hidden</span>}
                        </div>
                        {i.note && <p className="mt-0.5 text-sm text-slate-600">{i.note}</p>}
                        <a href={i.amazon_url} {...ext} className="mt-0.5 inline-block break-all text-sm text-brand-blue underline underline-offset-2">
                          {shortLink(i.amazon_url)}
                        </a>
                        <span className="mt-1 flex gap-4 text-sm font-bold">
                          <button type="button" className="text-brand-blue" onClick={() => setEditingId(i.id)}>
                            Edit
                          </button>
                          <button type="button" className="text-red-600" disabled={busy} onClick={() => void remove(i)}>
                            Remove
                          </button>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card className="self-start">
            <p className="mb-3 font-display text-lg font-extrabold text-ink">Add an item</p>
            <ItemForm key={formKey} initial={empty} submitLabel="Add" onSubmit={add} />
          </Card>
        </div>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {msg && <p className="mt-4 text-sm font-semibold text-green-700">{msg}</p>}
    </div>
  )
}
