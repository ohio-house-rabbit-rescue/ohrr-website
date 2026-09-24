// "Tell me when there's a time" — the way out of a dead end, when OHRR hasn't
// published times for something yet (the mobile vet clinic waits for its
// dates). The name and email reach the staff Inbox, so OHRR has a list to
// write to the day the dates are set. Same as the app's NotifyMe.
import { useState, type FormEvent } from 'react'
import { btn } from './ui'
import { Icon } from './icons'
import { inputClass } from './SchemaForm'
import { submitRequest } from '../lib/requests'

export default function NotifyMe({ what, label, className = '' }: { what: string; label: string; className?: string }) {
  const [form, setForm] = useState({ name: '', email: '', notes: '', 'bot-field': '' })
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      await submitRequest('notify-me', { ...form, what: label, slug: what })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that right now.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className={`rounded-2xl border border-green-200 bg-green-50 p-4 text-base text-slate-700 ${className}`}>
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <Icon name="check" size={20} className="text-green-700" /> You’re on the list
        </p>
        <p className="mt-1">OHRR will email you as soon as {label.toLowerCase()} dates are set.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <p className="font-display text-lg font-extrabold text-ink">Tell me when there are dates</p>
      <p className="mt-0.5 text-sm text-slate-600">Leave your name and email and OHRR will let you know.</p>
      <div className="mt-3 grid gap-3">
        <label className="block text-sm font-semibold text-slate-700">
          Your name
          <input className={inputClass} required value={form.name} onChange={set('name')} autoComplete="name" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className={inputClass} type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Anything we should know? (optional)
          <input className={inputClass} value={form.notes} onChange={set('notes')} placeholder="Two rabbits, both need nail trims" />
        </label>
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form['bot-field']} onChange={set('bot-field')} />
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={status === 'busy'} className={`${btn.blue} mt-3 w-full disabled:opacity-60`}>
        {status === 'busy' ? 'Sending…' : 'Tell me'}
      </button>
    </form>
  )
}
