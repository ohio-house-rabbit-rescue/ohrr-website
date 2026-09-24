// The OHRR Legacy Fund — a gift in a will, trust or IRA, or $1,000 or more in a
// year, and the Rescue Rabbit Guardians who have given one. OHRR (2026-09-24):
// honor these people and promote it as an option; follow the live site's details
// for now. So the words are the live page's (staff edit them as the
// 'legacy-fund' page under Care guides & pages), the contact is the one it names,
// its "Request more info" form now reaches the staff Inbox, and the Guardians —
// a picture on the live site — are a list staff keep (lib/guardians.ts).
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Section, H2, Card, ArticleBody, btn } from '../components/ui'
import { Icon } from '../components/icons'
import { inputClass } from '../components/SchemaForm'
import { useCareArticles } from '../lib/data'
import { useGuardians } from '../lib/guardians'
import { submitRequest } from '../lib/requests'
import { DONATE } from '../lib/constants'
import { LEGACY_BODY, LEGACY_CONTACT } from '../data/legacyFund'

export default function LegacyFund() {
  const { articles } = useCareArticles()
  const page = articles?.find((a) => a.slug === 'legacy-fund')
  const body = page?.body || LEGACY_BODY
  const years = useGuardians()
  const latest = years?.[0]

  return (
    <>
      <PageHero
        title="OHRR Legacy Fund"
        subtitle="Giving bunnies a bright tomorrow. Remember the rabbits in your will, trust or IRA, or with a larger gift today, and become a Rescue Rabbit Guardian."
        parent={{ to: '/give', label: 'Ways to give' }}
        doors={[
          { href: '#ways', icon: 'gift', h: 'Ways to give to the fund', p: 'A will, trust or IRA, or a gift today' },
          { href: '#guardians', icon: 'heart', h: 'Rescue Rabbit Guardians', p: latest ? `Thank you to our ${latest.year} Guardians` : 'Thank you to our Guardians' },
          { href: '#ask', icon: 'mail', h: 'Ask about the Legacy Fund', p: 'Or tell us you’ve included OHRR' },
        ]}
      />

      <Section id="ways" className="scroll-mt-20">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <ArticleBody body={body} />
          </div>
          <aside className="space-y-4">
            <img
              src="/img/news/ohrr-legacy-fund.webp"
              alt="OHRR Legacy Fund — giving bunnies a bright tomorrow. Guardians receive recognition on the OHRR website and at the Adoption Center."
              width={1024}
              height={603}
              className="w-full rounded-2xl border border-black/5 bg-white shadow-sm"
              loading="lazy"
            />
            <Card>
              <p className="font-display text-base font-extrabold text-brand-blue">Already included OHRR?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Or want to talk about a gift? Contact {LEGACY_CONTACT.name} at{' '}
                <a href={`mailto:${LEGACY_CONTACT.email}`} className="font-semibold text-brand-blue underline underline-offset-2">
                  {LEGACY_CONTACT.email}
                </a>
                , or use the form below.
              </p>
              <a href="#ask" className="mt-2 inline-block text-sm font-bold text-brand-orange">
                Ask about the Legacy Fund →
              </a>
            </Card>
          </aside>
        </div>
      </Section>

      <div id="guardians" className="scroll-mt-20 border-y border-brand-blue/10 bg-brand-blue-50">
        <Section>
          <H2>{latest ? `${latest.year} Rescue Rabbit Guardians` : 'Rescue Rabbit Guardians'}</H2>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
            Thank you to our Rescue Rabbit Guardians for your donations and future gifts. You are helping us give the bunnies
            of Ohio House Rabbit Rescue a bright today and tomorrow. We are so grateful to have your support.
          </p>
          {years === null ? (
            <p className="mt-6 text-sm text-slate-500">Loading…</p>
          ) : (
            latest && <NameColumns names={latest.names.map((g) => g.display_name)} />
          )}
          {years && years.length > 1 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-bold text-brand-blue">Earlier years</summary>
              {years.slice(1).map((y) => (
                <div key={y.year} className="mt-4">
                  <p className="font-display text-lg font-extrabold text-ink">{y.year}</p>
                  <NameColumns names={y.names.map((g) => g.display_name)} small />
                </div>
              ))}
            </details>
          )}
          <p className="mt-8 max-w-3xl text-base leading-relaxed text-slate-700">
            You can become a Rescue Rabbit Guardian too, through future gifts or donations you make today.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href="#ask" className={btn.blue}>
              Ask about the Legacy Fund
            </a>
            <a href={DONATE} target="_blank" rel="noopener" className={btn.outline}>
              Donate today
            </a>
          </div>
        </Section>
      </div>

      <Section id="ask" className="scroll-mt-20">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <H2>Request more info</H2>
            <p className="mt-2 text-base leading-relaxed text-slate-700">
              About the OHRR Legacy Fund, a planned gift or becoming a Rescue Rabbit Guardian. Only OHRR’s team sees this.
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Rather email?{' '}
              <a href={`mailto:${LEGACY_CONTACT.email}`} className="font-semibold text-brand-blue underline underline-offset-2">
                {LEGACY_CONTACT.email}
              </a>
            </p>
            <Link to="/give" className="mt-4 inline-block text-sm font-bold text-brand-orange">
              ← All ways to give
            </Link>
          </div>
          <div className="md:col-span-2">
            <AskForm />
          </div>
        </div>
      </Section>
    </>
  )
}

function NameColumns({ names, small = false }: { names: string[]; small?: boolean }) {
  return (
    <ul className={`mt-6 columns-2 gap-6 md:columns-3 md:gap-8 lg:columns-4 ${small ? 'text-sm' : 'text-base'}`}>
      {names.map((n) => (
        <li key={n} className="break-inside-avoid py-1 font-semibold text-slate-800">
          {n}
        </li>
      ))}
    </ul>
  )
}

function AskForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', 'bot-field': '' })
  const [included, setIncluded] = useState(false)
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      await submitRequest('legacy-info', {
        ...form,
        included: included ? 'Yes — has already included OHRR in their plans' : '',
      })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that right now.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <Card className="border-green-200 bg-green-50">
        <p className="flex items-center gap-2 font-display text-xl font-extrabold text-ink">
          <Icon name="check" size={22} className="text-green-700" /> Thank you
        </p>
        <p className="mt-1 text-base leading-relaxed text-slate-700">
          Your message is with OHRR and someone will be in touch. We look forward to thanking you.
        </p>
      </Card>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Your question or message (optional)
          <textarea className={inputClass} rows={4} value={form.message} onChange={set('message')} />
        </label>
        <label className="flex items-start gap-2.5 text-sm font-semibold text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-blue"
            checked={included}
            onChange={(e) => setIncluded(e.target.checked)}
          />
          I’ve already included OHRR in my will, trust or beneficiary plans
        </label>
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form['bot-field']} onChange={set('bot-field')} />
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={status === 'busy'} className={`${btn.orange} mt-4 disabled:opacity-60`}>
        {status === 'busy' ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}
