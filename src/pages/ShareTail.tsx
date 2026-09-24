// /tails/share — send OHRR a Happy Tail (website mirror of the app's ShareTail).
// Lands in the staff Inbox as a 'happy-tail' request with the same field names
// the app sends, so "Publish as a Happy Tail" there works unchanged. The draft
// is kept in this browser until it is sent.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, Card, btn } from '../components/ui'
import { inputClass } from '../components/SchemaForm'
import PhotoField from '../components/PhotoField'
import FormDone from '../components/FormDone'
import { OHRR } from '../lib/constants'
import { submitRequest } from '../lib/requests'
import { useFormDraft, DRAFT_NOTE } from '../lib/formDraft'

export default function ShareTail() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [bot, setBot] = useState('')
  const [form, setForm, clearDraft, restored] = useFormDraft('happy-tail', {
    name: '',
    email: '',
    bunny: '',
    since: '',
    story: '',
    photoUrl: '',
  })

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      await submitRequest('happy-tail', { ...form, photo: form.photoUrl, 'bot-field': bot })
      clearDraft()
      setStatus('done')
      window.scrollTo({ top: 0 })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <>
        <PageHero title="Thank you!" />
        <Section className="max-w-2xl">
          <FormDone title={`We got ${form.bunny ? `${form.bunny}’s` : 'your'} story, ${form.name || 'friend'}.`} to="/tails" label="Back to Happy Tails">
            OHRR will review it (and reply about photos) before adding it to Happy Tails.
          </FormDone>
        </Section>
      </>
    )
  }

  return (
    <>
      <PageHero
        title="Share your Happy Tail"
        subtitle="Adopted a bunny from OHRR? Tell us how they’re doing and we’ll add your story to Happy Tails."
      />
      <Section className="max-w-2xl">
        <p className="mb-6 text-sm">
          <Link to="/tails" className="font-semibold text-brand-blue">
            ← Back to Happy Tails
          </Link>
        </p>
        <form name="happy-tail" onSubmit={onSubmit}>
          <Card className="space-y-4">
            <p className="hidden" aria-hidden="true">
              <label>
                Don’t fill this out: <input name="bot-field" tabIndex={-1} autoComplete="off" value={bot} onChange={(e) => setBot(e.target.value)} />
              </label>
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Your name
                <input className={inputClass} name="name" required value={form.name} onChange={set('name')} autoComplete="name" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input className={inputClass} type="email" name="email" required value={form.email} onChange={set('email')} autoComplete="email" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Your bunny’s name
                <input className={inputClass} name="bunny" required value={form.bunny} onChange={set('bunny')} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                When did you adopt?
                <input className={inputClass} name="since" placeholder="e.g. March 2025" value={form.since} onChange={set('since')} />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Your story
              <textarea
                className={inputClass}
                name="story"
                rows={5}
                required
                placeholder="How are they settling in? Favorite spot, funny habits, milestones…"
                value={form.story}
                onChange={set('story')}
              />
            </label>

            {restored && <p className="rounded-xl bg-brand-blue-50/70 px-3 py-2 text-sm font-semibold text-brand-blue">{DRAFT_NOTE}</p>}

            <PhotoField
              label="A photo of your bunny"
              hint="This is the picture OHRR would publish with your story."
              value={form.photoUrl}
              onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
              onBusyChange={setPhotoBusy}
            />

            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600">
              OHRR reads every story before it goes on the Happy Tails page.
            </p>

            {status === 'error' && (
              <p className="text-sm font-semibold text-red-600">
                Something went wrong — please try again, or email OHRR at{' '}
                <a href={OHRR.emailHref} className="underline">
                  {OHRR.email}
                </a>
                .
              </p>
            )}

            <button type="submit" disabled={status === 'submitting' || photoBusy} className={`${btn.orange} disabled:opacity-60`}>
              {status === 'submitting' ? 'Sending…' : photoBusy ? 'Waiting for the photo…' : 'Submit your story'}
            </button>
          </Card>
        </form>
      </Section>
    </>
  )
}
