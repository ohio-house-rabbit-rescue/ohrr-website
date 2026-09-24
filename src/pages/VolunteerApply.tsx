// /volunteer/apply — the application every new volunteer fills in first
// (2026-09-24, OHRR: "we want to vet the new people that volunteer. so we need
// a signup and approval process"). It goes onto the volunteer roster as
// "waiting for approval" and into the staff Inbox; staff approve people for
// everything or for certain kinds, and an approved volunteer then signs up for
// shifts with the same email. /volunteer/interest (the old "I'm interested"
// links, with ?role= and ?item=) lands here too.
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHero, Section, Card, btn } from '../components/ui'
import { Icon } from '../components/icons'
import { inputClass } from '../components/SchemaForm'
import { OHRR } from '../lib/constants'
import { errMessage } from '../lib/supabase'
import { APPROVAL_KINDS, applyToVolunteer, kindLabel, rememberVolunteerEmail } from '../lib/volunteers/approval'
import { submitRequest } from '../lib/requests'

const HOURS_FOR = [
  { value: '', label: 'No — just to help' },
  { value: 'school', label: 'School or college' },
  { value: 'military', label: 'Military volunteer service' },
  { value: 'workplace', label: 'A workplace programme' },
  { value: 'community', label: 'Community service' },
  { value: 'other', label: 'Something else' },
]

// Old "I'm interested in …" links name a role; match it to a kind where one fits.
function kindFromRole(role: string): string | null {
  const r = role.toLowerCase()
  if (r.includes('social') && !r.includes('media')) return 'socialization'
  if (r.includes('buncare')) return 'buncare'
  if (r.includes('event') || r.includes('bunfest') || r.includes('fundrais')) return 'events'
  if (r.includes('vet')) return 'vet-transport'
  if (r.includes('hop shop') || r.includes('shop')) return 'hop-shop'
  return null
}

export default function VolunteerApply() {
  const [params] = useSearchParams()
  const role = params.get('role') ?? ''
  const item = params.get('item') ?? ''
  const startKind = params.get('kind') ?? kindFromRole(role)
  const [kinds, setKinds] = useState<string[]>(startKind && APPROVAL_KINDS.some((k) => k.value === startKind) ? [startKind] : [])
  const [f, setF] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    guardianName: '',
    guardianEmail: '',
    availability: '',
    experience: '',
    other: role && !kindFromRole(role) ? role : '',
    notes: item ? `Signing up for: ${item}` : '',
    hoursFor: '',
    heard: '',
    'bot-field': '',
  })
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const toggle = (k: string) => setKinds((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))
  const under18 = f.age === 'under-18'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f['bot-field']) {
      setDone(true)
      return
    }
    if (kinds.length === 0 && !f.other.trim()) {
      setError('Pick at least one way you’d like to help.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const answers: Record<string, string> = {}
      const put = (k: string, v: string) => {
        if (v.trim()) answers[k] = v.trim()
      }
      put('age', f.age === 'under-18' ? 'Under 18' : f.age === '18-plus' ? '18 or older' : '')
      if (under18) {
        put('guardian_name', f.guardianName)
        put('guardian_email', f.guardianEmail)
      }
      put('availability', f.availability)
      put('experience', f.experience)
      put('other', f.other)
      put('notes', f.notes)
      put('heard', f.heard)
      try {
        await applyToVolunteer({
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
          kinds,
          answers,
          hoursFor: f.hoursFor,
          source: 'website',
        })
      } catch (err) {
        // Before update 25 there is no roster step: the Inbox still gets it.
        if (!/apply_to_volunteer|schema cache|function/i.test(errMessage(err))) throw err
        await submitRequest('volunteer-signup', {
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
          role: kinds.map(kindLabel).join(', ') || f.other,
          ...answers,
        })
      }
      rememberVolunteerEmail(f.email)
      setDone(true)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(errMessage(err))
    }
    setBusy(false)
  }

  if (done) {
    return (
      <>
        <PageHero title="Thank you for applying" parent={{ to: '/volunteer', label: 'Volunteer' }} />
        <Section className="max-w-2xl">
          <Card className="space-y-3">
            <p className="flex items-center gap-2 font-display text-xl font-black text-ink">
              <Icon name="check" size={22} className="text-green-700" /> Your application is with OHRR
            </p>
            <p className="text-base leading-relaxed text-slate-700">
              OHRR looks at every application. You’ll get an email once you’re approved, with a link to your own
              volunteer page — what you’re signed up for, your hours, and a signed hours letter whenever you need one.
            </p>
            <p className="text-base leading-relaxed text-slate-700">
              Once you’re approved, sign up for a shift on the Volunteer page with the same email.
            </p>
            <Link to="/volunteer" className={btn.outline}>
              Back to Volunteer
            </Link>
          </Card>
        </Section>
      </>
    )
  }

  const label = 'block text-sm font-semibold text-slate-700'
  return (
    <>
      <PageHero
        title="Apply to volunteer"
        parent={{ to: '/volunteer', label: 'Volunteer' }}
        subtitle="Tell OHRR a little about you. Someone reads every application; once you’re approved you can sign up for shifts yourself."
      />
      <Section className="max-w-3xl !pt-6 md:!pt-8">
        <form onSubmit={submit} className="space-y-5">
          <Card className="space-y-4">
            <h2 className="font-display text-lg font-extrabold text-ink">About you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>
                Your name
                <input className={inputClass} required value={f.name} onChange={set('name')} autoComplete="name" />
              </label>
              <label className={label}>
                Email
                <input className={inputClass} type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
              </label>
              <label className={label}>
                Phone (optional)
                <input className={inputClass} type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" />
              </label>
              <label className={label}>
                Age
                <select className={inputClass} required value={f.age} onChange={set('age')}>
                  <option value="">Choose…</option>
                  <option value="18-plus">18 or older</option>
                  <option value="under-18">Under 18</option>
                </select>
              </label>
            </div>
            {under18 && (
              <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <p className="text-sm text-slate-700 sm:col-span-2">
                  Volunteers under 18 apply with a parent or guardian. Children 10 and under volunteer with an adult.
                </p>
                <label className={label}>
                  Parent or guardian’s name
                  <input className={inputClass} required value={f.guardianName} onChange={set('guardianName')} />
                </label>
                <label className={label}>
                  Their email
                  <input className={inputClass} type="email" required value={f.guardianEmail} onChange={set('guardianEmail')} />
                </label>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-lg font-extrabold text-ink">How you’d like to help</h2>
            <div role="group" aria-label="How you’d like to help" className="grid gap-2 sm:grid-cols-2">
              {APPROVAL_KINDS.map((k) => {
                const on = kinds.includes(k.value)
                return (
                  <button
                    key={k.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(k.value)}
                    className={`flex min-h-11 items-start gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left transition ${
                      on ? 'border-brand-blue bg-brand-blue-50' : 'border-slate-200 bg-white hover:border-brand-blue/60'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                        on ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300'
                      }`}
                      aria-hidden="true"
                    >
                      {on && <Icon name="check" size={14} />}
                    </span>
                    <span>
                      <span className="block text-base font-bold text-ink">{k.label}</span>
                      <span className="block text-sm text-slate-600">{k.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <label className={label}>
              Something else? (photography, social media, admin …)
              <input className={inputClass} value={f.other} onChange={set('other')} />
            </label>
            <label className={label}>
              When are you usually free?
              <input className={inputClass} value={f.availability} onChange={set('availability')} placeholder="Weekday evenings · weekends" />
            </label>
            <label className={label}>
              Have you spent time with rabbits before?
              <textarea className={inputClass} rows={2} value={f.experience} onChange={set('experience')} placeholder="Had rabbits growing up · none yet, keen to learn" />
            </label>
            <label className={label}>
              Do you need your hours recorded for something?
              <select className={inputClass} value={f.hoursFor} onChange={set('hoursFor')}>
                {HOURS_FOR.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
          </Card>

          <Card className="space-y-4">
            <label className={label}>
              Anything else OHRR should know? (optional)
              <textarea className={inputClass} rows={3} value={f.notes} onChange={set('notes')} />
            </label>
            <label className={label}>
              How did you hear about OHRR? (optional)
              <input className={inputClass} value={f.heard} onChange={set('heard')} />
            </label>
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f['bot-field']} onChange={set('bot-field')} />
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3 text-base text-slate-700">
              <input
                type="checkbox"
                required
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-blue"
              />
              <span>I understand OHRR reviews every application and will email me.</span>
            </label>
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
              {busy ? 'Sending…' : 'Send my application'}
            </button>
            <p className="text-sm text-slate-600">
              Questions first? Email{' '}
              <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
                {OHRR.email}
              </a>
              .
            </p>
          </Card>
        </form>
      </Section>
    </>
  )
}
