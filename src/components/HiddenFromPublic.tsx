// The note over a feature that is switched off in Staff → Features: visitors
// don't see it, signed-in staff do — so it can be got ready and checked before
// it goes live. Pages show it when useFeature(...).preview is true.
export default function HiddenFromPublic({ className = '' }: { className?: string }) {
  return (
    <p role="note" className={`rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-base font-semibold leading-relaxed text-amber-900 ${className}`}>
      Hidden from the public — only signed-in staff see this. A Founder or Developer can switch it on in Staff → Features.
    </p>
  )
}
