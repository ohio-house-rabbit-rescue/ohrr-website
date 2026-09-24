// Small pieces the volunteer-call and bookings screens share.
import type { ReactNode } from 'react'
import { staffInput } from '../../lib/staff'
import { APPROVAL_KINDS, kindLabel } from '../../lib/volunteers/approval'

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{children}</p>
}

export function Badge({ tone, children }: { tone: 'blue' | 'orange' | 'slate'; children: ReactNode }) {
  const c = tone === 'blue' ? 'bg-brand-blue-50 text-brand-blue' : tone === 'orange' ? 'bg-brand-orange-50 text-brand-orange-dark' : 'bg-slate-100 text-slate-600'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${c}`}>{children}</span>
}

/**
 * Who can sign up: anyone, or only volunteers approved for one kind of
 * volunteering (update 25). `value` is the kind, or null for anyone.
 */
export function WhoCanSignUp({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const known = APPROVAL_KINDS.some((k) => k.value === value)
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select className={staffInput} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Anyone</option>
        {APPROVAL_KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            Approved volunteers — {k.label}
          </option>
        ))}
        {value && !known && <option value={value}>Approved volunteers — {value}</option>}
      </select>
      <span className="mt-1 block text-xs font-normal text-slate-500">
        {value
          ? `Only people approved for ${kindLabel(value)} (or for everything) can sign up, using the email they applied with.`
          : 'Anyone can sign up — no approval needed.'}
      </span>
    </label>
  )
}
