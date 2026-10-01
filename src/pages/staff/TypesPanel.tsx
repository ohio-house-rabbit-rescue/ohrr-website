// Hop Shop → Types (website copy of the app's src/features/hopshop/TypesPanel.tsx
// — keep them in sync): the three letters that start every SKU. HAY-101-001 is
// Hay, from vendor 101, that vendor's first hay item. A type can be renamed any
// time; its letters can change only while no item uses it, so a printed label
// never stops matching. Product types are update 41's `product_types`.
import { useState, type FormEvent, type ReactNode } from 'react'
import { errMessage } from '../../lib/supabase'
import { staffInput } from '../../lib/staff'
import { btn, Card } from '../../components/ui'
import { Icon } from '../../components/icons'
import { deleteType, saveType, suggestTypeCode, type ProductType } from '../../lib/hopshop'

const letters = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)

function FormError({ children }: { children?: ReactNode }) {
  return children ? (
    <p className="text-sm font-semibold text-red-600" role="alert">
      {children}
    </p>
  ) : null
}

/** Name → suggested letters (until the person types their own) → Add. Also used inside the product form. */
export function NewTypeForm({
  orgId,
  types,
  onAdded,
  onCancel,
}: {
  orgId: string
  types: ProductType[]
  onAdded: (t: ProductType) => void | Promise<void>
  onCancel?: () => void
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [ownCode, setOwnCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taken = types.map((t) => t.code)
  const shownCode = ownCode ? code : suggestTypeCode(name, taken)

  const add = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the type a name.')
    if (shownCode.length !== 3) return setError('The code is three letters, like HAY.')
    setBusy(true)
    try {
      const t = await saveType(orgId, { id: null, name: name.trim(), code: shownCode, is_active: true })
      setName('')
      setCode('')
      setOwnCode(false)
      await onAdded(t)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="block text-sm font-semibold text-slate-700">
          New type
          <input
            className={staffInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Inside the product form, Enter adds the type rather than saving the item.
              if (e.key === 'Enter') {
                e.preventDefault()
                void add()
              }
            }}
            placeholder="Bedding"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Letters
          <input
            className={`${staffInput} font-mono uppercase`}
            value={shownCode}
            onChange={(e) => {
              setOwnCode(true)
              setCode(letters(e.target.value))
            }}
            placeholder="BED"
            autoCapitalize="characters"
            aria-label="Three letters for the SKU"
          />
        </label>
      </div>
      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void add()} disabled={busy} className={`${btn.blue} disabled:opacity-60`}>
          <Icon name="plus" size={16} /> {busy ? 'Adding…' : 'Add the type'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export function TypesPanel({
  orgId,
  types,
  canWrite,
  onChanged,
}: {
  orgId: string
  types: ProductType[]
  canWrite: boolean
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <p className="text-base text-slate-600">
        Every Hop Shop SKU starts with its type’s three letters, then the supplier’s vendor number, then the item number:{' '}
        <span className="font-mono font-bold text-ink">HAY-101-001</span> is Hay from vendor 101. Vendor <span className="font-mono font-bold">000</span> means
        no supplier — donated, or made by OHRR.
      </p>
      <ul className="grid gap-2 md:grid-cols-2">
        {types.map((t) =>
          editing === t.id ? (
            <li key={t.id} className="md:col-span-2">
              <TypeEditor
                orgId={orgId}
                t={t}
                onDone={async () => {
                  setEditing(null)
                  await onChanged()
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <span className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 font-mono text-base font-black text-brand-blue">{t.code}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-display text-base font-extrabold text-ink">{t.name}</span>
                  {!t.is_active && <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Hidden</span>}
                </span>
                <span className="block text-sm text-slate-500">{t.items === 0 ? 'No items yet' : `${t.items} item${t.items === 1 ? '' : 's'}`}</span>
              </span>
              {canWrite && (
                <button type="button" onClick={() => setEditing(t.id)} className="min-h-11 shrink-0 px-2 text-sm font-bold text-brand-blue" aria-label={`Edit ${t.name}`}>
                  Edit
                </button>
              )}
            </li>
          ),
        )}
      </ul>
      {canWrite && (
        <Card>
          <NewTypeForm orgId={orgId} types={types} onAdded={() => onChanged()} />
        </Card>
      )}
    </div>
  )
}

function TypeEditor({ orgId, t, onDone, onCancel }: { orgId: string; t: ProductType; onDone: () => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(t.name)
  const [code, setCode] = useState(t.code)
  const [active, setActive] = useState(t.is_active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const used = t.items > 0

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    try {
      await fn()
      await onDone()
    } catch (err) {
      setError(errMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="block text-sm font-semibold text-slate-700">
          Name
          <input className={staffInput} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Letters
          <input
            className={`${staffInput} font-mono uppercase disabled:bg-slate-50 disabled:text-slate-500`}
            value={code}
            onChange={(e) => setCode(letters(e.target.value))}
            disabled={used}
            aria-label="Three letters for the SKU"
          />
        </label>
      </div>
      {used && <p className="text-sm text-slate-500">Items use {t.code}, so its letters stay. Renaming is fine.</p>}
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" className="h-5 w-5 rounded border-slate-300" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Offer it when adding items
      </label>
      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => saveType(orgId, { id: t.id, name: name.trim(), code, is_active: active }))}
          className={`${btn.orange} disabled:opacity-60`}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-500 hover:bg-slate-50">
          Cancel
        </button>
        {!used && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => deleteType(orgId, t.id))}
            className="ml-auto min-h-11 rounded-full border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </Card>
  )
}
