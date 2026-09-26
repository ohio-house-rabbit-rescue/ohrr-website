// The email tick boxes and the consent line under them — the sign-up form and
// the email-choices page (/emails/<token>) show the same six, the same way.
import { INTERESTS, CONSENT_LINE, cleanInterests, type Interest } from '../lib/emailList'

export default function InterestPicker({
  value,
  onChange,
  disabled = false,
  legend = 'What would you like to hear about?',
}: {
  value: Interest[]
  onChange: (next: Interest[]) => void
  disabled?: boolean
  legend?: string
}) {
  const toggle = (k: Interest, on: boolean) => onChange(cleanInterests(on ? [...value, k] : value.filter((x) => x !== k)))
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-semibold text-slate-700">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {INTERESTS.map((i) => (
          <label
            key={i.key}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-ink has-[:checked]:border-brand-blue/50 has-[:checked]:bg-brand-blue-50/60"
          >
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-brand-blue" checked={value.includes(i.key)} onChange={(e) => toggle(i.key, e.target.checked)} />
            {i.label}
          </label>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-600">{CONSENT_LINE}</p>
    </fieldset>
  )
}
