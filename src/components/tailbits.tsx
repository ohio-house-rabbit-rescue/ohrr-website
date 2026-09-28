// Happy Tails pieces (website mirror of the app's tailbits.tsx, minus the
// account-free Follow button, which is an app feature).
import type { ReactNode } from 'react'
import { TAIL_STATUS_CLASS } from '../data/tails'
import { TAIL_STATUS_LABEL, type TailStatus } from '../lib/tails'

/** "With the Patel family", whether staff typed "Patel" or "Patel family". */
export function withFamily(name: string): string {
  const n = name.trim().replace(/^the\s+/i, '')
  return /\bfamily$/i.test(n) ? `With the ${n}` : `With the ${n} family`
}

// Bunny photo with a friendly, on-brand placeholder (tinted deterministically
// from the name) for stories that don't have a photo yet.
export function BunnyPhoto({ name, photo, className = '' }: { name: string; photo?: string; className?: string }) {
  if (photo) {
    return <img src={photo} alt={name} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  }
  let hue = 0
  for (let i = 0; i < name.length; i++) hue = (hue * 31 + name.charCodeAt(i)) % 360
  const background = `linear-gradient(135deg, hsl(${hue} 68% 90%), hsl(${(hue + 38) % 360} 72% 82%))`
  return (
    <div className={`flex h-full w-full items-center justify-center ${className}`} style={{ background }} role="img" aria-label={name}>
      <img src="/img/ohrr-mark.png" alt="" className="h-16 w-16 object-contain drop-shadow-sm" />
    </div>
  )
}

// "Example" chip for the built-in example story (data/tails.ts) — amber, like the
// sample-entries dot, so it never reads as a real adoption.
export function ExampleBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900 ${className}`}>
      Example
    </span>
  )
}

// The quiet note under the example (LiveNote's look, with the example's words).
export function ExampleNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`mt-3 flex items-start gap-1.5 text-sm font-semibold text-slate-600 ${className}`}>
      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
      <span>{children}</span>
    </p>
  )
}

// Life-stage status chip (Looking for a home / Just adopted / … / Forever loved).
export function StatusPill({ status, className = '' }: { status: TailStatus; className?: string }) {
  const cls = TAIL_STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${cls} ${className}`}>
      {TAIL_STATUS_LABEL[status] ?? status}
    </span>
  )
}
