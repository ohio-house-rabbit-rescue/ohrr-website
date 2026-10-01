// The orange "something's waiting" number on the staff dashboard, the group
// pages and the staff menu, and the words a screen reader hears instead.
const count = (n: number) => (n > 99 ? '99+' : String(n))

export function WaitingBadge({ n, className = '' }: { n: number; className?: string }) {
  if (n <= 0) return null
  return (
    <>
      <span
        aria-hidden="true"
        className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange px-1.5 text-xs font-black leading-none text-ink ${className}`}
      >
        {count(n)}
      </span>
      <span className="sr-only">, {n} waiting</span>
    </>
  )
}
