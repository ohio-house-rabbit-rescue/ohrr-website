// Two small pieces the volunteer-call screens share.
import type { ReactNode } from 'react'

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{children}</p>
}

export function Badge({ tone, children }: { tone: 'blue' | 'orange' | 'slate'; children: ReactNode }) {
  const c = tone === 'blue' ? 'bg-brand-blue-50 text-brand-blue' : tone === 'orange' ? 'bg-brand-orange-50 text-brand-orange-dark' : 'bg-slate-100 text-slate-600'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${c}`}>{children}</span>
}
