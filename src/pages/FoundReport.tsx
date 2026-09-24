// /found/report — tell OHRR about a rabbit found outdoors (website mirror of
// the app's FoundReport). A photo and a location, together, go straight into
// the staff Inbox as a 'found-rabbit' request with the same field names the
// app sends. OHRR is reached by email only; the emergency vet's number is theirs.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, Card, btn } from '../components/ui'
import { inputClass } from '../components/SchemaForm'
import PhotoField from '../components/PhotoField'
import FormDone from '../components/FormDone'
import HurtNote from '../components/HurtNote'
import { submitRequest } from '../lib/requests'
import { foundContacts } from '../data/found'

const CONDITION = [
  'Looks well — moving around normally',
  'Injured or bleeding',
  'Very thin, weak or not moving',
  'Being chased by a dog, cat or people',
  'Not sure',
]

export default function FoundReport() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    where: '',
    condition: '',
    description: '',
    contained: '',
    notes: '',
    photoUrl: '',
  })
  const [photoBusy, setPhotoBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    try {
      await submitRequest('found-rabbit', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        where: form.where,
        condition: form.condition,
        description: form.description,
        contained: form.contained,
        notes: form.notes,
        photo: form.photoUrl,
      })
      setStatus('done')
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that right now.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <>
        <PageHero title="Report sent" />
        <Section className="max-w-2xl space-y-4">
          <FormDone title={`Thank you, ${form.name || 'friend'}.`} to="/" label="Back home">
            OHRR has your report and will be in touch. OHRR is run by volunteers, so it may take a little while — the
            CHRS Help Line can help with strays too:{' '}
            <a href={`mailto:${foundContacts.chrsHelpLine}`} className="font-semibold text-brand-blue">
              {foundContacts.chrsHelpLine}
            </a>
          </FormDone>
          <Card>
            <p className="font-display text-lg font-extrabold text-ink">While you wait</p>
            <p className="mt-1 text-base leading-relaxed text-slate-700">
              Keep the rabbit contained and safe if you can do so without risk — a box or a carrier in a quiet, shaded
              spot, with water and greens.
            </p>
            <Link to="/found" className={`${btn.outline} mt-4`}>
              How to catch a stray rabbit safely
            </Link>
          </Card>
        </Section>
      </>
    )
  }

  return (
    <>
      <PageHero
        title="Report a found rabbit"
        subtitle="A photo and where you saw it are the two things that help most. It goes straight to OHRR."
      />
      <Section className="max-w-3xl">
        <p className="mb-5 text-sm">
          <Link to="/found" className="font-semibold text-brand-blue">
            ← What to do when you find a rabbit
          </Link>
        </p>
        <HurtNote className="mb-5" />

        <form onSubmit={submit}>
          <Card className="space-y-4">
            <PhotoField
              label="A photo of the rabbit"
              hint="Even a blurry one from a distance helps us tell a pet rabbit from a wild one."
              value={form.photoUrl}
              onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
              onBusyChange={setPhotoBusy}
            />

            <label className="block text-sm font-semibold text-slate-700">
              Where is it?
              <input className={inputClass} required value={form.where} onChange={set('where')} placeholder="Street and cross street, or a park / landmark" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                How does it look?
                <select className={inputClass} value={form.condition} onChange={set('condition')}>
                  <option value="">Choose one…</option>
                  {CONDITION.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Have you been able to contain it?
                <select className={inputClass} value={form.contained} onChange={set('contained')}>
                  <option value="">Choose one…</option>
                  <option>Yes — it’s safe with me</option>
                  <option>No — it’s still loose</option>
                  <option>It comes and goes from my yard</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              What does it look like?
              <input className={inputClass} value={form.description} onChange={set('description')} placeholder="Color, size, lop ears, collar…" />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Anything else?
              <textarea className={inputClass} rows={3} value={form.notes} onChange={set('notes')} />
            </label>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-base font-bold text-ink">How OHRR reaches you</p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Your name
              <input className={inputClass} required value={form.name} onChange={set('name')} autoComplete="name" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Phone
                <input className={inputClass} required type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Email <span className="font-normal text-slate-600">(optional)</span>
                <input className={inputClass} type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              </label>
            </div>

            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            <button type="submit" disabled={status === 'submitting' || photoBusy} className={`${btn.orange} disabled:opacity-60`}>
              {status === 'submitting' ? 'Sending…' : photoBusy ? 'Waiting for the photo…' : 'Send this report'}
            </button>
            <p className="text-sm text-slate-600">OHRR uses this to find and help the rabbit. Nothing here is published.</p>
          </Card>
        </form>
      </Section>
    </>
  )
}
