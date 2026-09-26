// /emails/:token — the link at the bottom of every OHRR email (update 31).
// No account: the link is the key, like a booking's cancel link. It shows the
// address half hidden and lets the person change what they get, or stop every
// email — with an undo, because a stray tap shouldn't cost OHRR a supporter.
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHero, Section, Card, btn } from '../components/ui'
import { Icon } from '../components/icons'
import InterestPicker from '../components/InterestPicker'
import { Spinner } from '../lib/staff'
import { MAILING_LIST } from '../lib/constants'
import { emailChoicesByToken, interestLabel, setEmailChoicesByToken, type EmailChoices as Choices, type Interest } from '../lib/emailList'

const same = (a: Interest[], b: Interest[]) => a.length === b.length && a.every((x) => b.includes(x))

export default function EmailChoices() {
  const { token = '' } = useParams()
  // undefined while loading; null when the link isn't one OHRR knows.
  const [choices, setChoices] = useState<Choices | null | undefined>(undefined)
  const [picked, setPicked] = useState<Interest[]>([])
  // Set when they stopped on this visit: what they had, for the undo.
  const [before, setBefore] = useState<Interest[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const c = await emailChoicesByToken(token)
      setChoices(c)
      if (c) setPicked(c.interests)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your choices right now.')
      setChoices(null)
    }
  }, [token])
  useEffect(() => {
    void load()
  }, [load])

  const save = async (interests: Interest[], subscribed: boolean) => {
    if (!choices) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await setEmailChoicesByToken(token, interests, subscribed)
      if (!subscribed) setBefore(choices.interests)
      else setBefore(null)
      setChoices({ ...choices, interests: subscribed ? interests : choices.interests, subscribed })
      setPicked(subscribed ? interests : choices.interests)
      setSaved(subscribed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that right now.')
    } finally {
      setBusy(false)
    }
  }

  let body
  if (choices === undefined) body = <Spinner />
  else if (loadError)
    body = (
      <Card className="space-y-3 text-center">
        <p className="text-base text-slate-700">We couldn’t load your email choices just now. Please try again in a minute.</p>
        <button type="button" onClick={() => void load()} className={`${btn.blue} mx-auto`}>
          Try again
        </button>
      </Card>
    )
  else if (choices === null)
    body = (
      <Card className="space-y-3 text-center">
        <p className="font-display text-xl font-black text-ink">That link isn’t valid any more.</p>
        <p className="text-base text-slate-700">You can sign up again and pick what you’d like to hear about.</p>
        <Link to={MAILING_LIST} className={`${btn.blue} mx-auto`}>
          Get emails from OHRR
        </Link>
      </Card>
    )
  else if (!choices.subscribed) {
    // Their ticks are kept, so starting again gives them back what they had.
    const again = choices.interests.length ? choices.interests : (['newsletter'] as Interest[])
    body = (
      <Card className="space-y-3 text-center">
        <p className="font-display text-xl font-black text-ink">You won’t get any more emails from OHRR.</p>
        <p className="text-base text-slate-700">
          {before
            ? `Tapped that by mistake? Undo, and ${choices.email} will get emails about ${again.map(interestLabel).join(', ')} again.`
            : `Changed your mind? ${choices.email} can get emails about ${again.map(interestLabel).join(', ')} again, and you can change that after.`}
        </p>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" disabled={busy} onClick={() => void save(again, true)} className={`${btn.blue} mx-auto disabled:opacity-60`}>
          {busy ? 'Saving…' : before ? 'Undo' : 'Start my emails again'}
        </button>
      </Card>
    )
  } else
    body = (
      <Card className="space-y-4">
        <p className="text-base text-slate-700">
          Emails to <strong className="text-ink">{choices.email}</strong>
        </p>
        <InterestPicker value={picked} onChange={(v) => { setPicked(v); setSaved(false) }} disabled={busy} />
        {picked.length === 0 && <p className="text-sm font-semibold text-slate-700">Nothing ticked. To stop every email, use “Stop all emails from OHRR”.</p>}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        {saved && (
          <p className="flex items-center gap-2 text-sm font-bold text-green-700">
            <Icon name="check" size={18} /> Saved. You’ll get emails about: {choices.interests.map(interestLabel).join(', ')}.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || picked.length === 0 || same(picked, choices.interests)}
            onClick={() => void save(picked, true)}
            className={`${btn.orange} disabled:opacity-60`}
          >
            {busy ? 'Saving…' : 'Save my choices'}
          </button>
          <button type="button" disabled={busy} onClick={() => void save(choices.interests, false)} className={`${btn.outline} disabled:opacity-60`}>
            Stop all emails from OHRR
          </button>
        </div>
      </Card>
    )

  return (
    <>
      <PageHero title="Your email choices" subtitle="Change what OHRR emails you about, or stop." />
      <Section className="max-w-2xl">{body}</Section>
    </>
  )
}
