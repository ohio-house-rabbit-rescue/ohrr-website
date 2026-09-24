// Happy Tails pieces (website mirror of the app's tailbits.tsx, minus the
// account-free Follow button, which is an app feature).
import { TAIL_STATUS_CLASS } from '../data/tails'
import { TAIL_STATUS_LABEL, type TailStatus } from '../lib/tails'

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

// Life-stage status chip (Looking for a home / Just adopted / … / Forever loved).
export function StatusPill({ status, className = '' }: { status: TailStatus; className?: string }) {
  const cls = TAIL_STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${cls} ${className}`}>
      {TAIL_STATUS_LABEL[status] ?? status}
    </span>
  )
}
