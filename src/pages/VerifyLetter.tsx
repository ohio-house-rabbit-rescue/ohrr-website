// /verify/:code — where a school, a commander or an employer checks a
// volunteer's hours letter. Volunteers make their own letters (signed with the
// director's name) from their private page; each is recorded with the hours
// the database counted, under the code printed at the foot. This page shows
// what was issued, so a changed PDF doesn't match.
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHero, Section, Card, btn } from '../components/ui'
import { Icon } from '../components/icons'
import { inputClass } from '../components/SchemaForm'
import { OHRR } from '../lib/constants'
import { errMessage } from '../lib/supabase'
import { longDate } from '../lib/volunteers/letters'
import { fmtHours } from '../lib/volunteers/calls'
import { LETTER_KINDS } from '../lib/volunteers/letters'
import { verifyLetter, type VerifiedLetter } from '../lib/volunteers/approval'

export default function VerifyLetter() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const [typed, setTyped] = useState(code)
  const [result, setResult] = useState<VerifiedLetter | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTyped(code)
    if (!code) {
      setResult(undefined)
      return
    }
    let alive = true
    setResult(undefined)
    setError(null)
    verifyLetter(code)
      .then((r) => alive && setResult(r))
      .catch((e) => alive && setError(errMessage(e)))
    return () => {
      alive = false
    }
  }, [code])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const c = typed.trim().toUpperCase()
    if (c) nav(`/verify/${encodeURIComponent(c)}`)
  }

  const kind = result ? (LETTER_KINDS.find((k) => k.value === result.kind)?.label ?? 'Hours letter') : ''

  return (
    <>
      <PageHero
        title="Check a volunteer letter"
        subtitle="Volunteers’ hours letters from Ohio House Rabbit Rescue carry a code at the foot of the page. Enter it to see what OHRR issued."
      />
      <Section className="max-w-2xl !pt-6 md:!pt-8">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[14rem] flex-1 text-sm font-semibold text-slate-700">
            The code on the letter
            <input
              className={`${inputClass} font-mono uppercase tracking-widest`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="K7Q2-M9XP"
              autoComplete="off"
              required
            />
          </label>
          <button type="submit" className={btn.blue}>
            Check
          </button>
        </form>

        <div className="mt-6">
          {error ? (
            <p className="text-base font-semibold text-red-600">{error}</p>
          ) : code && result === undefined ? (
            <p className="text-base text-slate-600">Checking…</p>
          ) : result === null ? (
            <Card className="border-red-200 bg-red-50/60">
              <p className="font-display text-lg font-extrabold text-ink">No letter has that code</p>
              <p className="mt-1 text-base text-slate-700">
                Please check the code on the letter. If it still doesn’t match, email{' '}
                <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
                  {OHRR.email}
                </a>
                .
              </p>
            </Card>
          ) : result ? (
            <Card className="border-green-200 bg-green-50/60">
              <p className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                <Icon name="check" size={20} className="text-green-700" /> Issued by Ohio House Rabbit Rescue
              </p>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-base sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-bold text-slate-600">Volunteer</dt>
                  <dd className="font-semibold text-ink">{result.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-600">Letter</dt>
                  <dd className="text-ink">{kind}</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-600">Confirmed hours</dt>
                  <dd className="font-semibold text-ink">{fmtHours(result.totalHours)} hours</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-600">Covering</dt>
                  <dd className="text-ink">
                    {longDate(result.from)} – {longDate(result.to)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-600">Issued</dt>
                  <dd className="text-ink">{longDate(result.issuedOn)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-600">Code</dt>
                  <dd className="font-mono text-ink">{result.code}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-slate-600">
                If the letter you have shows different hours or dates, please email {OHRR.email}.
              </p>
            </Card>
          ) : null}
        </div>
      </Section>
    </>
  )
}
