// The website's in-house forms — all land in the staff Inbox:
//   /adopt/apply            OHRR's adoption application (verbatim questions)
//   /surrender/form?type=   Owner surrender / Good Samaritan intake
//   /mailing-list           "Get emails from OHRR" — the email list (update 31), not the Inbox
//   (the Contact page embeds ContactForm)
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHero, Section, Card, btn, ext } from '../components/ui'
import SchemaForm, { inputClass, type Values } from '../components/SchemaForm'
import InterestPicker from '../components/InterestPicker'
import { cleanInterests, joinMailingList, type Interest } from '../lib/emailList'
import { applicationSections, applicationAgreement } from '../data/adoptionApplication'
import { intakeConfig, type IntakeType } from '../data/surrenderForm'
import { fosterSections, fosterAgreement } from '../data/fosterForm'
import { OHRR, ADOPTION_POLICY_PDF } from '../lib/constants'
import { submitRequest } from '../lib/requests'

function Done({ title, children, to, label }: { title: string; children: ReactNode; to: string; label: string }) {
  return (
    <Section className="max-w-2xl">
      <Card className="space-y-3 text-center">
        <img src="/img/ohrr-mark.png" alt="" className="mx-auto h-14 w-14 object-contain" onError={(e) => ((e.currentTarget.style.display = 'none'))} />
        <p className="font-display text-xl font-black text-ink">{title}</p>
        <div className="text-sm leading-relaxed text-slate-600">{children}</div>
        <Link to={to} className={`${btn.blue} mx-auto`}>
          {label}
        </Link>
      </Card>
    </Section>
  )
}

export function AdoptApply() {
  const [params] = useSearchParams()
  const [done, setDone] = useState<Values | null>(null)
  if (done)
    return (
      <>
        <PageHero title="Application sent" />
        <Done title={`Thank you, ${(done.name as string) || 'friend'}!`} to="/adopt" label="Back to Adopt">
          You’ll hear from OHRR by email within 72 hours (if not, email {OHRR.email}). An adoption facilitator will talk it through with you and set up a two-hour appointment at the Adoption Center — usually 12:00 or 2:00 on a Saturday or Sunday.
        </Done>
      </>
    )
  return (
    <>
      <PageHero title="Adoption application" subtitle="The same questions OHRR has always asked — now answered here. It takes about fifteen minutes." />
      <Section className="max-w-3xl">
        <SchemaForm
          kind="adoption-application"
          sections={applicationSections}
          initial={params.get('rabbit') ? { rabbit: params.get('rabbit')! } : {}}
          agreement={{ statements: [applicationAgreement.certify, applicationAgreement.returnPolicy], footnote: applicationAgreement.reserves }}
          submitLabel="Send my application"
          onDone={(v) => {
            setDone(v)
            window.scrollTo({ top: 0 })
          }}
        >
          <p className="text-sm leading-relaxed text-slate-600">
            Please read the{' '}
            <a href={ADOPTION_POLICY_PDF} {...ext} className="font-semibold text-brand-blue">
              adoption policy
            </a>{' '}
            first. Fields marked * are required.
          </p>
        </SchemaForm>
      </Section>
    </>
  )
}

export function SurrenderIntake() {
  const [params] = useSearchParams()
  const type: IntakeType = params.get('type') === 'good-samaritan' ? 'good-samaritan' : 'owner'
  const cfg = intakeConfig(type)
  const [done, setDone] = useState<Values | null>(null)
  if (done)
    return (
      <>
        <PageHero title="Intake form received" />
        <Done title={`Thank you, ${(done.name as string) || 'friend'}.`} to="/surrender" label="Back to surrender info">
          OHRR will be in touch to confirm space and arrange a time. Remember to bring the rabbit’s supplies and the surrender donation on the day.
        </Done>
      </>
    )
  return (
    <>
      <PageHero title={cfg.title} subtitle="Please contact OHRR first to confirm there’s space. This form goes straight to OHRR — it doesn’t complete the surrender on its own." />
      <Section className="max-w-3xl">
        <p className="mb-6 text-sm">
          <Link to={`/surrender/form?type=${type === 'owner' ? 'good-samaritan' : 'owner'}`} className="font-semibold text-brand-blue">
            {type === 'owner' ? 'Rescued a rabbit that isn’t yours? Use the Good Samaritan form instead →' : 'Surrendering your own rabbit? Use the Owner surrender form instead →'}
          </Link>
        </p>
        <SchemaForm
          kind="surrender-intake"
          sections={cfg.sections}
          extra={{ type: cfg.title }}
          agreement={{
            statements: [...cfg.agreement, 'I have read and agree to the terms above, and I am releasing all rights and claims for this rabbit to Ohio House Rabbit Rescue, Inc.'],
          }}
          submitLabel="Submit intake form"
          onDone={(v) => {
            setDone(v)
            window.scrollTo({ top: 0 })
          }}
        />
      </Section>
    </>
  )
}

/**
 * /mailing-list — "Get emails from OHRR" (update 31): a standard email form, no
 * account. `?interests=volunteer` (or events, …) ticks what the person came for;
 * otherwise only "OHRR news" starts ticked. Before update 31 it lands in the
 * Inbox as it always did (lib/emailList).
 */
export function MailingList() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', 'bot-field': '' })
  const [interests, setInterests] = useState<Interest[]>(() => {
    const asked = cleanInterests(params.get('interests'))
    return asked.length ? asked : ['newsletter']
  })
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    // Nothing ticked would mean emails they didn't pick ("OHRR news"), so ask.
    if (interests.length === 0) {
      setError('Tick at least one thing you’d like to hear about.')
      return
    }
    setStatus('busy')
    setError(null)
    try {
      await joinMailingList({ ...form, interests })
      setStatus('done')
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you up right now.')
      setStatus('idle')
    }
  }
  return (
    <>
      <PageHero title="Get emails from OHRR" subtitle="Pick what you’d like to hear about. No account needed." />
      <Section className="max-w-2xl">
        {status === 'done' ? (
          <Done title="You’re on the list." to="/" label="Back home">
            Every email has a link to change what you get or stop.
          </Done>
        ) : (
          <form onSubmit={submit}>
            <Card className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                We keep things simple and only send the important stuff: updates, fundraisers, opportunities, Midwest BunFest information, and ways you can help rescue rabbits when it matters most.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Your name (optional)
                  <input className={inputClass} value={form.name} onChange={set('name')} autoComplete="name" maxLength={120} />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <input className={inputClass} type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                </label>
              </div>
              <InterestPicker value={interests} onChange={setInterests} disabled={status === 'busy'} />
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form['bot-field']} onChange={set('bot-field')} />
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              <button type="submit" disabled={status === 'busy'} className={`${btn.orange} disabled:opacity-60`}>
                {status === 'busy' ? 'Signing you up…' : 'Sign me up'}
              </button>
            </Card>
          </form>
        )}
      </Section>
    </>
  )
}

/** Embedded on the Contact page. */
export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      await submitRequest('contact', form)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that right now.')
      setStatus('idle')
    }
  }
  if (status === 'done')
    return (
      <Card>
        <p className="font-display text-lg font-extrabold text-ink">Message sent</p>
        <p className="mt-1 text-sm text-slate-600">Thanks, {form.name}. OHRR will get back to you at {form.email}.</p>
      </Card>
    )
  return (
    <form onSubmit={submit}>
      <Card className="space-y-4">
        <h3 className="font-display text-lg font-extrabold text-brand-blue">Send us a message</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Your name
            <input className={inputClass} required value={form.name} onChange={set('name')} autoComplete="name" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input className={inputClass} type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Phone (optional)
            <input className={inputClass} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            What is it about?
            <input className={inputClass} value={form.subject} onChange={set('subject')} placeholder="Adopting · volunteering · a found rabbit · …" />
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Message
          <textarea className={inputClass} rows={4} required value={form.message} onChange={set('message')} />
        </label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={status === 'busy'} className={`${btn.orange} disabled:opacity-60`}>
          {status === 'busy' ? 'Sending…' : 'Send message'}
        </button>
        <p className="text-xs text-slate-600">For anything urgent about a rabbit’s health, call a rabbit-savvy vet rather than waiting for a reply.</p>
      </Card>
    </form>
  )
}

/** /support/become-a-supporter — "Become a Supporter – It's free!" */
export function BecomeSupporter() {
  const [f, setF] = useState({ firstName: '', lastName: '', street: '', street2: '', city: '', state: 'OH', zip: '', email: '', phone: '' })
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      await submitRequest('supporter', { ...f, name: `${f.firstName} ${f.lastName}`.trim() })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that right now.')
      setStatus('idle')
    }
  }
  return (
    <>
      <PageHero title="Become a Supporter" subtitle="It’s free! Just fill out the form to become an OHRR Supporter. There is no cost and you will receive updates on our progress and how you can help." />
      <Section className="max-w-2xl">
        {status === 'done' ? (
          <Done title={`Welcome aboard, ${f.firstName}!`} to="/give" label="Back to Ways to give">
            OHRR will keep you posted on progress and ways to help.
          </Done>
        ) : (
          <form onSubmit={submit}>
            <Card className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  First name
                  <input className={inputClass} required value={f.firstName} onChange={set('firstName')} autoComplete="given-name" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Last name
                  <input className={inputClass} required value={f.lastName} onChange={set('lastName')} autoComplete="family-name" />
                </label>
                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                  Street address
                  <input className={inputClass} required value={f.street} onChange={set('street')} autoComplete="address-line1" />
                </label>
                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                  Apt, suite, bldg. (optional)
                  <input className={inputClass} value={f.street2} onChange={set('street2')} autoComplete="address-line2" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  City
                  <input className={inputClass} required value={f.city} onChange={set('city')} autoComplete="address-level2" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    State
                    <input className={inputClass} required value={f.state} onChange={set('state')} autoComplete="address-level1" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    ZIP
                    <input className={inputClass} required value={f.zip} onChange={set('zip')} autoComplete="postal-code" />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <input className={inputClass} type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Phone
                  <input className={inputClass} type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" />
                </label>
              </div>
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              <button type="submit" disabled={status === 'busy'} className={`${btn.orange} disabled:opacity-60`}>
                {status === 'busy' ? 'Sending…' : 'Join OHRR'}
              </button>
            </Card>
          </form>
        )}
      </Section>
    </>
  )
}

/** /volunteer/foster — foster interest (→ Inbox 'foster-application'). */
export function FosterInterest() {
  const [done, setDone] = useState<Values | null>(null)
  if (done)
    return (
      <>
        <PageHero title="Thank you!" />
        <Done title={`Thank you, ${(done.name as string) || 'friend'}!`} to="/volunteer" label="Back to Volunteer">
          OHRR will be in touch about fostering — what it supplies, what it expects, and which rabbit might suit your home.
        </Done>
      </>
    )
  return (
    <>
      <PageHero title="Foster a rabbit" subtitle="A few weeks with a rabbit in your home while they recover or wait for a family. Tell us a little about you and your space." />
      <Section className="max-w-3xl">
        <p className="mb-6 text-sm">
          <Link to="/info/foster-a-rabbit" className="font-semibold text-brand-blue">
            Not sure fostering is for you? Read what it involves →
          </Link>
        </p>
        <SchemaForm
          kind="foster-application"
          sections={fosterSections}
          agreement={{ statements: fosterAgreement }}
          submitLabel="Send"
          onDone={(v) => {
            setDone(v)
            window.scrollTo({ top: 0 })
          }}
        />
      </Section>
    </>
  )
}

/** /volunteer/interest?role=… — a 30-second "tell OHRR about you" (→ Inbox 'volunteer-signup'). */
export function VolunteerInterest() {
  const [params] = useSearchParams()
  const role = params.get('role') ?? 'General volunteer'
  // A specific posted shift, when the person came from one ("Sat 10am socialization").
  const item = params.get('item') ?? ''
  const [form, setForm] = useState({ name: '', email: '', phone: '', availability: '', notes: '' })
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      await submitRequest('volunteer-signup', item ? { ...form, role, item } : { ...form, role })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that right now.')
      setStatus('idle')
    }
  }
  return (
    <>
      <PageHero
        title={role}
        parent={{ to: '/volunteer', label: 'Volunteer' }}
        subtitle={item ? `Signing up for: ${item}. Tell OHRR a little about you and someone will follow up.` : 'Tell OHRR a little about you and how you’d like to help. Someone will follow up.'}
      />
      <Section className="max-w-2xl">
        {status === 'done' ? (
          <Done title={`Thanks, ${form.name}!`} to="/volunteer" label="Back to Volunteer">
            OHRR will be in touch to get you started.
          </Done>
        ) : (
          <form onSubmit={submit}>
            <Card className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Your name
                  <input className={inputClass} required value={form.name} onChange={set('name')} autoComplete="name" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <input className={inputClass} type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Phone (optional)
                  <input className={inputClass} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  When are you usually free?
                  <input className={inputClass} value={form.availability} onChange={set('availability')} placeholder="Weekday evenings · weekends" />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Anything OHRR should know? {role.startsWith('Social') ? '(which platforms you use, any video or photo experience)' : ''}
                <textarea className={inputClass} rows={3} value={form.notes} onChange={set('notes')} />
              </label>
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              <button type="submit" disabled={status === 'busy'} className={`${btn.orange} disabled:opacity-60`}>
                {status === 'busy' ? 'Sending…' : 'Send'}
              </button>
            </Card>
          </form>
        )}
      </Section>
    </>
  )
}
